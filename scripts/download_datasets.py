#!/usr/bin/env python3
"""
Dataset downloader helper.

- Reads datasets/manifest.json
- Creates placeholders for restricted datasets under data/raw/{id}/README.txt
- Clones Git repos when provided
- Optionally uses Kaggle CLI if --use-kaggle and env is configured

Licensing: This tool does not redistribute datasets. You must accept each dataset's license
upstream. This script only automates allowed steps and prints manual instructions when required.
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "datasets" / "manifest.json"
RAW_DIR = ROOT / "data" / "raw"


def run(cmd: list[str], cwd: Path | None = None) -> int:
    print("$", " ".join(cmd))
    return subprocess.call(cmd, cwd=str(cwd) if cwd else None)


def ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def write_placeholder(dataset_id: str, instructions: list[str], dest: Path) -> None:
    ensure_dir(dest)
    readme = dest / "README.txt"
    if not readme.exists():
        readme.write_text(
            (
                f"Dataset: {dataset_id}\n\n"
                "This dataset requires manual steps or restricted access.\n"
                "Follow the instructions below and place files in this directory.\n\n"
                + "\n".join(f"- {line}" for line in instructions)
                + "\n\nNote: Do not commit dataset contents to the repository."
            ),
            encoding="utf-8",
        )
        print(f"Created placeholder: {readme}")


def clone_repo(git_url: str, dest: Path) -> None:
    ensure_dir(dest.parent)
    if dest.exists() and any(dest.iterdir()):
        print(f"Skip clone: {dest} already exists")
        return
    run(["git", "clone", "--depth", "1", git_url, str(dest)])


def download_kaggle(datasets: list[str], dest: Path) -> None:
    ensure_dir(dest)
    # Validate Kaggle CLI
    kaggle_ok = run(["kaggle", "-v"]) == 0
    if not kaggle_ok:
        print("Kaggle CLI not found. Install via `pip install kaggle` and configure API token.")
        return
    for ds in datasets:
        print(f"Downloading Kaggle dataset: {ds}")
        code = run(["kaggle", "datasets", "download", "-d", ds, "-p", str(dest), "--unzip"])
        if code != 0:
            print(f"Failed to download {ds}. Check permissions and dataset slug.")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", nargs="*", default=None, help="Dataset ids to include")
    parser.add_argument("--use-kaggle", action="store_true", help="Enable Kaggle CLI downloads")
    args = parser.parse_args()

    if not MANIFEST.exists():
        print(f"Manifest not found: {MANIFEST}")
        return 1

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    datasets = manifest.get("datasets", [])
    selected = {d for d in (args.only or [])}

    ensure_dir(RAW_DIR)

    for ds in datasets:
        ds_id = ds["id"]
        if selected and ds_id not in selected:
            continue
        local_path = RAW_DIR / Path(ds.get("local_path", f"data/raw/{ds_id}")).name
        access = ds.get("access", "mixed")
        instructions = ds.get("instructions", [])

        if ds.get("git"):
            clone_repo(ds["git"], local_path)
            # Always include a license/citation reminder
            write_placeholder(ds_id, ["Remember to cite the dataset per upstream license."], local_path)

        if ds_id == "kaggle-isl-sets" and args.use_kaggle:
            download_kaggle(ds.get("kaggle_datasets", []), local_path)

        if access in {"restricted", "partial", "portal"}:
            write_placeholder(ds_id, instructions, local_path)

        if access == "mixed" and not ds.get("git"):
            write_placeholder(ds_id, instructions, local_path)

    print("\nDone. Review placeholders for manual steps where required.")
    return 0


if __name__ == "__main__":
    sys.exit(main())


