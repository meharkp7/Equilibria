#!/usr/bin/env bash
# Download PPO checkpoints (HF Spaces reject binary files in git pushes).
set -euo pipefail

REF="${MODELS_GIT_REF:-8b4e416}"
BASE="https://raw.githubusercontent.com/harleen05/Equilibria/${REF}/models"

mkdir -p models/best/easy models/best/medium models/best/hard

fetch() {
  local dest="$1"
  local name="$2"
  echo "→ ${dest}"
  curl -fsSL "${BASE}/${name}" -o "${dest}"
}

fetch models/ppo_easy_final.zip ppo_easy_final.zip
fetch models/ppo_medium_final.zip ppo_medium_final.zip
fetch models/ppo_hard_final.zip ppo_hard_final.zip
fetch models/best/easy/best_model.zip best/easy/best_model.zip
fetch models/best/medium/best_model.zip best/medium/best_model.zip
fetch models/best/hard/best_model.zip best/hard/best_model.zip

echo "✓ Models ready under models/"
