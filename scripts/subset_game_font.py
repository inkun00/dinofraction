"""Shrink the web game's Korean font without dropping player-name glyphs."""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FONT_PATH = ROOT / "godot_dinofraction" / "assets" / "fonts" / "GameFontBold.ttf"

# Keep every modern Hangul syllable so dynamically entered player and school
# names remain safe. CJK ideographs and unrelated writing systems are omitted.
UNICODE_RANGES = ",".join(
    [
        "U+0000-00FF",  # Latin, digits and common punctuation
        "U+1100-11FF",  # Hangul Jamo
        "U+2000-206F",  # General punctuation
        "U+20A0-20CF",  # Currency symbols
        "U+2100-214F",  # Letterlike symbols
        "U+2150-218F",  # Fractions and number forms
        "U+2190-21FF",  # Arrows
        "U+2200-22FF",  # Mathematical operators
        "U+2300-23FF",  # Technical symbols
        "U+2460-24FF",  # Enclosed alphanumerics
        "U+25A0-25FF",  # Geometric shapes
        "U+2600-26FF",  # Miscellaneous symbols
        "U+2700-27BF",  # Dingbats
        "U+3000-303F",  # CJK punctuation
        "U+3130-318F",  # Hangul compatibility Jamo
        "U+AC00-D7A3",  # All precomposed modern Hangul syllables
        "U+FF00-FFEF",  # Halfwidth and fullwidth forms
    ]
)


def main() -> None:
    if not FONT_PATH.is_file():
        raise SystemExit(f"Font not found: {FONT_PATH}")

    before = FONT_PATH.stat().st_size
    file_descriptor, temporary_name = tempfile.mkstemp(
        prefix="GameFontBold.", suffix=".ttf", dir=FONT_PATH.parent
    )
    os.close(file_descriptor)
    temporary_path = Path(temporary_name)

    try:
        subprocess.run(
            [
                sys.executable,
                "-m",
                "fontTools.subset",
                str(FONT_PATH),
                f"--output-file={temporary_path}",
                f"--unicodes={UNICODE_RANGES}",
                "--layout-features=*",
                "--glyph-names",
                "--symbol-cmap",
                "--legacy-cmap",
                "--notdef-glyph",
                "--notdef-outline",
                "--recommended-glyphs",
                "--name-IDs=*",
                "--name-legacy",
                "--name-languages=*",
                "--no-hinting",
            ],
            check=True,
        )
        after = temporary_path.stat().st_size
        if after <= 0:
            raise RuntimeError("Font subset output is empty")
        if after >= before * 0.99:
            print(f"{FONT_PATH.name} is already subset ({before:,} bytes)")
            return
        os.replace(temporary_path, FONT_PATH)
        print(
            f"Subset {FONT_PATH.name}: {before:,} -> {after:,} bytes "
            f"({(1 - after / before) * 100:.1f}% smaller)"
        )
    finally:
        temporary_path.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
