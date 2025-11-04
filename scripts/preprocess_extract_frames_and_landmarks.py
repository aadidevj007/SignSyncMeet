#!/usr/bin/env python3
"""
Robust preprocessing pipeline:
- Discovers videos under data/raw/*
- Extracts frames with sliding window
- Uses MediaPipe Holistic to extract normalized landmarks (pose/hands/face if available)
- Writes outputs to:
  data/processed/{split}/{class}/{clip_id}/frames/*.jpg
  data/processed/{split}/{class}/{clip_id}/landmarks.npy
- Logs failures to logs/preprocess_failures.log

Notes:
- Ensure you have `mediapipe` and `opencv-python` installed.
- This script includes dataset-agnostic assumptions; adapt class/split parsing as needed.
"""

import argparse
import os
from pathlib import Path
import sys
import json
import cv2
import numpy as np
from datetime import datetime

try:
    import mediapipe as mp
except Exception as e:
    mp = None

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
PROC_DIR = ROOT / "data" / "processed"
LOG_DIR = ROOT / "logs"


def log_failure(msg: str):
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    with (LOG_DIR / "preprocess_failures.log").open("a", encoding="utf-8") as f:
        f.write(f"[{datetime.utcnow().isoformat()}] {msg}\n")


def parse_split_and_class(video_path: Path) -> tuple[str, str]:
    """Heuristics to extract split and class from path.
    Examples it supports:
      data/raw/<dataset>/<split>/<class>/<file>
      data/raw/<dataset>/<class>/<file>  -> split=unknown
    """
    parts = video_path.parts
    # Find index of 'raw'
    try:
        raw_idx = parts.index('raw')
    except ValueError:
        return "unknown", "unknown"
    tail = parts[raw_idx+1:]
    if len(tail) >= 3:
        split = tail[1]
        cls = tail[2]
    elif len(tail) >= 2:
        split = "unknown"
        cls = tail[1]
    else:
        split = "unknown"
        cls = "unknown"
    return split or "unknown", cls or "unknown"


def extract_frames_and_landmarks(video_path: Path, output_dir: Path, window: int, stride: int, max_frames: int | None, save_frames: bool) -> None:
    if mp is None:
        raise RuntimeError("mediapipe is not installed. Install via `pip install mediapipe`.")

    mp_holistic = mp.solutions.holistic
    mp_drawing = mp.solutions.drawing_utils

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    frames = []
    frame_idx = 0
    success, frame = cap.read()
    while success:
        frames.append(frame)
        frame_idx += 1
        if max_frames and frame_idx >= max_frames:
            break
        success, frame = cap.read()
    cap.release()

    output_dir.mkdir(parents=True, exist_ok=True)
    if save_frames:
        (output_dir / "frames").mkdir(parents=True, exist_ok=True)

    landmarks_all = []
    with mp_holistic.Holistic(static_image_mode=False, model_complexity=1, smooth_landmarks=True, enable_segmentation=False) as holistic:
        num_frames = len(frames)
        for start in range(0, max(1, num_frames - window + 1), stride):
            end = min(num_frames, start + window)
            window_landmarks = []
            for i in range(start, end):
                rgb = cv2.cvtColor(frames[i], cv2.COLOR_BGR2RGB)
                result = holistic.process(rgb)

                def norm_landmarks(lms, image_shape):
                    if not lms:
                        return np.zeros((0, 3), dtype=np.float32)
                    h, w = image_shape[:2]
                    arr = []
                    for lm in lms.landmark:
                        arr.append([lm.x, lm.y, lm.z])
                    return np.asarray(arr, dtype=np.float32)

                pose = norm_landmarks(result.pose_landmarks, frames[i].shape)
                lh = norm_landmarks(result.left_hand_landmarks, frames[i].shape)
                rh = norm_landmarks(result.right_hand_landmarks, frames[i].shape)
                face = norm_landmarks(result.face_landmarks, frames[i].shape)

                # Concatenate with fixed padding for shape consistency (empty arrays allowed)
                concatenated = np.concatenate([
                    pose if pose.size else np.zeros((33, 3), np.float32),
                    lh if lh.size else np.zeros((21, 3), np.float32),
                    rh if rh.size else np.zeros((21, 3), np.float32),
                    face if face.size else np.zeros((468, 3), np.float32)
                ], axis=0)
                window_landmarks.append(concatenated)

                if save_frames:
                    cv2.imwrite(str(output_dir / "frames" / f"{i:06d}.jpg"), frames[i])

            if window_landmarks:
                landmarks_all.append(np.stack(window_landmarks, axis=0))

    if landmarks_all:
        np.save(output_dir / "landmarks.npy", np.stack(landmarks_all, axis=0))


def is_video_file(p: Path) -> bool:
    return p.suffix.lower() in {".mp4", ".mov", ".avi", ".mkv", ".webm"}


def discover_videos(root: Path):
    for p in root.rglob("*"):
        if p.is_file() and is_video_file(p):
            yield p


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--window", type=int, default=32)
    parser.add_argument("--stride", type=int, default=16)
    parser.add_argument("--max-frames", type=int, default=None)
    parser.add_argument("--save-frames", action="store_true")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of videos processed")
    args = parser.parse_args()

    count = 0
    for video_path in discover_videos(RAW_DIR):
        try:
            split, cls = parse_split_and_class(video_path)
            clip_id = video_path.stem
            out_dir = PROC_DIR / split / cls / clip_id
            print(f"Processing {video_path} -> {out_dir}")
            extract_frames_and_landmarks(video_path, out_dir, args.window, args.stride, args.max_frames, args.save_frames)
            count += 1
            if args.limit and count >= args.limit:
                break
        except Exception as e:
            msg = f"FAIL {video_path}: {e}"
            print(msg)
            log_failure(msg)

    print(f"Done. Processed {count} videos.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""
Extract frames and landmarks from video datasets for sign language training.
Supports: WLASL, RWTH-PHOENIX, ASLLVD, Custom CSV format

Usage:
    python preprocess_extract_frames_and_landmarks.py \
        --input-dir ./data/raw \
        --output-dir ./data/processed \
        --frames-per-clip 32 \
        --dataset-format wlasl
"""

import argparse
import json
import os
import sys
from pathlib import Path
import cv2
import numpy as np
import mediapipe as mp
from tqdm import tqdm
import pandas as pd
from typing import List, Tuple, Dict

# MediaPipe setup
mp_hands = mp.solutions.hands
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils


def extract_landmarks_from_frame(frame_rgb, hands_detector, pose_detector=None):
    """
    Extract hand and pose landmarks from a single frame.
    
    Returns:
        landmarks: List of landmark arrays (up to 2 hands + pose)
        shape: [num_hands * 21 + pose_landmarks, 3] or flattened features
    """
    results_hands = hands_detector.process(frame_rgb)
    landmarks_list = []
    
    # Hand landmarks (21 points per hand, 2 hands max)
    if results_hands.multi_hand_landmarks:
        for hand_landmarks in results_hands.multi_hand_landmarks:
            hand_points = []
            for lm in hand_landmarks.landmark:
                hand_points.append([lm.x, lm.y, lm.z])
            landmarks_list.extend(hand_points)
    
    # Pad to 2 hands (42 landmarks = 2 * 21)
    while len(landmarks_list) < 42:
        landmarks_list.append([0.0, 0.0, 0.0])
    
    # Pose landmarks (optional, 33 points)
    if pose_detector:
        results_pose = pose_detector.process(frame_rgb)
        if results_pose.pose_landmarks:
            for lm in results_pose.pose_landmarks.landmark:
                landmarks_list.append([lm.x, lm.y, lm.z])
        else:
            # Pad pose landmarks if not detected
            for _ in range(33):
                landmarks_list.append([0.0, 0.0, 0.0])
    
    # Flatten to feature vector
    features = np.array(landmarks_list).flatten()
    
    return features


def extract_frames_from_video(video_path: Path, frames_per_clip: int = 32) -> Tuple[List[np.ndarray], float]:
    """
    Extract uniformly sampled frames from video.
    
    Returns:
        frames: List of RGB frames (H, W, 3)
        fps: Video FPS
    """
    cap = cv2.VideoCapture(str(video_path))
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    if total_frames == 0:
        return [], fps
    
    # Sample frame indices uniformly
    if total_frames <= frames_per_clip:
        indices = list(range(total_frames))
        # Pad with last frame if needed
        indices.extend([total_frames - 1] * (frames_per_clip - total_frames))
    else:
        step = total_frames / frames_per_clip
        indices = [int(i * step) for i in range(frames_per_clip)]
    
    frames = []
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret:
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(frame_rgb)
    
    cap.release()
    return frames, fps


def process_video_clip(
    video_path: Path,
    output_dir: Path,
    clip_id: str,
    class_name: str,
    frames_per_clip: int = 32,
    extract_pose: bool = False
):
    """
    Process a single video clip: extract frames and landmarks.
    """
    # Create output directories
    clip_dir = output_dir / class_name / clip_id
    frames_dir = clip_dir / 'frames'
    frames_dir.mkdir(parents=True, exist_ok=True)
    
    # Extract frames
    frames, fps = extract_frames_from_video(video_path, frames_per_clip)
    
    if len(frames) == 0:
        print(f"⚠️ Warning: No frames extracted from {video_path}")
        return None
    
    # Initialize MediaPipe
    hands = mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.5
    )
    pose = mp_pose.Pose() if extract_pose else None
    
    # Extract landmarks per frame
    landmarks_sequence = []
    for i, frame in enumerate(frames):
        # Save frame as JPEG
        frame_path = frames_dir / f'frame_{i:04d}.jpg'
        frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        cv2.imwrite(str(frame_path), frame_bgr)
        
        # Extract landmarks
        landmarks = extract_landmarks_from_frame(frame, hands, pose)
        landmarks_sequence.append(landmarks)
    
    # Save landmarks as .npy
    landmarks_array = np.array(landmarks_sequence)
    landmarks_path = clip_dir / 'landmarks.npy'
    np.save(str(landmarks_path), landmarks_array)
    
    # Save metadata
    metadata = {
        'clip_id': clip_id,
        'class_name': class_name,
        'frames_count': len(frames),
        'fps': fps,
        'landmarks_shape': landmarks_array.shape,
        'source_video': str(video_path)
    }
    metadata_path = clip_dir / 'metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    hands.close()
    if pose:
        pose.close()
    
    return metadata


def load_wlasl_labels(input_dir: Path) -> Dict[str, str]:
    """
    Load WLASL dataset labels.
    Expected structure: input_dir/videos/{class_name}/*.mp4
    """
    labels = {}
    videos_dir = input_dir / 'videos'
    
    if not videos_dir.exists():
        raise ValueError(f"WLASL videos directory not found: {videos_dir}")
    
    for class_dir in videos_dir.iterdir():
        if class_dir.is_dir():
            class_name = class_dir.name
            for video_file in class_dir.glob('*.mp4'):
                clip_id = video_file.stem
                labels[str(video_file)] = class_name
    
    return labels


def load_phoenix_labels(input_dir: Path) -> Dict[str, str]:
    """
    Load RWTH-PHOENIX dataset labels.
    Expected: input_dir/phoenix2014-release/{split}/signs/*.mp4
    """
    labels = {}
    phoenix_dir = input_dir / 'phoenix2014-release'
    
    if not phoenix_dir.exists():
        raise ValueError(f"Phoenix directory not found: {phoenix_dir}")
    
    # Load annotation file (if available)
    annotation_files = list(phoenix_dir.glob('**/*.corpus.csv'))
    if annotation_files:
        # Parse CSV to get video-label mappings
        df = pd.read_csv(annotation_files[0])
        # Implementation depends on Phoenix CSV format
        pass
    
    # Or scan directory structure
    for split in ['train', 'dev', 'test']:
        signs_dir = phoenix_dir / split / 'signs'
        if signs_dir.exists():
            for video_file in signs_dir.glob('*.mp4'):
                # Extract label from filename or directory structure
                class_name = video_file.parent.name  # Adjust based on structure
                labels[str(video_file)] = class_name
    
    return labels


def load_csv_labels(csv_path: Path) -> Dict[str, str]:
    """
    Load labels from custom CSV file.
    Expected format: video_path,label
    """
    df = pd.read_csv(csv_path)
    labels = {}
    
    for _, row in df.iterrows():
        video_path = Path(row['video_path'])
        label = row['label']
        labels[str(video_path.resolve())] = label
    
    return labels


def main():
    parser = argparse.ArgumentParser(description='Extract frames and landmarks from video datasets')
    parser.add_argument('--input-dir', required=True, type=Path, help='Input directory with videos')
    parser.add_argument('--output-dir', required=True, type=Path, help='Output directory for processed data')
    parser.add_argument('--frames-per-clip', type=int, default=32, help='Number of frames per clip')
    parser.add_argument('--dataset-format', choices=['wlasl', 'phoenix', 'csv', 'custom'], default='custom',
                        help='Dataset format')
    parser.add_argument('--labels-csv', type=Path, help='CSV file with video_path,label columns (for csv/custom format)')
    parser.add_argument('--extract-pose', action='store_true', help='Also extract pose landmarks')
    parser.add_argument('--split', choices=['train', 'val', 'test'], help='Dataset split (optional)')
    
    args = parser.parse_args()
    
    # Load labels based on dataset format
    print(f"📂 Loading labels from {args.dataset_format} format...")
    if args.dataset_format == 'wlasl':
        labels = load_wlasl_labels(args.input_dir)
    elif args.dataset_format == 'phoenix':
        labels = load_phoenix_labels(args.input_dir)
    elif args.labels_csv:
        labels = load_csv_labels(args.labels_csv)
    else:
        # Custom: assume structure input_dir/{class_name}/*.mp4
        labels = {}
        for class_dir in args.input_dir.iterdir():
            if class_dir.is_dir():
                class_name = class_dir.name
                for video_file in class_dir.glob('*.mp4'):
                    labels[str(video_file)] = class_name
    
    print(f"✅ Loaded configurations for {len(labels)} videos")
    
    # Create output directory structure
    if args.split:
        output_base = args.output_dir / args.split
    else:
        output_base = args.output_dir
    
    output_base.mkdir(parents=True, exist_ok=True)
    
    # Process each video
    failed = []
    successful = []
    
    for video_path_str, class_name in tqdm(labels.items(), desc="Processing videos"):
        video_path = Path(video_path_str)
        
        if not video_path.exists():
            print(f"⚠️ Video not found: {video_path}")
            failed.append(video_path)
            continue
        
        clip_id = video_path.stem
        try:
            metadata = process_video_clip(
                video_path,
                output_base,
                clip_id,
                class_name,
                args.frames_per_clip,
                args.extract_pose
            )
            if metadata:
                successful.append(metadata)
        except Exception as e:
            print(f"❌ Error processing {video_path}: {e}")
            failed.append(video_path)
    
    # Generate labels.csv for training
    labels_csv_path = output_base / 'labels.csv'
    rows = []
    for metadata in successful:
        rows.append({
            'clip_id': metadata['clip_id'],
            'class_name': metadata['class_name'],
            'clip_path': str(output_base / metadata['class_name'] / metadata['clip_id'])
        })
    
    labels_df = pd.DataFrame(rows)
    labels_df.to_csv(labels_csv_path, index=False)
    print(f"✅ Saved labels CSV: {labels_csv_path}")
    
    print(f"\n📊 Summary:")
    print(f"  ✅ Successful: {len(successful)}")
    print(f"  ❌ Failed: {len(failed)}")
    
    if failed:
        print(f"\n⚠️ Failed videos:")
        for path in failed[:10]:  # Show first 10
            print(f"    {path}")


if __name__ == '__main__':
    main()

