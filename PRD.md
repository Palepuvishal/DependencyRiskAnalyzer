# PRD.md

## Product Name
Dependency Risk Analyzer

## Problem Statement
Modern applications depend on deep chains of third-party packages. Conventional vulnerability scanners often return flat results that do not explain how a vulnerability reaches the application. This makes prioritization difficult and weakens trust in the output.

## Product Vision
Build a graph-based analyzer that shows:
- which dependencies expose a project to risk,
- how that risk propagates through transitive relationships,
- which nodes are structurally critical,
- and why a vulnerability matters.

## Goals
1. Model dependencies as a graph.
2. Trace transitive vulnerability paths from a project to affected packages.
3. Rank critical dependency nodes.
4. Present results in a visual, explainable UI.
5. Support a demo-ready workflow using synthetic or curated data.

## Non-Goals for MVP
- Live integration with external CVE feeds.
- Automated remediation suggestions.
- Multi-project fleet analysis.
- Enterprise authentication and role management.
- Large-scale package ecosystem synchronization.

## Target Users
- Engineering students building a security or graph systems project.
- Developers evaluating supply-chain exposure.
- Interview reviewers looking for depth of reasoning and explainability.

## Core User Stories
1. As a user, I can load a project dependency graph.
2. As a user, I can see which dependencies are vulnerable, directly or indirectly.
3. As a user, I can inspect the path from my project to a vulnerability.
4. As a user, I can identify the most critical libraries in the graph.
5. As a user, I can view a risk summary with severity and blast-radius context.

## Functional Requirements
### Graph Modeling
- Represent nodes for Project, Library, Version, and Vulnerability.
- Represent edges for USES, DEPENDS_ON, HAS_VERSION, and HAS_VULNERABILITY.

### Risk Analysis
- Find all transitive dependencies reachable from a project.
- Identify vulnerabilities attached to reachable versions.
- Return full paths for explainability.
- Compute a basic risk score from vulnerability severity and graph centrality.

### Visualization
- Render the dependency graph in the frontend.
- Highlight vulnerable nodes in red.
- Highlight medium-risk nodes in yellow.
- Highlight safe or unaffected nodes in green.

### Reporting
- Display the number of vulnerable libraries.
- Display the most critical dependency node.
- Display the paths leading to each vulnerability.

## Non-Functional Requirements
- Queries should be parameterized.
- Results should be deterministic for the same dataset.
- The API should return structured JSON.
- The UI should remain responsive for small-to-medium demo graphs.
- The system should be understandable in an interview setting.

## Data Assumptions
- Initial data can be synthetic.
- Package metadata may be simplified.
- Severity may be represented with a small categorical scale such as low / medium / high / critical.

## Success Metrics
- A user can explain a vulnerability path in under 30 seconds.
- The graph view and insights panel agree on the same risk findings.
- The demo is understandable without external documentation.
- The system clearly demonstrates transitive dependency reasoning.

## Risks and Constraints
- Graph quality depends on the quality of imported dependency data.
- Risk scoring can be oversimplified if severity is not normalized.
- Large graphs may require traversal limits and pagination.

## MVP Deliverable
A Next.js frontend, a backend API, and a Neo4j graph model that together answer:
“Which vulnerabilities affect this project, and through what path do they reach it?”
