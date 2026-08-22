"""Rebuild dinosaur animation sheets with per-dinosaur frame geometry.

The original combined sheets used one 200 px frame width for every dinosaur.
Several source poses are wider than that, so neighbouring frames were painted on
top of each other.  This tool deliberately keeps an explicit layout per dinosaur
and computes a safe cell width from that dinosaur's own source frames.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / "godot_dinofraction" / "assets" / "sprites"
DINO_SHEETS = SPRITES / "dinos"
SHEET_HEIGHT = 150


@dataclass(frozen=True)
class SourceLayout:
    species: str
    target_height: int
    baseline: int = 131
    side_padding: int = 18


# These are intentionally individual measurements. target_height is the visible
# height of the matching clean jump pose already used by the game.
SOURCE_LAYOUTS: dict[int, SourceLayout] = {
    8: SourceLayout("velociraptor", target_height=64, side_padding=20),
    11: SourceLayout("tyrannosaurus", target_height=70, side_padding=22),
    14: SourceLayout("therizinosaurus", target_height=69, side_padding=24),
    15: SourceLayout("corythosaurus", target_height=70, side_padding=24),
    17: SourceLayout("ceratosaurus", target_height=73, side_padding=22),
    24: SourceLayout("pachycephalosaurus", target_height=74, side_padding=22),
    28: SourceLayout("ceratosaurus", target_height=73, side_padding=22),
}

# Only the actions that were contaminated by a neighbouring frame are rebuilt.
SOURCE_ACTIONS: dict[int, tuple[str, ...]] = {
    8: ("attack",),
    11: ("attack",),
    14: ("run", "attack"),
    15: ("run", "attack"),
    17: ("run", "attack"),
    24: ("run", "attack"),
    28: ("run", "attack"),
}

# One legacy raw file itself contains two neighbouring run poses.  Its left pose
# is the real fifth Corythosaurus frame; crop it before any scaling or packing.
SOURCE_CROPS: dict[tuple[str, str, str], tuple[int, int, int, int]] = {
    ("corythosaurus", "run", "run_04.png"): (0, 0, 170, 105),
}


@dataclass(frozen=True)
class ProceduralAttackLayout:
    baseline: int
    side_padding: int
    lunge: tuple[int, int, int, int, int, int]
    stretch: tuple[float, float, float, float, float, float]
    lift: tuple[int, int, int, int, int, int]


# These dinosaurs have no matching raw attack folder.  Each therefore gets its
# own lunge distance, stretch and lift instead of sharing a batch crop/template.
PROCEDURAL_ATTACKS: dict[int, ProceduralAttackLayout] = {
    9: ProceduralAttackLayout(131, 24, (0, 5, 13, 22, 11, 0), (1.00, 1.04, 1.10, 1.15, 1.07, 1.00), (0, 1, 3, 1, 0, 0)),
    19: ProceduralAttackLayout(131, 28, (0, 7, 17, 28, 14, 0), (1.00, 1.05, 1.12, 1.18, 1.08, 1.00), (0, 2, 4, 2, 1, 0)),
    21: ProceduralAttackLayout(131, 26, (0, 6, 15, 25, 12, 0), (1.00, 1.04, 1.10, 1.16, 1.07, 1.00), (0, 1, 3, 2, 0, 0)),
    26: ProceduralAttackLayout(131, 30, (0, 4, 10, 18, 9, 0), (1.00, 1.03, 1.08, 1.12, 1.06, 1.00), (0, 0, 2, 1, 0, 0)),
    27: ProceduralAttackLayout(131, 32, (0, 5, 12, 21, 10, 0), (1.00, 1.04, 1.09, 1.14, 1.06, 1.00), (0, 1, 3, 1, 0, 0)),
}


def alpha_trim(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    bounds = rgba.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Animation frame is fully transparent")
    return rgba.crop(bounds)


def png_files(folder: Path) -> list[Path]:
    return sorted(folder.glob("*.png"))


def load_source_frame(species: str, action: str, path: Path) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    crop = SOURCE_CROPS.get((species, action, path.name))
    if crop is not None:
        image = image.crop(crop)
    return image


def source_scale(dino_id: int, layout: SourceLayout) -> float:
    run_frames = png_files(SPRITES / layout.species / "run")
    reference = run_frames[min(2, len(run_frames) - 1)]
    reference_height = alpha_trim(load_source_frame(layout.species, "run", reference)).height
    return layout.target_height / float(reference_height)


def resize_at_scale(image: Image.Image, scale: float) -> Image.Image:
    frame = alpha_trim(image)
    size = (max(1, round(frame.width * scale)), max(1, round(frame.height * scale)))
    return frame.resize(size, Image.Resampling.LANCZOS)


def pack_frames(
    frames: list[Image.Image], *, baseline: int, side_padding: int, output: Path
) -> int:
    max_width = max(frame.width for frame in frames)
    cell_width = max_width + (side_padding * 2)
    if cell_width % 2:
        cell_width += 1

    sheet = Image.new("RGBA", (cell_width * len(frames), SHEET_HEIGHT), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        x = (index * cell_width) + ((cell_width - frame.width) // 2)
        y = baseline - frame.height
        if y < 0:
            raise ValueError(f"{output.name}: frame {index} is taller than its individual canvas")
        sheet.alpha_composite(frame, (x, y))

    sheet.save(output, optimize=True)
    return cell_width


def rebuild_from_sources(dino_id: int, action: str) -> tuple[int, int]:
    layout = SOURCE_LAYOUTS[dino_id]
    source_files = png_files(SPRITES / layout.species / action)
    if not source_files:
        raise FileNotFoundError(f"No {action} frames for {layout.species}")
    scale = source_scale(dino_id, layout)
    frames = [
        resize_at_scale(load_source_frame(layout.species, action, path), scale)
        for path in source_files
    ]
    output = DINO_SHEETS / f"dino_{dino_id:02d}_{action}.png"
    cell_width = pack_frames(
        frames, baseline=layout.baseline, side_padding=layout.side_padding, output=output
    )
    return len(frames), cell_width


def rebuild_procedural_attack(dino_id: int) -> tuple[int, int]:
    layout = PROCEDURAL_ATTACKS[dino_id]
    # The single jump image is a clean, isolated pose for this exact dinosaur.
    base = alpha_trim(Image.open(DINO_SHEETS / f"dino_{dino_id:02d}_jump.png"))
    frames: list[Image.Image] = []
    for stretch in layout.stretch:
        width = max(1, round(base.width * stretch))
        # A small inverse vertical squash makes the lunge feel forceful without
        # changing the dinosaur's foot anchor.
        height = max(1, round(base.height * (2.0 - stretch)))
        frames.append(base.resize((width, height), Image.Resampling.LANCZOS))

    max_width = max(frame.width + shift for frame, shift in zip(frames, layout.lunge))
    cell_width = max_width + (layout.side_padding * 2)
    if cell_width % 2:
        cell_width += 1
    sheet = Image.new("RGBA", (cell_width * len(frames), SHEET_HEIGHT), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        x = (index * cell_width) + ((cell_width - frame.width) // 2) + layout.lunge[index] // 2
        y = layout.baseline - frame.height - layout.lift[index]
        sheet.alpha_composite(frame, (x, y))
    output = DINO_SHEETS / f"dino_{dino_id:02d}_attack.png"
    sheet.save(output, optimize=True)
    return len(frames), cell_width


def main() -> None:
    for dino_id, actions in SOURCE_ACTIONS.items():
        for action in actions:
            count, width = rebuild_from_sources(dino_id, action)
            print(f"dino_{dino_id:02d} {action}: {count} frames, {width}px individual cell")
    for dino_id in PROCEDURAL_ATTACKS:
        count, width = rebuild_procedural_attack(dino_id)
        print(f"dino_{dino_id:02d} attack: {count} frames, {width}px individual cell")


if __name__ == "__main__":
    main()
