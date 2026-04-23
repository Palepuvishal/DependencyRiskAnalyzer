# Dependency Risk Analyzer

> A graph-based security analyzer that models software dependencies, traces transitive vulnerability exposure, and explains exactly *why* a project is at risk — down to the full path from application to vulnerable package.

![Stack](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![Stack](https://img.shields.io/badge/Node.js-20-green?logo=node.js) ![Stack](https://img.shields.io/badge/Neo4j-Aura-blue?logo=neo4j) ![Stack](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)

---

## Table of Contents

1. [What It Does](#what-it-does)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Repository Structure](#repository-structure)
5. [Local Development (No Docker)](#local-development-no-docker)
6. [Running with Docker](#running-with-docker)
7. [API Reference](#api-reference)
8. [Graph Model](#graph-model)
9. [Supported Dependency Formats](#supported-dependency-formats)
10. [Deploying to AWS](#deploying-to-aws)

---

## What It Does

- Ingests dependency files (`package.json`, `npm ls --json`, `requirements.txt`, `go.mod`) and builds a live graph in Neo4j.
- Queries the [OSV API](https://osv.dev) for real CVEs against every library version — ecosystem-aware (`npm`, `PyPI`, `Go`).
- Traverses the graph to find **all reachable vulnerability paths**, including transitive ones (`Project → express → lodash → CVE-2021-23337`).
- Returns prioritized, deduplicated risk paths with severity scores.
- Renders an interactive dependency graph and inspector panel in the browser.

> Flat vulnerability scanners tell you *what* is vulnerable. This project shows *how* the risk reaches your codebase — and gives you an exact path to trace it.

---

## Architecture

```
┌────────────────────────────────────────────────────┐
│                   Browser (Next.js)                │
│   Graph View (Cytoscape.js) + Inspector Panel      │
└───────────────────────┬────────────────────────────┘
                        │ REST (HTTP)
┌───────────────────────▼────────────────────────────┐
│               Backend (Express / Node.js)          │
│   /ingest  /risk  /projects  /node  /ingestions    │
└───────────────────────┬────────────────────────────┘
                        │ Neo4j Bolt
┌───────────────────────▼────────────────────────────┐
│                 Neo4j Aura (Cloud)                 │
│   Project → Library → Version → Vulnerability      │
└────────────────────────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼────────────────────────────┐
│              OSV API (osv.dev)                     │
│   CVE lookup per package + ecosystem               │
└────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Graph Visualization | Cytoscape.js |
| Backend | Node.js 20, Express |
| Database | Neo4j Aura (cloud-hosted) |
| Vulnerability Data | OSV API (osv.dev) |
| Containerization | Docker, Docker Compose |

---

## Repository Structure

```
DependencyRiskAnalyzer/
├── backend/
│   ├── src/
│   │   ├── db.js               # Neo4j driver + query runner
│   │   ├── index.js            # Express server entry point
│   │   ├── seed.js             # Demo dataset seeder
│   │   └── routes/
│   │       ├── ingest.js       # POST /ingest — file upload + OSV scan
│   │       ├── risk.js         # GET  /risk  — vulnerability path query
│   │       ├── projects.js     # GET  /projects
│   │       ├── node.js         # GET  /node/:id
│   │       └── ingestions.js   # GET  /ingestions
│   ├── .env                    # Local secrets (gitignored)
│   ├── .dockerignore
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js App Router pages
│   │   ├── components/         # GraphView, NodeDetailPanel, etc.
│   │   └── lib/                # API client, ProjectContext
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── next.config.ts
│   └── package.json
├── docker-compose.yaml
├── .env                        # Root env for Docker Compose (gitignored)
├── .env.example                # Template — copy to .env and fill in
└── README.md
```

---

## Local Development (No Docker)

### Prerequisites

- Node.js 20+
- A [Neo4j Aura](https://neo4j.com/cloud/platform/aura-graph-database/) free-tier instance

### 1. Clone and configure

```bash
git clone https://github.com/Palepuvishal/DependencyRiskAnalyzer.git
cd DependencyRiskAnalyzer
```

Create `backend/.env`:
```env
NEO4J_URI=neo4j+s://<your-aura-instance>.databases.neo4j.io
NEO4J_USER=<your-username>
NEO4J_PASSWORD=<your-password>
PORT=3001
```

### 2. Seed the database

```bash
cd backend
npm install
node src/seed.js
```

### 3. Start the backend

```bash
npm run dev     # uses node --watch for hot reload
```

Backend runs at `http://localhost:3001`

### 4. Start the frontend

```bash
cd ../frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`

---

## Running with Docker

### Prerequisites

- Docker Desktop installed and running

### 1. Set up environment

```bash
cp .env.example .env
# Edit .env and fill in your Neo4j Aura credentials
```

### 2. Build and start

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:3001 |

### 3. Stop

```bash
docker compose down
```

> **Note:** Neo4j Aura is cloud-hosted — no database container is needed.

---

## API Reference

All endpoints are served from `http://localhost:3001`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Simple liveness check |
| `GET` | `/health/detailed` | Stats from Neo4j |
| `GET` | `/projects` | List all projects in the graph |
| `GET` | `/risk?project=MyApp` | Full vulnerability paths for a project |
| `POST` | `/ingest` | Upload a dependency file + run OSV scan |
| `GET` | `/ingestions` | List past ingestion runs |
| `GET` | `/node/:id` | Fetch a single node's properties |

### Ingest example

```bash
curl -X POST http://localhost:3001/ingest \
  -F "projectName=MyApp" \
  -F "dependencyFile=@package.json"
```

---

## Graph Model

```
(Project)-[:USES]->(Library)
(Library)-[:DEPENDS_ON]->(Library)   # transitive
(Library)-[:HAS_VERSION]->(Version)
(Version)-[:HAS_VULNERABILITY]->(Vulnerability)
(Project)-[:HAS_INGESTION]->(Ingestion)
```

**Node properties:**

| Label | Key properties |
|---|---|
| `Project` | `name` |
| `Library` | `name`, `language`, `ecosystem` |
| `Version` | `number`, `name`, `ecosystem` |
| `Vulnerability` | `id`, `cve_id`, `severity`, `title` |
| `Ingestion` | `project`, `timestamp`, `status`, `ecosystem` |

---

## Supported Dependency Formats

| File | Ecosystem | Notes |
|---|---|---|
| `package.json` | npm | Flat direct dependencies |
| `npm ls --json` output | npm | Full nested tree (recursive) |
| `requirements.txt` | PyPI | Pinned `==` versions only |
| `go.mod` | Go | `require` blocks and single-line |

---

## Deploying to AWS

Below is the recommended path to production on AWS. You can scale each component independently.

### Option A — AWS ECS + Fargate (recommended)

This is the simplest fully-managed container deployment.

#### Step 1 — Push images to ECR

```bash
# Authenticate Docker with ECR
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.ap-south-1.amazonaws.com

# Create repos
aws ecr create-repository --repository-name dra-backend
aws ecr create-repository --repository-name dra-frontend

# Build + tag + push backend
docker build -t dra-backend ./backend
docker tag dra-backend:latest <account-id>.dkr.ecr.ap-south-1.amazonaws.com/dra-backend:latest
docker push <account-id>.dkr.ecr.ap-south-1.amazonaws.com/dra-backend:latest

# Build + tag + push frontend
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  -t dra-frontend ./frontend
docker tag dra-frontend:latest <account-id>.dkr.ecr.ap-south-1.amazonaws.com/dra-frontend:latest
docker push <account-id>.dkr.ecr.ap-south-1.amazonaws.com/dra-frontend:latest
```

#### Step 2 — Store secrets in AWS Secrets Manager

```bash
aws secretsmanager create-secret \
  --name dra/neo4j \
  --secret-string '{"NEO4J_URI":"neo4j+s://...","NEO4J_USER":"...","NEO4J_PASSWORD":"..."}'
```

Reference this secret in your ECS Task Definition — never pass credentials as plain env vars.

#### Step 3 — Create an ECS Cluster and Task Definitions

- Create a **Fargate cluster** in the AWS console or via CLI.
- Create two **Task Definitions** (one for backend, one for frontend).
- Set container port `3001` for backend, `3000` for frontend.
- Inject the Secrets Manager secret as environment variables in the backend task.

#### Step 4 — Set up an Application Load Balancer (ALB)

- Create an **ALB** with two target groups:
  - `/api/*` → backend service on port 3001
  - `/*` → frontend service on port 3000
- Attach an **ACM SSL certificate** for HTTPS.
- The ALB public DNS becomes your app URL.

#### Step 5 — Update `NEXT_PUBLIC_API_URL`

At build time, set this to your ALB backend URL:
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```
This is a **build-time** variable — you must rebuild the frontend image if it changes.

---

### Option B — AWS App Runner (simplest, no infra)

App Runner auto-scales containers with zero cluster management.

1. Push images to ECR (same as Step 1 above).
2. Create two **App Runner services** — one for backend (port 3001), one for frontend (port 3000).
3. Set environment variables directly in the App Runner console.
4. Point a **custom domain** at each service.

> App Runner is ideal for demos and small teams. Switch to ECS Fargate when you need VPC control, private networking, or IAM task roles.

---

### AWS Checklist

- [ ] Images pushed to ECR
- [ ] Secrets stored in AWS Secrets Manager (not env vars)
- [ ] Neo4j Aura whitelist updated with your ECS/App Runner IP range (or set to 0.0.0.0/0 for testing)
- [ ] ALB with HTTPS certificate (ACM)
- [ ] `NEXT_PUBLIC_API_URL` set to your backend's public URL at **build time**
- [ ] ECS Task Role has `secretsmanager:GetSecretValue` permission
- [ ] Health checks configured (`/health` for backend, `/` for frontend)
- [ ] CloudWatch log groups created for both services

---

## Demo Statement

> This project demonstrates graph-native security analysis by tracing how vulnerabilities propagate through dependency chains and by explaining the exact path from the application to the affected package.
