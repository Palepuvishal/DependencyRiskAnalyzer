# PLAN.md

## Implementation Plan

---

## 1. Architecture

Use a **four-layer architecture** (updated from three):

### 1. Frontend (Next.js)
- UI rendering (Dashboard, Workbench, Data Management)
- Graph visualization (Cytoscape.js)
- File upload + interaction layer

### 2. Backend API (Express or Next.js API routes)
- `/risk` → analysis + graph data
- `/projects` → project selector
- `/ingest` → dependency ingestion
- `/node/:id` → node drill-down (optional)

### 3. Processing Layer (NEW)
- Dependency parsing (package.json, etc.)
- Transitive dependency resolution
- Vulnerability enrichment (OSV API)
- Graph transformation logic

### 4. Graph Database (Neo4j)
- Stores dependency graph
- Supports traversal + explainability

---

## 2. Data Model

### Nodes

- `Project`
  - name

- `Library`
  - name

- `Version`
  - name

- `Vulnerability`
  - id (CVE)
  - severity

---

### Relationships

- `(Project)-[:USES]->(Library)`
- `(Library)-[:DEPENDS_ON]->(Library)`
- `(Library)-[:HAS_VERSION]->(Version)`
- `(Version)-[:HAS_VULNERABILITY]->(Vulnerability)`

---

## 3. Data Ingestion Pipeline (NEW - CORE)

### Step 1 — Input
Frontend uploads:
- package.json
- OR dependency tree (npm ls --json)

---

### Step 2 — Parsing
Backend extracts:
- libraries
- versions
- dependency tree

---

### Step 3 — Graph Construction
Insert into Neo4j:
- Project node
- Library nodes
- Version nodes
- Relationships (USES, DEPENDS_ON, HAS_VERSION)

---

### Step 4 — Vulnerability Detection (CRITICAL)

For each (library, version):

Call:

POST https://api.osv.dev/v1/query


If vulnerabilities exist:
- Create `Vulnerability` nodes
- Link:
  `(Version)-[:HAS_VULNERABILITY]->(Vulnerability)`

---

### Step 5 — Storage
Graph now contains:
- Full dependency tree
- Vulnerability mapping

---

## 4. Query Strategy

### A. Dependency Traversal
Traverse:

Project → Library → ... → Version → Vulnerability


---

### B. Vulnerability Discovery
Return:
- All reachable vulnerabilities
- Associated libraries + versions

---

### C. Explainability (IMPORTANT)
Return full paths:

Project → Library → ... → Vulnerability


---

### D. Aggregation (DONE IN BACKEND, NOT CYPHER)
- Group by vulnerability
- Count paths
- Compute summary

---

## 5. API Design

### 1. GET /risk?project=MyApp
Returns:
- summary
- vulnerabilities (grouped)
- graph (nodes + edges)
- index (node → vulnerabilities)

---

### 2. GET /projects
Returns:
- list of available projects

---

### 3. POST /ingest
Input:
- project name
- dependency file

Tasks:
- parse dependencies
- build graph
- enrich with vulnerabilities

---

### 4. GET /node/:id (optional)
Returns:
- node details
- connected vulnerabilities
- dependency info

---

## 6. Backend Modules

- `db/neo4j.js`
  - connection + query execution

- `services/ingest.js` (NEW)
  - parse dependencies
  - call OSV
  - build graph

- `services/risk.js`
  - transform Neo4j output
  - build summary + graph JSON

- `routes/risk.js`
- `routes/projects.js`
- `routes/ingest.js`

---

## 7. Frontend Modules

### Core Screens (based on your design)

- Dashboard
- Workbench (Graph + Table)
- Data Management (Upload)

---

### Components

- `GraphView.tsx`
  - Cytoscape graph

- `RiskPanel.tsx`
  - summary + critical nodes

- `VulnerabilityTable.tsx`
  - list view

- `UploadPanel.tsx`
  - file upload → /ingest

- `ProjectSelector.tsx`

---

## 8. Graph Rendering Strategy

- Nodes:
  - colored by type + severity

- Edges:
  - directional (USES, DEPENDS_ON)

- Interaction:
  - click node → highlight paths
  - click vulnerability → show paths

---

## 9. Milestones (UPDATED)

### Milestone 1 — Graph Foundation ✅ (DONE)
- Neo4j schema
- Basic traversal
- /risk API

---

### Milestone 2 — Data Pipeline (CURRENT)
- /ingest API
- dependency parsing
- OSV integration
- vulnerability insertion

---

### Milestone 3 — UI Integration
- Next.js setup
- connect /risk
- render table + summary

---

### Milestone 4 — Graph UI
- Cytoscape integration
- node coloring
- path highlighting

---

### Milestone 5 — Interaction Layer
- node click → filter
- vulnerability drill-down
- side panel

---

### Milestone 6 — Polish
- loading states
- empty states
- demo datasets

---

## 10. Suggested Tech Stack

- Frontend:
  - Next.js
  - Tailwind CSS
  - shadcn/ui

- Graph:
  - Cytoscape.js

- Backend:
  - Express

- Database:
  - Neo4j

- External API:
  - OSV.dev (vulnerability data)

---

## 11. Implementation Notes

- DO NOT aggregate in Cypher
- Always transform in backend
- Keep graph IDs meaningful (not numeric)
- Deduplicate nodes + edges
- Keep ingestion idempotent (avoid duplicates)

---

## 12. Demo Flow (UPDATED)

1. User uploads dependency file
2. Backend parses dependencies
3. Backend builds dependency graph
4. Backend fetches vulnerabilities (OSV)
5. Graph is stored in Neo4j
6. User selects project
7. `/risk` returns analysis
8. UI renders:
   - graph
   - table
   - risk panel

---

## 13. Delivery Order (UPDATED)

1. `/ingest` API
2. OSV integration
3. Graph enrichment
4. `/projects` API
5. Frontend setup
6. Graph rendering
7. Interaction layer