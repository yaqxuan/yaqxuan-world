from pathlib import Path
import urllib.request

from fontTools import subset


ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT / ".cache" / "fonts"

SOURCES = {
    "serif": (
        "NotoSerifSC-VF.otf",
        "https://github.com/notofonts/noto-cjk/raw/main/Serif/Variable/OTF/Subset/NotoSerifSC-VF.otf",
        ROOT / "public" / "fonts" / "yaqxuan-serif-sc.woff2",
    ),
    "sans": (
        "NotoSansSC-VF.otf",
        "https://github.com/notofonts/noto-cjk/raw/main/Sans/Variable/OTF/Subset/NotoSansSC-VF.otf",
        ROOT / "public" / "fonts" / "yaqxuan-sans-sc.woff2",
    ),
}

SCAN_DIRS = [ROOT / "src", ROOT / "scripts"]
SCAN_FILES = [ROOT / "index.html", ROOT / "README.md"]
EXTRA_PUNCTUATION = "—–·…“”‘’《》〈〉「」『』【】（）〔〕、。，．：；？！～—→↔"


def ensure_source_font(filename: str, url: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    local_path = CACHE_DIR / filename
    if local_path.exists() and local_path.stat().st_size > 1_000_000:
        return local_path

    print(f"Downloading {filename} from {url}...")
    req = urllib.request.Request(url, headers={"User-Agent": "yaqxuan-font-subsetter/1.0"})
    with urllib.request.urlopen(req, timeout=120) as response, local_path.open("wb") as out:
        while True:
            chunk = response.read(65536)
            if not chunk:
                break
            out.write(chunk)
    print(f"Saved {local_path} ({local_path.stat().st_size} bytes)")
    return local_path


def collect_text() -> str:
    chunks: list[str] = [
        "".join(chr(code) for code in range(32, 127)),
        EXTRA_PUNCTUATION,
    ]
    for directory in SCAN_DIRS:
        if not directory.exists():
            continue
        for file_path in directory.rglob("*"):
            if file_path.is_file() and file_path.suffix in {".ts", ".tsx", ".mjs", ".js"}:
                chunks.append(file_path.read_text(encoding="utf-8"))

    for file_path in SCAN_FILES:
        if file_path.exists():
            chunks.append(file_path.read_text(encoding="utf-8"))

    unique_chars = sorted(set("".join(chunks)))
    print(f"Collected {len(unique_chars)} unique Unicode characters across project sources.")
    return "".join(unique_chars)


def build_subset(source: Path, target: Path, text: str) -> None:
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.notdef_glyph = True
    options.notdef_outline = True
    options.recommended_glyphs = True

    font = subset.load_font(str(source), options)
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    target.parent.mkdir(parents=True, exist_ok=True)
    subset.save_font(font, str(target), options)
    print(f"Wrote {target} ({target.stat().st_size} bytes)")


def main() -> None:
    text = collect_text()
    for _, (filename, url, target) in SOURCES.items():
        source_path = ensure_source_font(filename, url)
        build_subset(source_path, target, text)


if __name__ == "__main__":
    main()
