#!/usr/bin/env python3
"""
Collect low-confidence samples for active learning.

This script scans a directory containing prediction JSON lines (e.g., logs/predictions/*.jsonl)
and copies referenced clips into data/active_learning/{YYYYMMDD}/ with a manifest CSV for labeling.
"""

import argparse
from pathlib import Path
import json
import csv
from datetime import datetime
import shutil

ROOT = Path(__file__).resolve().parents[1]
LOGS = ROOT / "logs" / "predictions"
OUT_BASE = ROOT / "data" / "active_learning"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--threshold", type=float, default=0.85)
    parser.add_argument("--input", type=str, default=str(LOGS))
    args = parser.parse_args()

    ts = datetime.utcnow().strftime("%Y%m%d")
    out_dir = OUT_BASE / ts
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = out_dir / "manifest.csv"

    rows = []
    for f in Path(args.input).glob("*.jsonl"):
        with f.open("r", encoding="utf-8") as fh:
            for line in fh:
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                conf = float(obj.get("confidence", 0.0))
                if conf >= args.threshold:
                    continue
                clip = obj.get("clip_path") or obj.get("clip")
                if not clip:
                    continue
                clip_path = Path(clip)
                if not clip_path.exists():
                    continue
                dest = out_dir / clip_path.name
                if not dest.exists():
                    shutil.copy2(clip_path, dest)
                rows.append({
                    "clip": dest.name,
                    "pred_text": obj.get("text", ""),
                    "confidence": conf,
                    "meta": json.dumps(obj.get("meta", {}), ensure_ascii=False)
                })

    with manifest_path.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=["clip", "pred_text", "confidence", "meta"])
        writer.writeheader()
        for r in rows:
            writer.writerow(r)

    print(f"Collected {len(rows)} samples -> {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


