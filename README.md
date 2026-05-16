# Parallel

LangGraph-powered hiring simulation that runs controlled candidate variants through staged agent reviews and streams timeline events via Server-Sent Events (SSE).

Stage scoring is deterministic so variants diverge predictably; the **Bias Auditor** uses your OpenAI key (when set in `backend/.env`) to generate the final narrative summary.

## Setup

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # optional — OpenAI not required for mock simulation
```

### Frontend

```bash
cd frontend
pnpm install   # or npm install
cp .env.example .env.local
```

## Run

**Terminal 1 — API** (from `backend/`):

```bash
source .venv/bin/activate
python3 -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — UI** (from `frontend/`):

```bash
pnpm dev   # http://localhost:3000
```

## Test health

```bash
curl http://localhost:8000/health
```

Expected:

```json
{"status":"ok"}
```

## Test JSON simulation (SSE)

```bash
curl -N -X POST http://localhost:8000/simulate \
  -H "Content-Type: application/json" \
  -d '{"targetRole":"Software Engineering Intern","resumeText":"Nathan Ong\nnathan@email.com\nUC Irvine Computer Science\nSkills: React, FastAPI, Python, AI, PostgreSQL\nProjects: AI hiring simulation, food recognition app\nExperience: Software engineering intern and research developer"}'
```

You should see streamed `data: {...}` events for each stage, then `final_feedback`, then `simulation_done`.

## Test file upload (TXT)

```bash
curl -N -X POST http://localhost:8000/simulate \
  -F "targetRole=Software Engineering Intern" \
  -F "file=@resume.txt"
```

## Test file upload (PDF)

Requires `pypdf` (included in `requirements.txt`):

```bash
curl -N -X POST http://localhost:8000/simulate \
  -F "targetRole=Software Engineering Intern" \
  -F "file=@resume.pdf"
```

## CORS

The API allows `http://localhost:3000` by default (configurable via `CORS_ORIGINS` in `.env`).

## Frontend

Open [http://localhost:3000](http://localhost:3000). Paste or upload a resume, set the target role, and click **Run simulation**. The timeline streams live from `POST /simulate`; final bias-audit feedback appears at the end. When `OPENAI_API_KEY` is set, the UI shows **LLM enabled** and the auditor summary is model-generated.

By default the frontend proxies `/api/*` to `http://127.0.0.1:8000` (see `frontend/next.config.ts`), so CORS is not an issue in dev. Set `NEXT_PUBLIC_API_URL` only if you want to call the backend directly.
