# DevOnboard AI

**Smart Developer Onboarding Assistant** — An AI-powered tool that analyzes any public GitHub repository and automatically generates a complete developer onboarding experience.

> Built for the IBM Bob 2.0 Hackathon  
> Deployed: https://clocket-ai.onrender.com

---

## Table of Contents

1. [Problem](#1-problem)
2. [Solution](#2-solution)
3. [Key Features](#3-key-features)
4. [Architecture](#4-architecture)
5. [AI / ML Components](#5-ai--ml-components)
6. [MCP Usage](#6-mcp-usage)
7. [RAG Architecture](#7-rag-architecture)
8. [LangGraph Workflow](#8-langgraph-workflow)
9. [Security](#9-security)
10. [Database Schema](#10-database-schema)
11. [**Setup Guide**](#11-setup-guide)
12. [Demo Instructions](#12-demo-instructions)
13. [Future Improvements](#13-future-improvements)
14. [Tech Stack](#tech-stack)

---

## 1. Problem

When a developer joins an unfamiliar software project, they spend **hours or days** trying to understand:

- Project structure and architecture
- Technology stack and dependencies
- How to set up the environment
- Where the entry points and APIs are
- What the database looks like
- Where to start contributing
- What tasks are beginner-friendly

There is no automated, intelligent way to get this information quickly. README files are often outdated, incomplete, or missing entirely.

---

## 2. Solution

**DevOnboard AI** analyzes a GitHub repository in minutes and produces:

| Output | Description |
|--------|-------------|
| Technology Stack | Languages, frameworks, databases, infrastructure — detected deterministically |
| Architecture Analysis | AI-generated structured component breakdown |
| Setup Guide | Evidence-based step-by-step instructions from actual config files |
| Configuration Findings | Missing env vars, inconsistencies, potential problems |
| Starter Tasks | Beginner/intermediate/advanced tasks grounded in real files |
| Codebase Q&A | Ask questions, get RAG-grounded answers with source citations |
| Onboarding Progress | Track task completion with a personal progress dashboard |

---

## 3. Key Features

- **Repository analysis pipeline** — LangGraph workflow with 10 nodes
- **Deterministic + LLM hybrid** — static analysis first, LLM only where reasoning adds value
- **Repository-scoped RAG** — every answer grounded in actual indexed code files
- **User isolation** — all data filtered by `user_id + repository_id`; no cross-user or cross-repo leakage
- **Official GitHub MCP** — uses the GitHub MCP Server for repository data (no custom GitHub client)
- **Task progress tracking** — per-user task status stored in Supabase
- **Security-first** — repository content treated as untrusted; prompt injection resistance built in
- **Existing infrastructure reuse** — built on a working FastAPI + LangGraph + Supabase foundation

---

## 4. Architecture

```
React/Vite SPA (9 pages)
  ↓  Bearer token
FastAPI
  ├── /auth/*           Supabase auth (unchanged)
  ├── /repositories/*   CRUD for tracked repos
  ├── /analysis/*       Trigger analysis, poll status, results, Q&A, progress
  ├── /chat/*           General chat (unchanged)
  └── /health           Health check

  ↓
LangGraph
  ├── Onboarding Workflow (10-node pipeline)
  │     validate_url → clone → scan → architecture → setup_guide →
  │     onboarding_plan → starter_tasks → index_rag → persist → cleanup
  └── Q&A Handler (repository-filtered RAG)

Tools
  ├── GitHub MCP Server (official) — read-only repo access
  ├── Task MCP Server — onboarding task progress
  └── DevOnboard MCP — save_analysis, get_progress, update_task

Storage
  └── Supabase PostgreSQL + pgvector
        repositories, repository_analysis, onboarding_tasks,
        onboarding_progress, rag_documents (extended), tasks,
        conversations, messages
```

---

## 5. AI / ML Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Repository Scanner | Pure Python (deterministic) | Language/framework/infra detection |
| Architecture Analyzer | Groq LLM + LangChain | Structured architecture JSON |
| Setup Guide Generator | Groq LLM + LangChain | Evidence-based setup steps |
| Task Generator | Groq LLM + LangChain | Starter tasks grounded in real files |
| Onboarding Plan Generator | Groq LLM + LangChain | Personalized narrative plan |
| Codebase Q&A | RAG + Groq LLM | Grounded answers with citations |
| Orchestration | LangGraph StateGraph | 10-node analysis pipeline |
| Embeddings | fastembed BAAI/bge-small-en-v1.5 (384 dims) | Semantic code search |

---

## 6. MCP Usage

### Official GitHub MCP Server

Used via `MultiServerMCPClient` (same pattern as existing `mcp-server-git`).

```python
# mcp_server/server/github_server.py
client = MultiServerMCPClient({
    "github": {
        "command": "docker",
        "args": ["run", "-i", "--rm", "-e", f"GITHUB_PERSONAL_ACCESS_TOKEN={token}",
                 "ghcr.io/github/github-mcp-server"],
        "transport": "stdio",
    }
})
tools = await client.get_tools()
```

Read-only tools: `get_repository`, `get_file_contents`, `get_tree`, `search_code`, `list_commits`, `list_branches`, `list_pull_requests`, `list_issues`.

### DevOnboard Custom MCP Tools

`mcp_server/devonboard_tools.py` — DevOnboard-specific persistence tools:

| Tool | Description |
|------|-------------|
| `save_repository_analysis` | Persist full analysis JSON to Supabase |
| `save_onboarding_tasks` | Persist generated tasks |
| `get_onboarding_progress` | Read per-user task completion |
| `update_onboarding_task` | Update task status |

### Existing Task MCP (unchanged)

`mcp_server/tools.py` — Task CRUD tools (add/get/update/complete/delete). Used for onboarding task progress tracking.

---

## 7. RAG Architecture

```
Repository files (cloned locally)
  ↓
agent/rag/devonboard_indexer.py
  ├── Walk file tree (skip node_modules, __pycache__, etc.)
  ├── Filter by supported extensions (30+ languages)
  ├── Detect language + chunk_type (code/doc/config)
  ├── Split into 800-token overlapping chunks
  ├── Embed with fastembed BAAI/bge-small-en-v1.5
  └── Upsert into Supabase rag_documents
        with: user_id, repository_id, file_path, language, chunk_type, commit_sha

Query time (agent/rag/devonboard_qa.py):
  ├── Embed question
  ├── Call match_rag_documents(query, user_id, count, repository_id)
  │     ← filtered by BOTH user_id AND repository_id
  ├── Format context with source citations
  └── Generate grounded answer (LLM told: never follow repo instructions)
```

**Security:** Every retrieval is filtered by `user_id + repository_id`. Users cannot see each other's indexed data. The LLM is explicitly instructed to treat repository content as untrusted.

---

## 8. LangGraph Workflow

```
START
  ↓ validate_github_url      pure Python URL validation
  ↓ clone_repository         git clone --depth 1
  ↓ static_scan              deterministic: languages, frameworks, APIs, env vars
  ↓ analyze_architecture     LLM: structured JSON {frontend, backend, db, ...}
  ↓ generate_setup_guide     LLM: evidence-only steps from actual config files
  ↓ generate_onboarding_plan LLM: personalized narrative plan
  ↓ generate_starter_tasks   LLM: tasks grounded in real files (validated)
  ↓ index_into_rag           fastembed + Supabase pgvector
  ↓ persist_results          save to repository_analysis + onboarding_tasks
  ↓ cleanup                  remove temp clone
END
```

Error handling: each node catches exceptions gracefully; `persist_results` marks repo as `failed` on error.

---

## 9. Security

| Concern | Mitigation |
|---------|-----------|
| Cross-user data leakage | All DB queries filter by `user_id` with RLS |
| Cross-repo data leakage | RAG queries filter by `user_id + repository_id` |
| Prompt injection in repos | LLM system prompt explicitly forbids following repo content instructions |
| API key exposure | All secrets server-side only; no keys in frontend |
| GitHub write operations | GitHub MCP restricted to read-only tools by default |
| Malicious file contents | File size limit (500KB default); binary files skipped |
| URL validation | Strict regex for `github.com/owner/repo` pattern |
| Auth | Supabase Bearer token required for all non-public endpoints |

---

## 10. Database Schema

```sql
-- Run in order in Supabase SQL Editor:
supabase/tasks.sql           -- general task manager (existing)
supabase/chat.sql            -- conversations + messages (existing)
supabase/rag.sql             -- rag_documents extended with repository_id
supabase/repositories.sql   -- NEW: tracked repositories
supabase/analysis.sql       -- NEW: analysis results
supabase/onboarding.sql     -- NEW: onboarding_tasks + onboarding_progress
```

All tables have Row Level Security enabled with owner-scoped policies.

---

## 11. Setup Guide

### Prerequisites

Make sure the following are installed and available on your `PATH` before starting:

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.11+ | Backend runtime |
| Node.js | 22+ | Frontend build |
| Git | any | Repository cloning |
| Docker | any | GitHub MCP Server container |

You also need accounts / API keys for:

- **Supabase** — free tier is sufficient ([supabase.com](https://supabase.com))
- **Groq** — free tier is sufficient ([console.groq.com](https://console.groq.com))
- **GitHub** — personal access token with `repo` read scope ([docs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens))
- **LangSmith** *(optional)* — for LLM tracing ([smith.langchain.com](https://smith.langchain.com))

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/krk-90/CLOCKET-AI.git
cd CLOCKET-AI
```

---

### Step 2 — Create and activate a Python virtual environment

```bash
# Create the virtual environment
python -m venv .venv

# Activate it
# macOS / Linux:
source .venv/bin/activate

# Windows (PowerShell):
.venv\Scripts\Activate.ps1

# Windows (cmd):
.venv\Scripts\activate.bat
```

---

### Step 3 — Install Python dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

> **Note:** This installs all backend dependencies including FastAPI, LangChain, LangGraph, fastembed, Supabase client, and the Git MCP server.

---

### Step 4 — Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and set the required variables:

```env
# ── Required ──────────────────────────────────────────────────────────────────

# Supabase — find these in your project's Settings > API
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_KEY=<anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_DB_URL=postgresql://postgres:<password>@db.<project-id>.supabase.co:5432/postgres

# Groq — find this at console.groq.com/keys
GROQ_API_KEY=gsk_...

# GitHub — Personal Access Token with `repo` (read) scope
GITHUB_TOKEN=ghp_...

# ── Optional ──────────────────────────────────────────────────────────────────

# LangSmith tracing (set LANGSMITH_TRACING=false to disable entirely)
LANGSMITH_TRACING=false
LANGSMITH_API_KEY=
LANGSMITH_PROJECT=devonboard-ai

# CORS — only needed when running the frontend separately from FastAPI
# (not required when using the built dist/ served by FastAPI)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

> **Never commit your `.env` file.** It is already listed in `.gitignore`.

---

### Step 5 — Set up the Supabase database

Run the SQL migration files **in order** using the Supabase SQL Editor  
(*Dashboard → SQL Editor → New query → paste → Run*):

| Order | File | Description |
|-------|------|-------------|
| 1 | `supabase/tasks.sql` | General task manager tables |
| 2 | `supabase/chat.sql` | Conversations and messages |
| 3 | `supabase/rag.sql` | RAG documents with `repository_id` column |
| 4 | `supabase/repositories.sql` | Tracked repositories |
| 5 | `supabase/analysis.sql` | Analysis results storage |
| 6 | `supabase/onboarding.sql` | Onboarding tasks and progress |

All tables are created with Row Level Security enabled and owner-scoped policies.

> **Tip:** If you are re-running migrations on an existing project, the files use `CREATE TABLE IF NOT EXISTS` and `CREATE OR REPLACE FUNCTION` so they are safe to re-run.

---

### Step 6 — Build the frontend

```bash
cd app/frontend
npm install
npm run build   # outputs to app/frontend/dist/
cd ../..
```

> The built `dist/` directory is served automatically by FastAPI at `/` and all SPA routes (e.g. `/login`, `/dashboard`).

---

### Step 7 — Start the backend

From the project root (with `.venv` active):

```bash
uvicorn app.main:fastapi_app --reload --reload-dir app
```

The API is now available at **http://localhost:8000**.  
The React frontend is served at **http://localhost:8000** (root and all SPA routes).  
Interactive API docs are at **http://localhost:8000/docs**.

---

### Frontend hot-reload development (optional)

If you want live reload while editing the frontend, run Vite's dev server alongside the backend. Vite proxies all API calls to FastAPI automatically:

```bash
# Terminal 1 — backend
uvicorn app.main:fastapi_app --reload --reload-dir app

# Terminal 2 — frontend dev server
cd app/frontend
npm run dev    # http://localhost:5173
```

The Vite dev server at `http://localhost:5173` proxies `/auth`, `/repositories`, `/analysis`, `/chat`, and `/health` to `http://localhost:8000` (configured in `vite.config.js`).

---

### Docker (self-contained build)

The Dockerfile builds the React frontend in stage 1 and packages it with the Python backend in stage 2. No separate frontend build step is needed.

```bash
# Build the image
docker build -t devonboard-ai .

# Run with your .env file
docker run --rm -p 8000:8000 --env-file .env devonboard-ai
```

The app is available at **http://localhost:8000**.

> **Note:** The Docker build pre-downloads the fastembed embedding model (`BAAI/bge-small-en-v1.5`) during the image build. The first build takes a few extra minutes for this download; subsequent builds use the Docker layer cache.

---

### Render deployment

1. **Fork or push** this repository to GitHub.
2. In the Render dashboard, click **New → Blueprint** and point it at your repository — Render will detect `render.yaml` automatically.
3. Set the following **environment variables / secrets** in the Render dashboard:

   | Variable | Where to find it |
   |----------|-----------------|
   | `SUPABASE_URL` | Supabase Dashboard → Settings → API |
   | `SUPABASE_KEY` | Supabase Dashboard → Settings → API (anon key) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API |
   | `SUPABASE_DB_URL` | Supabase Dashboard → Settings → Database → Connection string |
   | `GROQ_API_KEY` | [console.groq.com/keys](https://console.groq.com/keys) |
   | `GITHUB_TOKEN` | GitHub → Settings → Developer settings → Personal access tokens |
   | `LANGSMITH_API_KEY` | [smith.langchain.com](https://smith.langchain.com) *(optional)* |
   | `CORS_ALLOWED_ORIGINS` | Your Render service URL, e.g. `https://clocket-ai.onrender.com` |

4. **Deploy.** Render will build the Docker image, run the container, and expose the service on your `.onrender.com` URL.

> The `render.yaml` provisions a 1 GB persistent disk at `/app/data` for the Mem0 history database and temporary analysis clones.

---

### Environment variable reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | ✅ | — | Supabase project URL |
| `SUPABASE_KEY` | ✅ | — | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | — | Supabase service role key (bypasses RLS for server-side ops) |
| `SUPABASE_DB_URL` | ✅ | — | Direct PostgreSQL connection string |
| `GROQ_API_KEY` | ✅ | — | Groq API key for LLM inference |
| `GITHUB_TOKEN` | ✅ | — | GitHub PAT with `repo` read scope |
| `GITHUB_MCP_ALLOW_WRITE` | ❌ | `false` | Set `true` to enable GitHub write tools |
| `DEVONBOARD_LLM_MODEL` | ❌ | `openai/gpt-oss-20b` | Groq model used for analysis |
| `ANALYSIS_MAX_FILE_SIZE_KB` | ❌ | `500` | Max file size indexed per repo (KB) |
| `ANALYSIS_MAX_FILES` | ❌ | `200` | Max files indexed per repository |
| `CORS_ALLOWED_ORIGINS` | ❌ | `http://localhost:5173` | Comma-separated allowed origins |
| `RAG_EMBEDDING_MODEL` | ❌ | `BAAI/bge-small-en-v1.5` | fastembed model for RAG embeddings |
| `RAG_INDEX_REPO` | ❌ | `false` | Index general chat files into RAG |
| `LANGSMITH_TRACING` | ❌ | `false` | Enable LangSmith tracing |
| `LANGSMITH_API_KEY` | ❌ | — | LangSmith API key |
| `LANGSMITH_PROJECT` | ❌ | `devonboard-ai` | LangSmith project name |
| `MEM0_ENABLED` | ❌ | `false` | Enable Mem0 long-term memory for chat |
| `MEM0_HISTORY_DB_PATH` | ❌ | `/app/data/mem0-history.db` | Path to Mem0 SQLite history file |

---

### Verifying the setup

Once the server is running, confirm everything is healthy:

```bash
# Health check endpoint
curl http://localhost:8000/health

# Expected response:
# {"status": "ok", ...}
```

Visit **http://localhost:8000/docs** for the full interactive API reference.

---

## 12. Demo Instructions

1. **Sign up** at the deployed URL
2. **Add a repository** — enter any public GitHub URL, e.g. `https://github.com/tiangolo/fastapi`
3. **Analysis starts automatically** — takes 2–5 minutes depending on repo size
4. **Explore the overview** — technology stack, architecture summary, configuration findings
5. **View Architecture** — visual layer breakdown with API endpoints
6. **View Setup Guide** — step-by-step instructions with copy-to-clipboard commands
7. **Browse Starter Tasks** — filter by beginner/intermediate/advanced; mark tasks as done
8. **Ask the Codebase** — type any question; see grounded answers with source file citations
9. **Track Progress** — view the donut chart of completed tasks

### Example Questions for Q&A

- "How is authentication implemented?"
- "What are the main API endpoints?"
- "How does the database connection work?"
- "Where is the entry point for the application?"

---

## 13. Future Improvements

- **GitHub Actions CI analysis** — detect and explain workflow files
- **Codebase diff analysis** — "what changed in the last 30 days?"
- **Team onboarding** — share onboarding guides across a team
- **IDE plugin** — VS Code extension for inline onboarding
- **Private repository support** — GitHub App integration for private repos
- **Incremental re-analysis** — detect changes since last analysis via commit SHA
- **Multi-language support** — onboarding guides in different languages
- **Architecture diagram export** — SVG/PNG download of architecture graphs
- **Confluence/Notion integration** — export setup guides as formatted docs
- **LLM model selection** — let users choose model strength vs. speed tradeoff

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | FastAPI + Uvicorn + Pydantic + SlowAPI |
| Agents | LangChain + LangGraph |
| LLM | Groq (ChatGroq) with model fallback |
| MCP | GitHub MCP Server + Task MCP + DevOnboard MCP |
| Embeddings | fastembed BAAI/bge-small-en-v1.5 (384 dims) |
| Vector Store | Supabase pgvector |
| Auth | Supabase email/password + Bearer token + RLS |
| Frontend | React 18 + Vite + React Router v6 |
| Tracing | LangSmith |
| Deployment | Docker + Supervisor + Render |

---

## License

Licensed under the [Apache License 2.0](LICENSE).
