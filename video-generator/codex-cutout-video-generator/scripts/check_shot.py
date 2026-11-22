"""Validate a shot plan and bind an approval record to its exact inputs and preview."""
import argparse
import hashlib
import json
import math
from pathlib import Path


def read_object(path: Path) -> dict:
    value = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object in {path}")
    return value


def digest(path: Path) -> str:
    if not path.is_file() or path.stat().st_size == 0:
        raise ValueError(f"Missing or empty file: {path}")
    checksum = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            checksum.update(chunk)
    return checksum.hexdigest()


def finite(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def nonempty(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def check(plan_path: Path, preview: Path | None) -> dict:
    plan = read_object(plan_path)
    shot_id = plan.get("shot_id")
    duration = plan.get("duration_seconds")
    if not nonempty(shot_id) or not nonempty(plan.get("goal")):
        raise ValueError("A shot needs a shot_id and goal")
    if not finite(duration) or duration <= 0:
        raise ValueError("duration_seconds must be a positive number")

    layers = plan.get("layers")
    for layer in ("background", "characters", "foreground"):
        elements = layers.get(layer) if isinstance(layers, dict) else None
        if not isinstance(elements, list) or not all(nonempty(item) for item in elements):
            raise ValueError(f"layers.{layer} must be a list of element names (may be empty)")

    beats = plan.get("beats")
    if not isinstance(beats, list) or not beats:
        raise ValueError("beats must contain at least one timed action")
    previous = -1
    for beat in beats:
        time = beat.get("at") if isinstance(beat, dict) else None
        if not finite(time) or not (0 <= time < duration) or time <= previous:
            raise ValueError("beats[].at must be in range and strictly increasing")
        if not nonempty(beat.get("action")):
            raise ValueError(f"Missing action at {time}s")
        previous = time

    expressions = plan.get("expression_beats", [])
    if not isinstance(expressions, list):
        raise ValueError("expression_beats must be a list")
    for cue in expressions:
        if not isinstance(cue, dict) or not all(
            nonempty(cue.get(key)) for key in ("character", "trigger", "change")
        ):
            raise ValueError("Each expression beat needs a character, trigger and change")
        start, end = cue.get("from"), cue.get("to")
        if not finite(start) or not finite(end) or not (0 <= start < end <= duration):
            raise ValueError("Expression beats must have a valid from/to range within the shot")

    inputs = plan.get("inputs")
    if not isinstance(inputs, list) or not inputs or not all(nonempty(item) for item in inputs):
        raise ValueError("inputs must list the project-relative source files used in the preview")

    root = plan_path.resolve().parent
    hashes = {}
    for relative in inputs:
        entry = Path(relative)
        resolved = (root / entry).resolve()
        if entry.is_absolute() or not resolved.is_relative_to(root):
            raise ValueError(f"Input must stay inside the project: {relative}")
        hashes[relative] = digest(resolved)

    manifest = {"plan_sha256": digest(plan_path), "inputs": hashes}
    encoded = json.dumps(manifest, sort_keys=True, ensure_ascii=False).encode("utf-8")
    result = {"shot_id": shot_id, "input_sha256": hashlib.sha256(encoded).hexdigest()}
    if preview is not None:
        result["preview_sha256"] = digest(preview)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("plan", type=Path, help="Shot JSON at the project root")
    parser.add_argument("--preview", type=Path, help="Actual rendered preview shown for review")
    parser.add_argument("--review", type=Path, help="Existing JSON record of the actual approval")
    args = parser.parse_args()
    if args.review and not args.preview:
        parser.error("--review requires --preview")

    try:
        result = check(args.plan, args.preview)
        if args.review:
            review = read_object(args.review)
            if not nonempty(review.get("approved_by")) or not nonempty(review.get("approval_ref")):
                raise ValueError("Review must name the approver and reference their approval")
            for key, value in result.items():
                if review.get(key) != value:
                    raise ValueError(f"Review does not match the current version: {key}")
            result["review_matches"] = True
    except (OSError, ValueError, OverflowError) as error:
        parser.exit(1, f"{error}\n")

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

