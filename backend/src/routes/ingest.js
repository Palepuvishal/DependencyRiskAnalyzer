const express = require("express");
const multer = require("multer");
const { runQuery } = require("../db");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const MAX_DEPTH = 5;

// Helper to query OSV
async function checkVulnerabilities(packageName, version) {
  try {
    const response = await fetch("https://api.osv.dev/v1/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: version,
        package: { name: packageName, ecosystem: "npm" }
      })
    });
    
    if (!response.ok) {
      throw new Error(`OSV API status: ${response.status}`);
    }

    const data = await response.json();
    if (data.vulns && data.vulns.length > 0) {
      return data.vulns.map(v => {
        let severity = v.database_specific?.severity || "MEDIUM";
        if (typeof severity === "string") {
          severity = severity.toUpperCase();
        } else {
          severity = "MEDIUM";
        }
        return {
          id: v.id,
          severity,
          title: v.summary || v.details || "No details provided"
        };
      });
    }
    return [];
  } catch (error) {
    throw error;
  }
}

router.post("/", upload.single("dependencyFile"), async (req, res) => {
  const projectName = req.body.projectName || "UnknownProject";
  
  if (!req.file) {
    return res.status(400).json({ error: "No dependencyFile provided" });
  }

  let depTree;
  try {
    const fileStr = req.file.buffer.toString('utf-8');
    depTree = JSON.parse(fileStr);
  } catch (err) {
    return res.status(400).json({ error: "Invalid JSON file" });
  }

  const warnings = [];
  let vulnerabilitiesResolved = true;

  try {
    // 1. Create Project Node
    await runQuery(`
      MERGE (p:Project {name: $projectName})
      RETURN p
    `, { projectName });

    // Detect input type
    let dependencies = {};
    let isPackageJson = false;

    if (depTree.dependencies && typeof Object.values(depTree.dependencies)[0] === 'object' && Object.values(depTree.dependencies)[0] !== null && ('version' in Object.values(depTree.dependencies)[0])) {
      dependencies = depTree.dependencies;
      isPackageJson = false;
      console.log(`[Ingest] Detected npm ls format for project: ${projectName}`);
    } else if (depTree.dependencies && typeof Object.values(depTree.dependencies)[0] === 'string') {
      dependencies = Object.fromEntries(
        Object.entries(depTree.dependencies).map(([name, version]) => [
          name, 
          { version: version.replace(/^[\^~]/, '') }
        ])
      );
      isPackageJson = true;
      console.log(`[Ingest] Detected package.json format for project: ${projectName}`);
    } else {
      console.warn(`[Ingest] Unrecognized format for project: ${projectName}`);
      warnings.push("No dependencies found or unrecognized format");
    }

    const visitedLibraries = new Set();
    const libVersionsToScan = new Map();

    async function processDependencies(parentNodeName, deps, depth, isProject = false) {
      if (!deps || depth > MAX_DEPTH) return;

      for (const [libName, libInfo] of Object.entries(deps)) {
        if (!libInfo.version) continue;
        
        const version = libInfo.version;
        const libVerKey = `${libName}@${version}`;
        if (!libVersionsToScan.has(libVerKey)) {
          libVersionsToScan.set(libVerKey, { name: libName, version });
        }
        
        const createEdgeCypher = isProject ? 
          `MATCH (parent:Project {name: $parentNodeName})
           MERGE (lib:Library {name: $libName}) SET lib.language = 'javascript'
           MERGE (ver:Version {number: $version})
           MERGE (lib)-[:HAS_VERSION]->(ver)
           MERGE (parent)-[:USES]->(lib)` :
          `MATCH (parent:Library {name: $parentNodeName})
           MERGE (lib:Library {name: $libName}) SET lib.language = 'javascript'
           MERGE (ver:Version {number: $version})
           MERGE (lib)-[:HAS_VERSION]->(ver)
           MERGE (parent)-[:DEPENDS_ON]->(lib)`;

        await runQuery(createEdgeCypher, { parentNodeName, libName, version });

        if (!isPackageJson && !visitedLibraries.has(libName)) {
          visitedLibraries.add(libName);
          if (libInfo.dependencies) {
            await processDependencies(libName, libInfo.dependencies, depth + 1, false);
          }
        }
      }
    }

    if (Object.keys(dependencies).length > 0) {
      await processDependencies(projectName, dependencies, 1, true);
    } else {
      warnings.push("No dependencies found to process");
    }

    // Phase 2: Vulnerability Detection
    const uniqueVulnIds = new Set();
    for (const { name, version } of libVersionsToScan.values()) {
      try {
        const vulns = await checkVulnerabilities(name, version);
        console.log(`[OSV] Checking ${name}@${version}: Found ${vulns.length} vulnerabilities`);
        
        if (vulns.length === 0) {
          console.log(`[OSV] No vulnerabilities found for ${name}@${version}`);
        }

        for (const v of vulns) {
          uniqueVulnIds.add(v.id);
          const vulnCypher = `
            MATCH (ver:Version {number: $version})
            OPTIONAL MATCH (lib:Library {name: $name})-[:HAS_VERSION]->(ver)
            WHERE lib IS NOT NULL
            MERGE (vuln:Vulnerability {cve_id: $cveId})
            ON CREATE SET vuln.severity = $severity, vuln.title = $title
            MERGE (ver)-[:HAS_VULNERABILITY]->(vuln)
          `;
          await runQuery(vulnCypher, {
            name,
            version,
            cveId: v.id,
            severity: v.severity,
            title: v.title
          });
        }
      } catch (osvErr) {
        console.error(`[OSV] Failed for ${name}@${version}:`, osvErr.message);
        warnings.push(`OSV API failed for ${name}@${version}`);
        vulnerabilitiesResolved = false;
      }
    }

    const status = warnings.length === 0 ? "SUCCESS" : "PARTIAL";

    await runQuery(`
      MATCH (p:Project {name: $projectName})
      CREATE (i:Ingestion {
        project: $projectName,
        timestamp: datetime(),
        status: $status,
        vulnerabilitiesFound: $vulnCount,
        warnings: $warnings
      })
      CREATE (p)-[:HAS_INGESTION]->(i)
    `, { projectName, status, vulnCount: uniqueVulnIds.size, warnings });

    res.json({
      status: "success",
      vulnerabilitiesResolved,
      vulnerabilitiesFound: uniqueVulnIds.size,
      warnings
    });

  } catch (err) {
    console.error("[Ingest] Ingestion failed:", err);
    await runQuery(`
      MATCH (p:Project {name: $projectName})
      CREATE (i:Ingestion {
        project: $projectName,
        timestamp: datetime(),
        status: 'FAILED',
        vulnerabilitiesFound: 0,
        warnings: [$errMsg]
      })
      CREATE (p)-[:HAS_INGESTION]->(i)
    `, { projectName, errMsg: err.message }).catch(e => console.error("[Ingest] Failed to log failure:", e));
    
    res.status(500).json({ error: "Ingestion failed" });
  }
});

module.exports = router;
