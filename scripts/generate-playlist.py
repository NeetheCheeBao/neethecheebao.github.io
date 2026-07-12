#!/usr/bin/env python3
import json
from pathlib import Path
from urllib.parse import quote

AUDIO_DIR = Path(__file__).resolve().parent.parent / "assets" / "audio"
OUTPUT = AUDIO_DIR / "playlist.json"


def encode_path(filename: str) -> str:
    return "assets/audio/" + quote(filename)


def main() -> None:
    tracks = []
    for file in sorted(AUDIO_DIR.glob("*.mp3")):
        tracks.append({
            "title": file.stem.strip(),
            "src": encode_path(file.name),
        })

    OUTPUT.write_text(
        json.dumps(tracks, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"Generated {len(tracks)} track(s) -> {OUTPUT}")


if __name__ == "__main__":
    main()