from pathlib import Path
import sys

from fontTools import subset


ROOT = Path(__file__).resolve().parents[1]
TEXT_SOURCES = [
    ROOT / "src" / "App.tsx",
    ROOT / "src" / "content.ts",
    ROOT / "index.html",
    ROOT / "README.md",
    ROOT / "public" / "sitemap.xml",
]


def collect_text() -> str:
    text = "".join(path.read_text(encoding="utf-8") for path in TEXT_SOURCES)
    return "".join(sorted(set(text + "".join(chr(code) for code in range(32, 127)))))


def build(source: Path, target: Path, text: str) -> None:
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


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: subset_fonts.py SERIF_OTF SANS_OTF")

    text = collect_text()
    build(Path(sys.argv[1]), ROOT / "public" / "fonts" / "yaqxuan-serif-sc.woff2", text)
    build(Path(sys.argv[2]), ROOT / "public" / "fonts" / "yaqxuan-sans-sc.woff2", text)


if __name__ == "__main__":
    main()
