#!/usr/bin/env python3
from pathlib import Path

POSTS_DIR = Path(__file__).resolve().parent.parent / "posts"
OUTPUT = POSTS_DIR / "index.json"
EXCLUDED = {"template.html"}


def format_index(files: list[str]) -> str:
    if not files:
        return "[\n]\n"

    lines = ["["]
    for i, name in enumerate(files):
        comma = "," if i < len(files) - 1 else ""
        lines.append(f'  "{name}"{comma}')
    lines.append("]")
    return "\n".join(lines) + "\n"


def main() -> None:
    posts = sorted(
        file.name
        for file in POSTS_DIR.glob("*.html")
        if file.name.lower() not in EXCLUDED
    )

    OUTPUT.write_text(format_index(posts), encoding="utf-8", newline="\n")
    print(f"Generated {len(posts)} post(s) -> {OUTPUT}")


if __name__ == "__main__":
    main()