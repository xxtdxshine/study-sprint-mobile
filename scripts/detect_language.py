from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


MARKER = re.compile(r"^\s*=+\s*(?:PAGE|SLIDE)\s+\d+\s*=+\s*$", re.IGNORECASE | re.MULTILINE)
HAN = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff]")
LATIN = re.compile(r"[A-Za-z]")


def main() -> None:
    parser = argparse.ArgumentParser(description="Detect whether extracted study materials are Chinese, English, or mixed.")
    parser.add_argument("input_dir", help="Folder containing extracted UTF-8 text files")
    parser.add_argument("--out", required=True, help="Output language report JSON")
    parser.add_argument("--minimum-characters", type=int, default=200)
    parser.add_argument("--ui-language", choices=("zh-CN", "en"), help="User-selected interface language for mixed content or an explicit override")
    args = parser.parse_args()

    source = Path(args.input_dir).expanduser().resolve()
    output = Path(args.out).expanduser().resolve()
    if not source.is_dir():
        raise SystemExit(f"Extracted-text folder not found: {source}")

    rows: list[dict] = []
    total_han = 0
    total_latin = 0
    for path in sorted(source.rglob("*.txt"), key=lambda item: item.as_posix().casefold()):
        text = path.read_text(encoding="utf-8", errors="replace")
        text = MARKER.sub("", text)
        han = len(HAN.findall(text))
        latin = len(LATIN.findall(text))
        total_han += han
        total_latin += latin
        rows.append({"file": path.relative_to(source).as_posix(), "hanCharacters": han, "latinLetters": latin})

    meaningful = total_han + total_latin
    if meaningful < args.minimum_characters:
        detected = "unknown"
        suggested = None
    else:
        chinese_share = total_han / meaningful
        if chinese_share >= 0.80:
            detected = "zh-CN"
            suggested = "zh-CN"
        elif chinese_share <= 0.20:
            detected = "en"
            suggested = "en"
        else:
            detected = "mixed"
            suggested = None

    chosen_ui_language = args.ui_language or suggested
    requires_user_choice = detected in {"mixed", "unknown"} and chosen_ui_language is None
    report = {
        "schemaVersion": 1,
        "detectedLanguage": detected,
        "suggestedUiLanguage": suggested,
        "chosenUiLanguage": chosen_ui_language,
        "requiresUserChoice": requires_user_choice,
        "counts": {
            "files": len(rows),
            "hanCharacters": total_han,
            "latinLetters": total_latin,
            "meaningfulCharacters": meaningful,
            "chineseShare": round(total_han / meaningful, 4) if meaningful else None,
        },
        "files": rows,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"detectedLanguage": detected, "suggestedUiLanguage": suggested, "chosenUiLanguage": chosen_ui_language, "requiresUserChoice": requires_user_choice, **report["counts"]}, ensure_ascii=False))
    print(f"Report: {output}")


if __name__ == "__main__":
    main()
