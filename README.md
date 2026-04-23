# Dependency Risk Analyzer

A graph-based dependency security analyzer that traces how vulnerabilities propagate through transitive package relationships.

## What it does
- Models software dependencies as a graph.
- Finds vulnerabilities that affect a project through direct or indirect dependencies.
- Explains the full path from project to vulnerable library.
- Highlights critical dependency nodes and blast radius.

## Why this project matters
Flat vulnerability scanners tell you *what* is vulnerable. This project shows *how* the risk reaches your codebase. That makes the result easier to trust, explain, and prioritize.

## MVP Scope
- Synthetic or curated demo dataset
- Neo4j-backed graph traversal
- Next.js frontend
- Visual graph rendering
- Risk summary and path explanation

## Tech Stack
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Graph DB**: Neo4j
- **Visualization**: Cytoscape.js or Neovis.js
- **Validation**: Zod
- **Testing**: Vitest or Jest

## Repository Structure
```text
.
├── AGENTS.md
├── PRD.md
├── PLAN.md
└── README.md
```

## How it works
1. The user selects a project.
2. The backend queries Neo4j for dependency chains.
3. Vulnerabilities attached to reachable versions are collected.
4. The backend returns paths, counts, and risk signals.
5. The frontend renders the graph and insight panel.

## Core Query Shape
```cypher
MATCH path = (p:Project {name: $projectName})-[:USES|DEPENDS_ON*]->(l:Library)
OPTIONAL MATCH (l)-[:HAS_VERSION]->(:Version)-[:HAS_VULNERABILITY]->(v:Vulnerability)
RETURN path, collect(DISTINCT v) AS vulnerabilities
```

## Expected Output
- Vulnerable libraries
- Full explanation paths
- Critical dependencies
- Risk score or risk tier

## Limitations
- Uses a small or synthetic dataset initially
- Does not require real-time CVE ingestion in MVP
- Risk scoring is intentionally simple at first

## Implementation Order
1. Define schema and sample data
2. Add Cypher traversal queries
3. Build backend API
4. Build graph visualization
5. Add summaries and documentation

## Demo Statement
> This project demonstrates graph-native security analysis by tracing how vulnerabilities propagate through dependency chains and by explaining the exact path from the application to the affected package.
