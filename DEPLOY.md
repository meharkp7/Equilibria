# Deploy Equilibria

## URLs

| Target | URL |
|--------|-----|
| GitHub | `https://github.com/harleen05/Equilibria` |
| HF Space (API + UI) | `https://huggingface.co/spaces/mk1647/attention-economy-env` |
| API health | `https://mk1647-attention-economy-env.hf.space/health` |
| Playground UI | `https://mk1647-attention-economy-env.hf.space/ui/` |
| Inference agent | Set `ENV_URL=https://mk1647-attention-economy-env.hf.space` |

---

## 1. Push to GitHub

```bash
cd /path/to/Equilibria

# Model zips are on GitHub (commit 8b4e416+) but not pushed to HF git (binary rejection).
# The HF Docker build downloads them via scripts/download_models.sh

git add -A
git status   # confirm no .env secrets

git commit -m "Add policy playground UI, session API, PPO models, and HF deploy bundle."

git push origin main
```

---

## 2. Push to Hugging Face Space

Remote is already configured:

```bash
git remote -v
# hf  https://huggingface.co/spaces/mk1647/attention-economy-env
```

Authenticate (once):

```bash
pip install huggingface_hub
huggingface-cli login
# paste a Write token from https://huggingface.co/settings/tokens
```

Push the same branch HF expects:

```bash
git push hf main
```

HF rebuilds the Docker Space automatically (5–15 min). Watch **Logs** on the Space page.

---

## 3. What the HF Docker image includes

- FastAPI on port **7860** (`/health`, `/reset`, `/step`, `/step/heuristic`, `/step/ppo`, …)
- React UI at **`/ui/`** (same origin → no CORS issues)
- PPO checkpoints under `models/` (easy, medium, hard)

---

## 4. Run inference against the live Space

```bash
export ENV_URL=https://mk1647-attention-economy-env.hf.space
export API_BASE_URL=https://api.openai.com/v1   # or your provider
export HF_TOKEN=your_token
export MODEL_NAME=gpt-4o-mini

python inference.py --task easy
```

Dry-run (no API keys):

```bash
python inference.py --dry-run --task easy
```

---

## 5. Local smoke test (before push)

```bash
docker build -t equilibria .
docker run --rm -p 7860:7860 equilibria

curl http://localhost:7860/health
open http://localhost:7860/ui/
```

---

## 6. Troubleshooting

| Issue | Fix |
|-------|-----|
| `git push hf` auth failed | `huggingface-cli login` with **Write** role |
| Space build OOM | Reduce image: remove `torch` from Dockerfile and disable `/step/ppo` |
| UI 404 | Open `/ui/` with trailing slash; rebuild frontend with `VITE_BASE_PATH=/ui/` |
| PPO button disabled | Ensure `models/best/{task}/best_model.zip` is committed and copied in Docker |
