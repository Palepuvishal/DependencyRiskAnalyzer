const express = require("express");
const { runQuery } = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
  const projectName = req.query.project || "MyApp";

  try {
    const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };

    // ── Query 1: Full dependency graph (ALL libraries, with or without vulns) ──
    // Paths can end at any Library or Version — no vulnerability required.
    const graphCypher = `
      MATCH (proj:Project {name: $projectName})-[:USES|DEPENDS_ON*]->(lib:Library)
      OPTIONAL MATCH (lib)-[:HAS_VERSION]->(ver:Version)
      RETURN
        lib.name            AS libName,
        COALESCE(lib.language, 'unknown')               AS language,
        COALESCE(lib.ecosystem, ver.ecosystem, 'npm')   AS ecosystem,
        COALESCE(ver.number, ver.name)                  AS version,
        ver IS NOT NULL AS hasVersion
    `;

    // ── Query 2: Vulnerability paths (only paths that end with a CVE) ──────────
    const vulnCypher = `
      MATCH p = (proj:Project {name: $projectName})
          -[:USES|DEPENDS_ON*]->(lib:Library)
          -[:HAS_VERSION]->(ver:Version)
          -[:HAS_VULNERABILITY]->(v:Vulnerability)
      WITH DISTINCT p, v, lib, ver
      RETURN
        COALESCE(v.id, v.cve_id)                        AS vulnerabilityId,
        COALESCE(v.severity, 'MEDIUM')                  AS severity,
        lib.name                                         AS library,
        COALESCE(lib.language, 'unknown')               AS language,
        COALESCE(lib.ecosystem, ver.ecosystem, 'npm')   AS ecosystem,
        COALESCE(ver.number, ver.name)                  AS version,
        nodes(p)                                         AS pathNodes,
        relationships(p)                                 AS pathRels
    `;

    const [graphRecords, vulnRecords] = await Promise.all([
      runQuery(graphCypher, { projectName }),
      runQuery(vulnCypher, { projectName }),
    ]);

    // ── Build graph node/edge maps from Query 1 ───────────────────────────────
    const nodeMap = new Map();
    const edgeMap = new Map();

    // Always add the project node first
    nodeMap.set(projectName, {
      id: projectName,
      label: projectName,
      type: "Project",
      role: "Project",
      severity: "NONE",
      isEntry: true,
    });

    graphRecords.forEach((record) => {
      const libName  = record.get("libName");
      const language = record.get("language") || "unknown";
      const ecosystem = record.get("ecosystem") || "npm";
      const version  = record.get("version");

      if (!libName) return;

      // Library node
      if (!nodeMap.has(libName)) {
        nodeMap.set(libName, {
          id: libName,
          label: libName,
          type: "Library",
          role: "Library",
          severity: "NONE",
          language,
          ecosystem,
        });
      }

      // Version node (if present)
      if (version) {
        const verId = version; // use version number as display ID
        if (!nodeMap.has(verId)) {
          nodeMap.set(verId, {
            id: verId,
            label: verId,
            type: "Version",
            role: "Version",
            severity: "NONE",
          });
        }
        // Library → Version edge
        const lvKey = `${libName}-HAS_VERSION-${verId}`;
        if (!edgeMap.has(lvKey)) {
          edgeMap.set(lvKey, { source: libName, target: verId, type: "HAS_VERSION" });
        }
      }
    });

    // ── Build edges for USES / DEPENDS_ON from the dependency traversal ───────
    // We need a second pass to get the actual relationship structure.
    const edgeStructCypher = `
      MATCH (proj:Project {name: $projectName})-[r1:USES]->(lib:Library)
      RETURN $projectName AS source, lib.name AS target, 'USES' AS type
      UNION
      MATCH (proj:Project {name: $projectName})-[:USES|DEPENDS_ON*]->(parent:Library)
             -[r2:DEPENDS_ON]->(child:Library)
      RETURN parent.name AS source, child.name AS target, 'DEPENDS_ON' AS type
    `;
    const edgeRecords = await runQuery(edgeStructCypher, { projectName });
    edgeRecords.forEach((record) => {
      const source = record.get("source");
      const target = record.get("target");
      const type   = record.get("type");
      if (source && target) {
        const key = `${source}-${type}-${target}`;
        if (!edgeMap.has(key)) {
          edgeMap.set(key, { source, target, type });
        }
      }
    });

    // ── Process vulnerability records (Query 2) ───────────────────────────────
    const vulnMap = new Map();

    vulnRecords.forEach((record) => {
      const vulnIdFromDB = record.get("vulnerabilityId");
      const library      = record.get("library");
      const version      = record.get("version");
      const language     = record.get("language") || "unknown";
      const ecosystem    = record.get("ecosystem") || "npm";
      const pathSeverity = (record.get("severity") || "MEDIUM").toUpperCase();

      const pathNodesRaw = record.get("pathNodes");
      const pathRelsRaw  = record.get("pathRels");

      const orderedNodeIds = [];
      const internalToMeaningfulId = new Map();
      let isPathValid = true;

      // Process nodes in the path
      pathNodesRaw.forEach((n) => {
        const internalId = n.identity.toString();
        const type = n.labels ? n.labels[0] : "Unknown";

        let meaningfulId = null;
        if (type === "Project" || type === "Library") {
          meaningfulId = n.properties.name;
        } else if (type === "Version") {
          meaningfulId = n.properties.number || n.properties.name;
        } else if (type === "Vulnerability") {
          meaningfulId = n.properties.id || n.properties.cve_id;
        }

        if (!meaningfulId || meaningfulId === "unknown" || meaningfulId === "UNKNOWN-CVE") {
          isPathValid = false;
          return;
        }

        internalToMeaningfulId.set(internalId, meaningfulId);
        orderedNodeIds.push(meaningfulId);

        // Add to nodeMap (may already exist from graph query — only update severity)
        if (!nodeMap.has(meaningfulId)) {
          nodeMap.set(meaningfulId, {
            id: meaningfulId,
            label: meaningfulId,
            type,
            role: type,
            severity: "NONE",
            ...(type === "Library" ? { language, ecosystem } : {}),
            ...(type === "Project" ? { isEntry: true } : {}),
          });
        }

        // Propagate severity upward through the path
        const currentNode = nodeMap.get(meaningfulId);
        if (severityOrder[pathSeverity] > severityOrder[currentNode.severity]) {
          currentNode.severity = pathSeverity;
        }
      });

      if (!isPathValid) return;

      // Add vulnerability-path edges (may duplicate graph edges — deduped by key)
      pathRelsRaw.forEach((r) => {
        const sourceId = internalToMeaningfulId.get(r.start.toString());
        const targetId = internalToMeaningfulId.get(r.end.toString());
        if (sourceId && targetId) {
          const edgeKey = `${sourceId}-${r.type}-${targetId}`;
          if (!edgeMap.has(edgeKey)) {
            edgeMap.set(edgeKey, { source: sourceId, target: targetId, type: r.type });
          }
        }
      });

      // Group vulnerabilities
      if (!vulnIdFromDB) return;

      if (!vulnMap.has(vulnIdFromDB)) {
        vulnMap.set(vulnIdFromDB, {
          id: vulnIdFromDB,
          severity: pathSeverity,
          severityScore: severityOrder[pathSeverity] || 0,
          library: library || "UNIDENTIFIED-LIBRARY",
          version: version || "VERSION-MISSING",
          ecosystem,
          language,
          reachable: true,
          pathCount: 0,
          paths: [],
          uniquePathKeys: new Set(),
        });
      }

      const vulnObj = vulnMap.get(vulnIdFromDB);
      const pathKey = orderedNodeIds.join("->");
      if (!vulnObj.uniquePathKeys.has(pathKey)) {
        vulnObj.paths.push(orderedNodeIds);
        vulnObj.pathCount++;
        vulnObj.uniquePathKeys.add(pathKey);
      }
    });

    // ── Extra info ────────────────────────────────────────────────────────────
    const extraInfoRecord = await runQuery(
      `MATCH (p:Project) WITH count(p) AS totalProjects
       OPTIONAL MATCH (proj:Project {name: $projectName})-[:HAS_INGESTION]->(i:Ingestion)
       RETURN totalProjects, max(toString(i.timestamp)) AS lastIngestionTime`,
      { projectName }
    );

    const totalProjects     = extraInfoRecord[0].get("totalProjects");
    const lastIngestionTime = extraInfoRecord[0].get("lastIngestionTime");

    // ── Final aggregation ─────────────────────────────────────────────────────
    const vulnerabilities = Array.from(vulnMap.values())
      .map((v) => {
        const uniquePaths = [];
        const seenSignatures = new Set();
        v.paths.forEach((path) => {
          const signature = path.join("->");
          if (!seenSignatures.has(signature)) {
            seenSignatures.add(signature);
            uniquePaths.push(path);
          }
        });
        uniquePaths.sort((a, b) => a.length - b.length);
        delete v.uniquePathKeys;
        return { ...v, paths: uniquePaths, pathCount: uniquePaths.length };
      })
      .sort((a, b) =>
        b.severityScore !== a.severityScore
          ? b.severityScore - a.severityScore
          : b.pathCount - a.pathCount
      );

    const totalLibraries = Array.from(nodeMap.values()).filter(
      (n) => n.type === "Library"
    ).length;

    res.json({
      summary: {
        totalVulnerabilities: vulnerabilities.length,
        critical: vulnerabilities.filter((v) => v.severity === "CRITICAL").length,
        high:     vulnerabilities.filter((v) => v.severity === "HIGH").length,
        medium:   vulnerabilities.filter((v) => v.severity === "MEDIUM").length,
        totalLibraries,
        totalProjects,
        criticalPaths: vulnerabilities.filter((v) => v.pathCount > 1).length,
        lastIngestionTime: lastIngestionTime || new Date().toISOString(),
      },
      vulnerabilities,
      graph: {
        nodes: Array.from(nodeMap.values()),
        edges: Array.from(edgeMap.values()),
      },
    });
  } catch (err) {
    console.error("Error fetching risk data:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
