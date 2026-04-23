# AGENTS.md

## Purpose
This repository implements a **Dependency Risk Analyzer**: a graph-based system that models software dependencies, traces transitive vulnerability exposure, and explains why a project is at risk.

## Project Rules
1. Prefer graph-native reasoning over recursive application logic.
2. Keep the initial scope focused on a single-project dependency graph and vulnerability propagation.
3. Treat explainability as a first-class feature: every risk finding should be traceable to a path.
4. Use synthetic or curated sample data for the MVP unless real package ingestion is explicitly added later.
5. Keep the codebase modular so the graph engine, API layer, and UI can evolve independently.

## Behavioral Guidelines for AI Contributors
- Make minimal, targeted changes.
- Preserve the graph schema unless a change is explicitly required.
- When adding a feature, update the graph query, API response, and UI state together.
- Prefer explicit Cypher queries over hidden business logic.
- Document any assumption that affects risk scoring or path interpretation.

## Coding Constraints
- Backend: keep Neo4j queries parameterized.
- Frontend: keep graph visualization and insight panels decoupled.
- Do not hardcode security severity logic in multiple places.
- Add input validation at the API boundary.
- Keep demo data reproducible.

## Definition of Done
A change is complete only if:
- the graph model still matches the PRD,
- the API returns explainable risk paths,
- the UI shows both graph and insight summary,
- and the README remains accurate.

## Out of Scope for MVP
- Real-time CVE ingestion
- Multi-tenant access control
- Full package registry synchronization
- Production-scale scoring calibration
