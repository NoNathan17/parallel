# Parallel

Live multi-agent hiring simulation — watch equally qualified candidates branch into different outcomes, then replay with structural interventions.

## Quick start

### Backend

```bash
cd parallel/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Set OPENAI_API_KEY in .env
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd parallel/frontend
pnpm install
cp .env.local.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo flow

1. **Landing** → Upload resume or use demo candidate
2. **Variants** → Review parallel realities (one signal changed each)
3. **Simulation** → Watch timeline branch live via SSE
4. **Bias Auditor** → Read divergence analysis
5. **Interventions** → Enable fixes and replay to shrink branches

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/candidates` | Upload PDF resume |
| POST | `/api/candidates/manual` | Create candidate manually |
| POST | `/api/candidates/{id}/variants` | Generate variant set |
| GET | `/api/candidates/{id}/variants` | List variants |
| POST | `/api/simulations` | Start simulation |
| GET | `/api/simulations/{id}/events` | SSE event stream |
| POST | `/api/simulations/{id}/replay` | Replay with interventions |
| POST | `/api/demo/seed` | Seed demo candidate + variants |

## Environment

| Variable | Default |
|----------|---------|
| `OPENAI_API_KEY` | required for LLM features |
| `OPENAI_MODEL` | `gpt-4o-mini` |
| `CORS_ORIGINS` | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` |

## Manual test checklist

- [ ] Upload PDF → profile extracted
- [ ] Variants show “only this signal changed”
- [ ] Simulation streams agent evaluations + timeline events
- [ ] Bias auditor summarizes divergence
- [ ] Replay with interventions reduces callback spread
