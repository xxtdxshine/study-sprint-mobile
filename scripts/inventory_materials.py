from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path


SUPPORTED = {".pdf", ".docx", ".pptx", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"}
LEGACY = {".doc", ".ppt"}
ANSWER_WORDS = ("答案", "解析", "答题", "answer", "solution", "key")
PAPER_WORDS = ("试卷", "习题", "题库", "模拟题", "练习题", "测试题", "真题", "exam", "test", "question", "quiz")
PART_WORDS = ("答案", "解析", "答题卡", "上册", "下册", "上", "中", "下", "第一部分", "第二部分", "第三部分")
CN_NUM = {"一": "1", "二": "2", "三": "3", "四": "4", "五": "5", "六": "6", "七": "7", "八": "8", "九": "9", "十": "10"}


def natural_key(value: str) -> list[object]:
    return [int(piece) if piece.isdigit() else piece.casefold() for piece in re.split(r"(\d+)", value)]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def role_for(path: Path) -> str:
    haystack = f"{path.parent.name} {path.stem}".casefold()
    if any(word in haystack for word in ANSWER_WORDS):
        return "answer"
    if any(word in haystack for word in PAPER_WORDS):
        return "paper"
    return "lecture"


def paper_number(value: str) -> str | None:
    compact = re.sub(r"\s+", "", value)
    patterns = (
        r"试卷[（(]?([一二三四五六七八九十\d]+)",
        r"第([一二三四五六七八九十\d]+)[套卷]",
        r"(?:paper|exam|test)[-_ ]*(\d+)",
    )
    for pattern in patterns:
        match = re.search(pattern, compact, flags=re.IGNORECASE)
        if match:
            token = match.group(1)
            return CN_NUM.get(token, token)
    return None


def canonical_name(value: str) -> str:
    text = value.casefold()
    for word in ANSWER_WORDS + PAPER_WORDS + PART_WORDS:
        text = text.replace(word, "")
    text = re.sub(r"[（()）\[\]【】《》<>·._\-—+\s]", "", text)
    return text


def pairing_score(paper: dict, answer: dict) -> float:
    paper_no = paper.get("paperNumber")
    answer_no = answer.get("paperNumber")
    number_score = 0.72 if paper_no and paper_no == answer_no else 0.0
    if paper_no and answer_no and paper_no != answer_no:
        return 0.0
    left = canonical_name(Path(paper["name"]).stem)
    right = canonical_name(Path(answer["name"]).stem)
    name_score = difflib.SequenceMatcher(None, left, right).ratio() if left and right else 0.0
    same_parent = 0.08 if Path(paper["relativePath"]).parent == Path(answer["relativePath"]).parent else 0.0
    return min(1.0, number_score + 0.28 * name_score + same_parent)


def main() -> None:
    parser = argparse.ArgumentParser(description="Inventory and classify study materials.")
    parser.add_argument("source", help="Folder containing lectures, papers, and answers")
    parser.add_argument("--out", required=True, help="Output manifest JSON")
    args = parser.parse_args()

    source = Path(args.source).expanduser().resolve()
    output = Path(args.out).expanduser().resolve()
    if not source.is_dir():
        raise SystemExit(f"Source folder not found: {source}")

    paths = sorted((path for path in source.rglob("*") if path.is_file()), key=lambda p: natural_key(p.relative_to(source).as_posix()))
    files: list[dict] = []
    hashes: dict[str, list[str]] = defaultdict(list)
    for index, path in enumerate(paths, 1):
        ext = path.suffix.casefold()
        supported = ext in SUPPORTED
        item = {
            "id": f"F{index:04d}",
            "relativePath": path.relative_to(source).as_posix(),
            "name": path.name,
            "extension": ext,
            "size": path.stat().st_size,
            "supported": supported,
            "role": role_for(path) if supported else "unsupported",
            "paperNumber": paper_number(f"{path.parent.name} {path.stem}"),
        }
        if supported or ext in LEGACY:
            item["sha256"] = sha256(path)
            hashes[item["sha256"]].append(item["relativePath"])
        files.append(item)

    papers = [item for item in files if item["role"] == "paper"]
    answers = [item for item in files if item["role"] == "answer"]
    grouped: dict[str, dict] = {}
    for paper in papers:
        group_key = paper["paperNumber"] or canonical_name(Path(paper["name"]).stem) or paper["id"]
        group = grouped.setdefault(group_key, {"key": group_key, "paperFiles": [], "answerFiles": [], "status": "unmatched"})
        group["paperFiles"].append(paper["relativePath"])

    issues: list[dict] = []
    for answer in answers:
        candidates: list[tuple[float, str]] = []
        for key, group in grouped.items():
            representative = next(item for item in papers if item["relativePath"] == group["paperFiles"][0])
            score = pairing_score(representative, answer)
            candidates.append((score, key))
        candidates.sort(reverse=True)
        if not candidates or candidates[0][0] < 0.55:
            issues.append({"kind": "unmatched_answer", "file": answer["relativePath"], "message": "未找到可信的试卷配对。"})
            continue
        best_score, best_key = candidates[0]
        if len(candidates) > 1 and abs(best_score - candidates[1][0]) < 0.04:
            issues.append({"kind": "ambiguous_answer_pairing", "file": answer["relativePath"], "candidates": [best_key, candidates[1][1]], "message": "两个试卷配对分数接近，需要人工确认。"})
            continue
        grouped[best_key]["answerFiles"].append(answer["relativePath"])

    for group in grouped.values():
        group["paperFiles"].sort(key=natural_key)
        group["answerFiles"].sort(key=natural_key)
        group["status"] = "paired" if group["answerFiles"] else "missing_answer"
        if not group["answerFiles"]:
            issues.append({"kind": "missing_answer", "paperFiles": group["paperFiles"], "message": "试卷没有匹配到答案文件。"})

    for item in files:
        if item["extension"] in LEGACY:
            issues.append({"kind": "legacy_format", "file": item["relativePath"], "message": "请转换为 DOCX 或 PPTX，并保留原文件。"})
        elif not item["supported"]:
            issues.append({"kind": "unsupported_format", "file": item["relativePath"], "message": "该格式不会进入提取流程。"})

    duplicates = [members for members in hashes.values() if len(members) > 1]
    for members in duplicates:
        issues.append({"kind": "duplicate_files", "files": members, "message": "这些文件内容完全相同。"})

    manifest = {
        "schemaVersion": 1,
        "sourceRoot": str(source),
        "summary": {
            "totalFiles": len(files),
            "supportedFiles": sum(1 for item in files if item["supported"]),
            "lectures": sum(1 for item in files if item["role"] == "lecture"),
            "paperFiles": len(papers),
            "answerFiles": len(answers),
            "paperGroups": len(grouped),
        },
        "files": files,
        "paperPairings": sorted(grouped.values(), key=lambda item: natural_key(str(item["key"]))),
        "issues": issues,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest["summary"], ensure_ascii=False))
    print(f"Manifest: {output}")


if __name__ == "__main__":
    main()
