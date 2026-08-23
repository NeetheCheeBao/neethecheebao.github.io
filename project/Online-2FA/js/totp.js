/* RFC 4226 / RFC 6238 TOTP + HOTP + Steam Guard. Web Crypto only. */
(function (global) {
  const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const STEAM = "23456789BCDFGHJKMNPQRTVWXY";

  function normalizeSecret(raw) {
    let s = String(raw || "").trim();
    s = s.replace(/^(secret\s*key|secret|密钥|秘钥|key)\s*[：:=]\s*/i, "");
    return s.replace(/[\s\-]/g, "");
  }

  function looksLikeOtpauth(raw) {
    return /^\s*otpauth:\/\//i.test(raw || "");
  }

  function isPlausibleBase32(raw) {
    const s = normalizeSecret(raw).toUpperCase().replace(/=+$/g, "");
    return s.length >= 8 && /^[A-Z2-7]+$/.test(s);
  }

  function base32Decode(input) {
    const cleaned = normalizeSecret(input).toUpperCase().replace(/=+$/g, "");
    if (!cleaned) throw new Error("empty-secret");
    if (!/^[A-Z2-7]+$/.test(cleaned)) throw new Error("invalid-base32");
    let bits = 0;
    let value = 0;
    const out = [];
    for (const ch of cleaned) {
      value = (value << 5) | BASE32.indexOf(ch);
      bits += 5;
      if (bits >= 8) {
        out.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    if (!out.length) throw new Error("empty-secret");
    return new Uint8Array(out);
  }

  function hexDecode(input) {
    const cleaned = normalizeSecret(input).toLowerCase();
    if (!cleaned || cleaned.length % 2 || !/^[0-9a-f]+$/.test(cleaned)) throw new Error("invalid-hex");
    const out = new Uint8Array(cleaned.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
    return out;
  }

  function decodeSecret(secret, encoding) {
    if (encoding === "hex") return hexDecode(secret);
    if (encoding === "ascii") return new TextEncoder().encode(String(secret).trim());
    return base32Decode(secret);
  }

  function counterToBytes(counter) {
    const buf = new Uint8Array(8);
    let c = BigInt(Math.floor(counter));
    if (c < 0n) c = 0n;
    for (let i = 7; i >= 0; i--) {
      buf[i] = Number(c & 0xffn);
      c >>= 8n;
    }
    return buf;
  }

  async function hmac(algorithm, key, data) {
    const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: algorithm }, false, ["sign"]);
    return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, data));
  }

  function dynamicTruncate(hash) {
    const offset = hash[hash.length - 1] & 0x0f;
    return (
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff)
    );
  }

  function steamFromBin(bin) {
    let value = bin;
    let out = "";
    for (let i = 0; i < 5; i++) {
      out += STEAM[value % STEAM.length];
      value = Math.floor(value / STEAM.length);
    }
    return out;
  }

  async function generateOtp(input) {
    const type = input.type || "totp";
    const algorithm = type === "steam" ? "SHA-1" : input.algorithm || "SHA-1";
    const digits = type === "steam" ? 5 : input.digits || 6;
    const period = input.period || 30;
    const encoding = input.encoding || "base32";
    const key = decodeSecret(input.secret, encoding);
    let counter;
    if (type === "hotp") counter = input.counter || 0;
    else {
      const now = (input.now != null ? input.now : Date.now()) + (input.offsetMs || 0);
      counter = Math.floor(now / 1000 / period);
    }
    const hash = await hmac(algorithm, key, counterToBytes(counter));
    const bin = dynamicTruncate(hash);
    if (type === "steam") return steamFromBin(bin);
    return String(bin % 10 ** digits).padStart(digits, "0");
  }

  function remainingSeconds(period, now, offsetMs) {
    const t = (now || Date.now()) + (offsetMs || 0);
    const window = (period || 30) * 1000;
    return Math.ceil((window - (t % window)) / 1000);
  }

  function remainingRatio(period, now, offsetMs) {
    const t = (now || Date.now()) + (offsetMs || 0);
    const window = (period || 30) * 1000;
    return (t % window) / window;
  }

  function groupCode(code) {
    if (!code) return "";
    if (code.length === 6) return code.slice(0, 3) + " " + code.slice(3);
    if (code.length === 8) return code.slice(0, 4) + " " + code.slice(4);
    if (code.length === 7) return code.slice(0, 3) + " " + code.slice(3);
    return code;
  }

  function parseAlg(raw) {
    const v = String(raw || "SHA1").toUpperCase().replace(/-/g, "");
    if (v === "SHA256") return "SHA-256";
    if (v === "SHA512") return "SHA-512";
    return "SHA-1";
  }

  function parseOtpauth(uri) {
    const url = new URL(uri.trim());
    if (url.protocol !== "otpauth:") throw new Error("invalid-uri");
    const host = url.host.toLowerCase();
    let type = "totp";
    if (host === "hotp") type = "hotp";
    else if (host === "steam") type = "steam";
    else if (host !== "totp") throw new Error("invalid-uri");
    const path = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    let issuer = url.searchParams.get("issuer") || "";
    let label = path;
    const colon = path.indexOf(":");
    if (colon >= 0) {
      const pathIssuer = path.slice(0, colon).trim();
      label = path.slice(colon + 1).trim();
      if (!issuer) issuer = pathIssuer;
    }
    const secret = normalizeSecret(url.searchParams.get("secret") || "");
    if (!secret) throw new Error("empty-secret");
    const digits = Number(url.searchParams.get("digits") || (type === "steam" ? 5 : 6));
    const period = Number(url.searchParams.get("period") || 30);
    const counter = Number(url.searchParams.get("counter") || 0);
    if (issuer.toLowerCase() === "steam" || /steam/i.test(label)) type = "steam";
    return {
      type,
      issuer,
      label: label || issuer || "Account",
      secret,
      encoding: "base32",
      algorithm: type === "steam" ? "SHA-1" : parseAlg(url.searchParams.get("algorithm")),
      digits: type === "steam" ? 5 : digits || 6,
      period: period > 0 ? period : 30,
      counter: Number.isFinite(counter) ? counter : 0,
    };
  }

  function toOtpauth(account) {
    const type = account.type === "steam" ? "totp" : account.type;
    const labelParts = account.issuer
      ? encodeURIComponent(account.issuer) + ":" + encodeURIComponent(account.label || account.issuer)
      : encodeURIComponent(account.label || "Account");
    const params = new URLSearchParams();
    params.set("secret", normalizeSecret(account.secret).toUpperCase());
    if (account.issuer) params.set("issuer", account.issuer);
    if (account.type === "steam") params.set("issuer", account.issuer || "Steam");
    else {
      const alg = String(account.algorithm || "SHA-1").replace("-", "");
      if (alg !== "SHA1") params.set("algorithm", alg);
      if (account.digits && account.digits !== 6) params.set("digits", String(account.digits));
      if (account.type === "totp" && account.period && account.period !== 30) params.set("period", String(account.period));
    }
    if (account.type === "hotp") params.set("counter", String(account.counter || 0));
    return "otpauth://" + type + "/" + labelParts + "?" + params.toString();
  }

  global.TOTP = {
    RFC_BASE32: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
    normalizeSecret,
    looksLikeOtpauth,
    isPlausibleBase32,
    generateOtp,
    remainingSeconds,
    remainingRatio,
    groupCode,
    parseOtpauth,
    toOtpauth,
  };
})(window);
