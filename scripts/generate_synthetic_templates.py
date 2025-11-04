#!/usr/bin/env python3
"""
Generate synthetic landmark templates for alphabet (A-Z) and 50 common sentences.
This creates placeholder templates with realistic landmark sequences for immediate demo.

Each landmark is represented as 126 floats (2 hands × 21 landmarks × 3 coordinates).
For alphabets, we use static handshapes.
For sentences, we generate smooth parametric motion sequences.
"""

import json
import math
import numpy as np
from pathlib import Path

# 126 = 2 hands × 21 landmarks × 3 coordinates (x, y, z)
LANDMARK_DIM = 126
FRAMES_PER_SENTENCE = 32  # Average sentence length

def generate_alphabet_template(letter: str) -> dict:
    """Generate synthetic static handshape for an alphabet letter."""
    # Create a normalized handshape based on letter position
    # This is a simplified placeholder - real templates would come from actual recordings
    
    base_landmarks = np.zeros(LANDMARK_DIM)
    
    # Simulate hand shape variation based on letter
    # Each letter gets a unique "signature" pattern
    letter_idx = ord(letter.upper()) - ord('A')
    
    # Generate parametric handshape
    for i in range(42):  # 2 hands × 21 landmarks
        hand_idx = i // 21
        landmark_idx = i % 21
        
        # Create a pattern that varies by letter
        phase = (letter_idx * 0.1 + landmark_idx * 0.05) % (2 * math.pi)
        
        # Wrist position (normalized)
        if landmark_idx == 0:  # Wrist
            base_landmarks[i * 3] = 0.5 + 0.2 * math.sin(phase)
            base_landmarks[i * 3 + 1] = 0.5 + 0.2 * math.cos(phase)
            base_landmarks[i * 3 + 2] = 0.0
        else:
            # Finger positions relative to wrist
            finger_offset = landmark_idx * 0.02
            base_landmarks[i * 3] = 0.5 + 0.3 * math.sin(phase + finger_offset)
            base_landmarks[i * 3 + 1] = 0.5 + 0.3 * math.cos(phase + finger_offset)
            base_landmarks[i * 3 + 2] = 0.1 * math.sin(phase * 2)
    
    # Normalize to [0, 1] range
    landmarks_list = base_landmarks.tolist()
    
    return {
        "landmark": landmarks_list,
        "notes": f"Right-hand template for letter {letter.upper()}"
    }

def generate_sentence_sequence(text: str, sentence_id: str) -> dict:
    """Generate synthetic landmark sequence for a sentence."""
    # Create a smooth motion sequence that simulates signing
    sequence = []
    
    # Each sentence gets a unique motion pattern based on its text
    text_hash = hash(text) % 1000
    
    for frame_idx in range(FRAMES_PER_SENTENCE):
        frame_landmarks = np.zeros(LANDMARK_DIM)
        
        # Create smooth motion over time
        t = frame_idx / FRAMES_PER_SENTENCE  # 0 to 1
        phase = (text_hash * 0.01 + t * 2 * math.pi) % (2 * math.pi)
        
        for i in range(42):  # 2 hands × 21 landmarks
            hand_idx = i // 21
            landmark_idx = i % 21
            
            # Create motion pattern
            hand_phase = phase + hand_idx * math.pi / 2
            landmark_phase = hand_phase + landmark_idx * 0.1
            
            # Wrist follows a smooth path
            if landmark_idx == 0:  # Wrist
                frame_landmarks[i * 3] = 0.5 + 0.2 * math.sin(hand_phase + t * math.pi)
                frame_landmarks[i * 3 + 1] = 0.5 + 0.2 * math.cos(hand_phase + t * math.pi)
                frame_landmarks[i * 3 + 2] = 0.1 * math.sin(hand_phase * 2)
            else:
                # Fingers follow wrist with slight delay
                finger_delay = landmark_idx * 0.05
                frame_landmarks[i * 3] = 0.5 + 0.3 * math.sin(landmark_phase + t * math.pi + finger_delay)
                frame_landmarks[i * 3 + 1] = 0.5 + 0.3 * math.cos(landmark_phase + t * math.pi + finger_delay)
                frame_landmarks[i * 3 + 2] = 0.1 * math.sin(landmark_phase * 2 + finger_delay)
        
        sequence.append(frame_landmarks.tolist())
    
    return {
        "text": text,
        "sequence": sequence,
        "notes": f"Synthetic template created for demo - replace with real recordings"
    }

def main():
    # Create output directory
    output_dir = Path(__file__).parent.parent / "apps" / "frontend" / "public" / "models" / "templates"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate alphabet templates (A-Z)
    print("Generating alphabet templates...")
    alphabets = {}
    for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        alphabets[letter] = generate_alphabet_template(letter)
    
    # Save alphabets
    alphabets_path = output_dir / "alphabets.json"
    with open(alphabets_path, 'w', encoding='utf-8') as f:
        json.dump(alphabets, f, indent=2)
    print(f"[OK] Saved {len(alphabets)} alphabet templates to {alphabets_path}")
    
    # Generate sentence templates (50 common sentences)
    print("Generating sentence templates...")
    sentences = {}
    
    sentence_list = [
        "Hello everyone", "Good morning", "Can you hear me", "I have a question",
        "Please repeat that", "Thank you", "Yes", "No", "I agree", "I disagree",
        "Can you share the screen", "Please mute your mic", "I am going to present",
        "Stop the screen share", "Who is speaking now", "Nice to meet you",
        "I will follow up", "Please write in chat", "Could you explain again",
        "Let's take a break", "How about tomorrow", "I need more time",
        "Please wait a moment", "That's a good point", "Can you type that",
        "I didn't understand", "Please lower your volume", "Welcome to the meeting",
        "I will share a link", "Let's continue", "Excuse me", "Please unmute",
        "I think so", "Can we schedule this", "Who will take notes",
        "I'm running late", "Please check the document", "Let's finish in time",
        "I will email you", "Any other business", "Congratulations", "Good job",
        "I need help", "Can you confirm", "Please speak slowly",
        "Switch to the other slide", "That's all from me", "Let's wrap up",
        "See you soon", "Thank you everyone"
    ]
    
    for idx, text in enumerate(sentence_list, 1):
        sentence_id = f"sentence_{idx:02d}"
        sentences[sentence_id] = generate_sentence_sequence(text, sentence_id)
    
    # Save sentences
    sentences_path = output_dir / "sentences.json"
    with open(sentences_path, 'w', encoding='utf-8') as f:
        json.dump(sentences, f, indent=2)
    print(f"[OK] Saved {len(sentences)} sentence templates to {sentences_path}")
    
    print("\n[OK] Template generation complete!")
    print(f"   Output directory: {output_dir}")
    print(f"   Alphabets: {alphabets_path}")
    print(f"   Sentences: {sentences_path}")
    print("\n[NOTE] These are synthetic templates for demo purposes.")
    print("   For production, replace with real recordings using generate_templates.py")

if __name__ == "__main__":
    main()

