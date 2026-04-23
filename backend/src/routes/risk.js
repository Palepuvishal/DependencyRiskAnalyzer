const express = require("express");
const { runQuery } = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
  const projectName = req.query.project || "MyApp";

  try {
    const cypher = `
      MATCH p = (proj:Project {name: $projectName})
          -[:USES|DEPENDS_ON*]->(lib:Library)
          -[:HAS_VERSION]->(ver:Version)
          -[:HAS_VULNERABILITY]->(v:Vulnerability)
      WITH DISTINCT p, v, lib, ver
      RETURN 
        COALESCE(v.id, v.cve_id) AS vulnerabilityId,
        COALESCE(v.severity, 'MEDIUM') AS severity,
        lib.name AS library,
        COALESCE(ver.number, ver.name) AS version,
        nodes(p) AS pathNodes,
        relationships(p) AS pathRels
    `;

    const records = await runQuery(cypher, { projectName });

    const vulnMap = new Map();
    const nodeMap = new Map();
    const edgeMap = new Map();

    const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };

    records.forEach(record => {
      const vulnIdFromDB = record.get("vulnerabilityId");
      const library = record.get("library");
      const version = record.get("version");
      const pathSeverity = (record.get("severity") || "MEDIUM").toUpperCase();
      
      const pathNodesRaw = record.get("pathNodes");
      const pathRelsRaw = record.get("pathRels");

      const orderedNodeIds = [];
      const internalToMeaningfulId = new Map();
      let isPathValid = true;

      // 1. Process Nodes with Strict Validation
      pathNodesRaw.forEach(n => {
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

        // REJECT: If any node in the path is unidentified or contains a placeholder, the entire path is invalid
        if (!meaningfulId || meaningfulId === "unknown" || meaningfulId === "UNKNOWN-CVE") {
          isPathValid = false;
          return;
        }

        internalToMeaningfulId.set(internalId, meaningfulId);
        orderedNodeIds.push(meaningfulId);

        if (!nodeMap.has(meaningfulId)) {
          nodeMap.set(meaningfulId, {
            id: meaningfulId,
            label: meaningfulId,
            type: type,
            role: type,
            severity: "NONE"
          });
          if (type === "Project") nodeMap.get(meaningfulId).isEntry = true;
        }

        // Propagate Severity
        const currentNode = nodeMap.get(meaningfulId);
        if (severityOrder[pathSeverity] > severityOrder[currentNode.severity]) {
          currentNode.severity = pathSeverity;
        }
      });

      if (!isPathValid) return; // Abort processing this path

      // 2. Process Edges
      pathRelsRaw.forEach(r => {
        const sourceId = internalToMeaningfulId.get(r.start.toString());
        const targetId = internalToMeaningfulId.get(r.end.toString());
        
        if (sourceId && targetId) {
          const edgeKey = `${sourceId}-${r.type}-${targetId}`;
          if (!edgeMap.has(edgeKey)) {
            edgeMap.set(edgeKey, {
              source: sourceId,
              target: targetId,
              type: r.type
            });
          }
        }
      });

      // 3. Process Vulnerability Grouping (Strict CVE focus)
      const actualVulnId = vulnIdFromDB; 
      if (!actualVulnId) return; // Rejected if no explicit CVE ID

      if (!vulnMap.has(actualVulnId)) {
        vulnMap.set(actualVulnId, {
          id: actualVulnId,
          severity: pathSeverity,
          severityScore: severityOrder[pathSeverity] || 0,
          library: library || "UNIDENTIFIED-LIBRARY",
          version: version || "VERSION-MISSING",
          reachable: true,
          pathCount: 0,
          paths: []
        });
      }

      const vulnObj = vulnMap.get(actualVulnId);
      
      // Path Deduplication Logic
      if (!vulnObj.uniquePathKeys) {
        vulnObj.uniquePathKeys = new Set();
      }
      
      const pathKey = orderedNodeIds.join("->");
      if (!vulnObj.uniquePathKeys.has(pathKey)) {
        vulnObj.paths.push(orderedNodeIds);
        vulnObj.pathCount++;
        vulnObj.uniquePathKeys.add(pathKey);
      }
    });

    const extraInfoRecord = await runQuery(`
      MATCH (p:Project) WITH count(p) AS totalProjects
      OPTIONAL MATCH (proj:Project {name: $projectName})-[:HAS_INGESTION]->(i:Ingestion)
      RETURN totalProjects, max(toString(i.timestamp)) AS lastIngestionTime
    `, { projectName });

    const totalProjects = extraInfoRecord[0].get("totalProjects");
    const lastIngestionTime = extraInfoRecord[0].get("lastIngestionTime");

    const summary = {
      totalVulnerabilities: vulnMap.size,
      critical: 0,
      high: 0,
      medium: 0,
      totalLibraries: Array.from(nodeMap.values()).filter(n => n.type === 'Library').length,
      totalProjects,
      criticalPaths: Array.from(vulnMap.values()).filter(v => v.pathCount > 1).length,
      lastIngestionTime
    };

    vulnMap.forEach(v => {
      if (v.severity === 'CRITICAL') summary.critical++;
      if (v.severity === 'HIGH') summary.high++;
      if (v.severity === 'MEDIUM') summary.medium++;
      
      delete v.uniquePathKeys;
    });

    // 4. Final Aggregation with Strict Deduplication & Prioritization
    const vulnerabilities = Array.from(vulnMap.values()).map(v => {
      const uniquePaths = [];
      const seenSignatures = new Set();
      
      // Filter out redundant paths (same sequence of IDs)
      v.paths.forEach(path => {
        const signature = path.join("->");
        if (!seenSignatures.has(signature)) {
          seenSignatures.add(signature);
          uniquePaths.push(path);
        }
      });

      // Sort paths by length (Ascending): Shortest (most direct) exposure first
      uniquePaths.sort((a, b) => a.length - b.length);

      return {
        ...v,
        paths: uniquePaths,
        pathCount: uniquePaths.length
      };
    }).sort((a, b) => {
      // Primary Sort: Severity Score (Descending)
      if (b.severityScore !== a.severityScore) {
        return b.severityScore - a.severityScore;
      }
      // Secondary Sort: Path Count (Descending)
      return b.pathCount - a.pathCount;
    });

    res.json({
      summary: {
        totalVulnerabilities: vulnerabilities.length,
        critical: vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
        high: vulnerabilities.filter(v => v.severity === 'HIGH').length,
        medium: vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
        totalLibraries: Array.from(nodeMap.values()).filter(n => n.type === 'Library').length,
        totalProjects: totalProjects,
        criticalPaths: vulnerabilities.filter(v => v.pathCount > 1).length,
        lastIngestionTime: lastIngestionTime || new Date().toISOString()
      },
      vulnerabilities,
      graph: {
        nodes: Array.from(nodeMap.values()),
        edges: validEdges
      }
    });
  } catch (err) {
    console.error("Error fetching risk data:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
