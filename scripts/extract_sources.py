from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"}


def clean_text(text: str) -> str:
    text = text.replace("\x00", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_docx(path: Path) -> tuple[str, dict]:
    with zipfile.ZipFile(path) as archive:
        xml = archive.read("word/document.xml")
    root = ElementTree.fromstring(xml)
    paragraphs: list[str] = []
    for paragraph in root.iter():
        if paragraph.tag.endswith("}p"):
            parts = [node.text or "" for node in paragraph.iter() if node.tag.endswith("}t")]
            if parts:
                paragraphs.append("".join(parts))
    text = clean_text("\n".join(paragraphs))
    return text, {"method": "docx_xml", "units": len(paragraphs)}


def slide_number(name: str) -> int:
    match = re.search(r"slide(\d+)\.xml$", name)
    return int(match.group(1)) if match else 999999


def extract_pptx(path: Path) -> tuple[str, dict]:
    blocks: list[str] = []
    with zipfile.ZipFile(path) as archive:
        slides = sorted((name for name in archive.namelist() if re.search(r"ppt/slides/slide\d+\.xml$", name)), key=slide_number)
        for index, name in enumerate(slides, 1):
            root = ElementTree.fromstring(archive.read(name))
            parts = [node.text or "" for node in root.iter() if node.tag.endswith("}t")]
            blocks.append(f"===== SLIDE {index} =====\n" + "\n".join(part for part in parts if part.strip()))
    text = clean_text("\n\n".join(blocks))
    return text, {"method": "pptx_xml", "units": len(blocks)}


def extract_pdf_text(path: Path) -> tuple[str, dict]:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise RuntimeError("pypdf is unavailable") from exc
    reader = PdfReader(str(path))
    blocks: list[str] = []
    page_lengths: list[int] = []
    for index, page in enumerate(reader.pages, 1):
        value = clean_text(page.extract_text() or "")
        page_lengths.append(len(re.sub(r"\s+", "", value)))
        blocks.append(f"===== PAGE {index} =====\n{value}")
    return clean_text("\n\n".join(blocks)), {"method": "pdf_text", "units": len(blocks), "pageCharacters": page_lengths}


def ocr_lines(image: Path, engine) -> tuple[list[str], list[float]]:
    result, _ = engine(str(image))
    items = result or []
    items.sort(key=lambda item: (min(point[1] for point in item[0]), min(point[0] for point in item[0])))
    lines = [clean_text(str(item[1])) for item in items if clean_text(str(item[1]))]
    confidence = [float(item[2]) for item in items if len(item) > 2 and isinstance(item[2], (int, float))]
    return lines, confidence


def rapidocr_engine():
    try:
        from rapidocr_onnxruntime import RapidOCR
    except ImportError:
        return None
    return RapidOCR()


def ocr_image(path: Path, engine) -> tuple[str, dict]:
    lines, scores = ocr_lines(path, engine)
    return clean_text("\n".join(lines)), {"method": "ocr_image", "units": 1, "confidence": sum(scores) / len(scores) if scores else None}


def ocr_pdf(path: Path, engine, pdftoppm: str) -> tuple[str, dict]:
    with tempfile.TemporaryDirectory(prefix="study-sprint-ocr-") as temp:
        prefix = Path(temp) / "page"
        subprocess.run([pdftoppm, "-r", "140", "-png", str(path), str(prefix)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        images = sorted(Path(temp).glob("page-*.png"), key=lambda item: int(re.search(r"(\d+)$", item.stem).group(1)))
        blocks: list[str] = []
        all_scores: list[float] = []
        for index, image in enumerate(images, 1):
            lines, scores = ocr_lines(image, engine)
            all_scores.extend(scores)
            blocks.append(f"===== PAGE {index} =====\n" + "\n".join(lines))
    return clean_text("\n\n".join(blocks)), {"method": "ocr_pdf", "units": len(blocks), "confidence": sum(all_scores) / len(all_scores) if all_scores else None}


def safe_output_name(item: dict) -> str:
    stem = re.sub(r"[^0-9A-Za-z\u4e00-\u9fff._-]+", "_", Path(item["name"]).stem).strip("._") or item["id"]
    return f"{item['id']}-{stem}.txt"


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract text from an inventoried study-material folder.")
    parser.add_argument("source")
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--pdftoppm", help="Path to pdftoppm for OCR fallback")
    parser.add_argument("--force-ocr", action="store_true")
    parser.add_argument("--min-chars-per-page", type=int, default=45)
    args = parser.parse_args()

    source = Path(args.source).expanduser().resolve()
    manifest_path = Path(args.manifest).expanduser().resolve()
    output_dir = Path(args.out_dir).expanduser().resolve()
    report_path = Path(args.report).expanduser().resolve()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if Path(manifest["sourceRoot"]).resolve() != source:
        raise SystemExit("Manifest sourceRoot does not match the requested source folder")
    output_dir.mkdir(parents=True, exist_ok=True)

    engine = rapidocr_engine()
    pdftoppm = args.pdftoppm or shutil.which("pdftoppm")
    results: list[dict] = []
    for item in manifest["files"]:
        if not item.get("supported"):
            continue
        path = (source / Path(item["relativePath"])).resolve()
        if source != path and source not in path.parents:
            raise SystemExit(f"Unsafe source path in manifest: {item['relativePath']}")
        record = {"id": item["id"], "source": item["relativePath"], "role": item["role"], "status": "ok", "issues": []}
        try:
            ext = path.suffix.casefold()
            if ext == ".pdf":
                text, details = extract_pdf_text(path)
                lengths = details.get("pageCharacters", [])
                insufficient = not lengths or sum(lengths) < args.min_chars_per_page * len(lengths)
                if args.force_ocr or insufficient:
                    if engine and pdftoppm:
                        text, details = ocr_pdf(path, engine, pdftoppm)
                    else:
                        record["issues"].append("ocr_required")
                        record["status"] = "review"
            elif ext == ".docx":
                text, details = extract_docx(path)
            elif ext == ".pptx":
                text, details = extract_pptx(path)
            elif ext in IMAGE_EXTENSIONS:
                if not engine:
                    text, details = "", {"method": "none", "units": 1}
                    record["issues"].append("ocr_required")
                    record["status"] = "review"
                else:
                    text, details = ocr_image(path, engine)
            else:
                continue
            target = output_dir / safe_output_name(item)
            target.write_text(text, encoding="utf-8")
            record.update(details)
            record["characters"] = len(re.sub(r"\s+", "", text))
            record["output"] = target.relative_to(report_path.parent).as_posix() if report_path.parent in target.parents else str(target)
            if record["characters"] == 0:
                record["status"] = "review"
                record["issues"].append("no_text_extracted")
        except Exception as exc:
            record["status"] = "error"
            record["issues"].append(f"{type(exc).__name__}: {exc}")
        results.append(record)

    report = {
        "schemaVersion": 1,
        "sourceRoot": str(source),
        "summary": {
            "files": len(results),
            "ok": sum(1 for item in results if item["status"] == "ok"),
            "review": sum(1 for item in results if item["status"] == "review"),
            "errors": sum(1 for item in results if item["status"] == "error"),
        },
        "files": results,
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report["summary"], ensure_ascii=False))
    print(f"Report: {report_path}")
    if report["summary"]["errors"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
