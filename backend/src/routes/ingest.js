const express = require("express");
const multer = require("multer");
const { runQuery } = require("../db");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const MAX_DEPTH = 5;

// ---------------------------------------------------------------------------
// 1. Ecosystem constants
// ---------------------------------------------------------------------------
const Ecosystems = {
  NPM: "npm",
  PYPI: "PyPI",
  GO: "Go",
};

// ---------------------------------------------------------------------------
// 2. File type + ecosystem detector
// ---------------------------------------------------------------------------
function detectFileTypeAndEcosystem(filename, contentObjOrStr) {
  if (filename === "package.json") {
    return { type: "package-json", ecosystem: Ecosystems.NPM };
  }
  if (filename.endsWith(".json")) {
    // Likely `npm ls --json` output
    return { type: "npm-ls-json", ecosystem: Ecosystems.NPM };
  }
  if (filename === "requirements.txt" || filename.endsWith(".txt")) {
    return { type: "requirements-txt", ecosystem: Ecosystems.PYPI };
  }
  if (filename === "go.mod") {
    return { type: "go-mod", ecosystem: Ecosystems.GO };
  }
  // Fallback: JSON with dependencies key → treat as npm
  if (typeof contentObjOrStr === "object" && contentObjOrStr && contentObjOrStr.dependencies) {
    return { type: "package-json-like", ecosystem: Ecosystems.NPM };
  }
  return { type: "unknown", ecosystem: null };
}

// ---------------------------------------------------------------------------
// 3. Parsers for non-JSON formats
// ---------------------------------------------------------------------------

/**
 * Parse a requirements.txt into a flat dep map.
 * Only exact-pinned versions (==) are accepted for reliable OSV lookups.
 */
function parseRequirementsTxt(text) {
  const deps = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("-")) continue;

    const match = line.match(/^([A-Za-z0-9._-]+)\s*([=<>!~]{1,2})?\s*(.+)?$/);
    if (!match) continue;

    const name = match[1];
    const op = match[2];
    const version = match[3]?.trim();

    if (op === "==" && version) {
      deps[name] = { version, ecosystem: Ecosystems.PYPI };
    }
    // Non-pinned specs are skipped for now (OSV works best with exact versions)
  }
  return deps;
}

/**
 * Parse a go.mod into a flat dep map.
 * Handles both single-line and block `require` statements.
 */
function parseGoMod(text) {
  const deps = {};
  const lines = text.split(/\r?\n/);
  let inRequireBlock = false;

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("//")) continue;

    if (line.startsWith("require (")) {
      inRequireBlock = true;
      continue;
    }
    if (inRequireBlock && line === ")") {
      inRequireBlock = false;
      continue;
    }

    if (line.startsWith("require ") && !line.startsWith("require (")) {
      const rest = line.replace(/^require\s+/, "");
      const parts = rest.split(/\s+/);
      if (parts.length >= 2) {
        deps[parts[0]] = { version: parts[1].replace(/^v/, ""), ecosystem: Ecosystems.GO };
      }
      continue;
    }

    if (inRequireBlock) {
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        deps[parts[0]] = { version: parts[1].replace(/^v/, ""), ecosystem: Ecosystems.GO };
      }
    }
  }
  return deps;
}

// ---------------------------------------------------------------------------
// 4. Ecosystem-aware OSV query
// ---------------------------------------------------------------------------
async function checkVulnerabilities(packageName, version, ecosystem) {
  try {
    const response = await fetch("https://api.osv.dev/v1/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version,
        package: { name: packageName, ecosystem },
      }),
    });

    if (!response.ok) {
      throw new Error(`OSV API status: ${response.status}`);
    }

    const data = await response.json();
    if (data.vulns && data.vulns.length > 0) {
      return data.vulns.map((v) => {
        let severity = v.database_specific?.severity || "MEDIUM";
        severity = typeof severity === "string" ? severity.toUpperCase() : "MEDIUM";
        return {
          id: v.id,
          severity,
          title: v.summary || v.details || "No details provided",
        };
      });
    }
    return [];
  } catch (error) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 5. Route handler
// ---------------------------------------------------------------------------
router.post("/", upload.single("dependencyFile"), async (req, res) => {
  const projectName = req.body.projectName || "UnknownProject";

  if (!req.file) {
    return res.status(400).json({ error: "No dependencyFile provided" });
  }

  const fileName = req.file.originalname;
  const fileStr = req.file.buffer.toString("utf-8");

  // Try to parse as JSON; fall back to plain text
  let depTree = null;
  try {
    depTree = JSON.parse(fileStr);
  } catch {
    depTree = null;
  }

  const detection = detectFileTypeAndEcosystem(fileName, depTree || fileStr);
  const { ecosystem } = detection;
  let treeFormat = detection.type;

  const warnings = [];
  let vulnerabilitiesResolved = true;

  // Build the flat/tree dep map based on detected format
  let parsedDeps = {};

  if (
    treeFormat === "npm-ls-json" ||
    treeFormat === "package-json" ||
    treeFormat === "package-json-like"
  ) {
    if (depTree && depTree.dependencies) {
      const firstVal = Object.values(depTree.dependencies)[0];
      if (typeof firstVal === "object" && firstVal !== null && "version" in firstVal) {
        // npm ls --json tree format
        parsedDeps = depTree.dependencies;
        treeFormat = "npm-tree";
        console.log(`[Ingest] Detected npm ls tree format for project: ${projectName}`);
      } else if (typeof firstVal === "string") {
        // package.json flat format
        parsedDeps = Object.fromEntries(
          Object.entries(depTree.dependencies).map(([name, version]) => [
            name,
            { version: version.replace(/^[\^~]/, ""), ecosystem: Ecosystems.NPM },
          ])
        );
        treeFormat = "npm-flat";
        console.log(`[Ingest] Detected package.json flat format for project: ${projectName}`);
      } else {
        warnings.push("Unrecognized npm dependency structure");
      }
    } else {
      warnings.push("No dependencies key found in JSON file");
    }
  } else if (treeFormat === "requirements-txt") {
    parsedDeps = parseRequirementsTxt(fileStr);
    console.log(`[Ingest] Detected requirements.txt for project: ${projectName}`);
  } else if (treeFormat === "go-mod") {
    parsedDeps = parseGoMod(fileStr);
    console.log(`[Ingest] Detected go.mod for project: ${projectName}`);
  } else {
    warnings.push("Unrecognized dependency file format");
  }

  try {
    // 1. Create Project Node
    await runQuery(
      `MERGE (p:Project {name: $projectName}) RETURN p`,
      { projectName }
    );

    const visitedLibraries = new Set();
    const libVersionsToScan = new Map();

    // 6. Unified, ecosystem-aware dependency processor
    async function processDependencies(parentNodeName, deps, depth, isProject = false) {
      if (!deps || depth > MAX_DEPTH) return;

      for (const [libName, libInfo] of Object.entries(deps)) {
        if (!libInfo.version) continue;

        const version = libInfo.version;
        const depEcosystem = libInfo.ecosystem || Ecosystems.NPM;
        const language =
          depEcosystem === Ecosystems.NPM
            ? "javascript"
            : depEcosystem === Ecosystems.PYPI
            ? "python"
            : depEcosystem === Ecosystems.GO
            ? "go"
            : "unknown";

        // Key includes ecosystem to prevent clashes (e.g. 1.0.0 in npm vs PyPI)
        const libVerKey = `${depEcosystem}:${libName}@${version}`;
        if (!libVersionsToScan.has(libVerKey)) {
          libVersionsToScan.set(libVerKey, { name: libName, version, ecosystem: depEcosystem });
        }

        const createEdgeCypher = isProject
          ? `MATCH (parent:Project {name: $parentNodeName})
             MERGE (lib:Library {name: $libName})
               ON CREATE SET lib.language = $language, lib.ecosystem = $depEcosystem
             MERGE (ver:Version {number: $version, name: $libName, ecosystem: $depEcosystem})
             MERGE (lib)-[:HAS_VERSION]->(ver)
             MERGE (parent)-[:USES]->(lib)`
          : `MATCH (parent:Library {name: $parentNodeName})
             MERGE (lib:Library {name: $libName})
               ON CREATE SET lib.language = $language, lib.ecosystem = $depEcosystem
             MERGE (ver:Version {number: $version, name: $libName, ecosystem: $depEcosystem})
             MERGE (lib)-[:HAS_VERSION]->(ver)
             MERGE (parent)-[:DEPENDS_ON]->(lib)`;

        await runQuery(createEdgeCypher, { parentNodeName, libName, version, language, depEcosystem });

        // Recurse only for npm ls tree format (nested dependencies)
        if (treeFormat === "npm-tree" && !visitedLibraries.has(libName)) {
          visitedLibraries.add(libName);
          if (libInfo.dependencies) {
            await processDependencies(libName, libInfo.dependencies, depth + 1, false);
          }
        }
      }
    }

    if (Object.keys(parsedDeps).length > 0) {
      await processDependencies(projectName, parsedDeps, 1, true);
    } else {
      warnings.push("No dependencies found to process");
    }

    // Phase 2: Ecosystem-aware vulnerability detection
    const uniqueVulnIds = new Set();
    for (const { name, version, ecosystem: depEcosystem } of libVersionsToScan.values()) {
      try {
        const vulns = await checkVulnerabilities(name, version, depEcosystem);
        console.log(
          `[OSV] ${depEcosystem}:${name}@${version} → ${vulns.length} vulnerabilities`
        );

        for (const v of vulns) {
          uniqueVulnIds.add(v.id);
          const vulnCypher = `
            MATCH (ver:Version {number: $version, name: $name, ecosystem: $depEcosystem})
            MERGE (vuln:Vulnerability {cve_id: $cveId})
              ON CREATE SET vuln.severity = $severity, vuln.title = $title
            MERGE (ver)-[:HAS_VULNERABILITY]->(vuln)
          `;
          await runQuery(vulnCypher, {
            name,
            version,
            depEcosystem,
            cveId: v.id,
            severity: v.severity,
            title: v.title,
          });
        }
      } catch (osvErr) {
        console.error(`[OSV] Failed for ${name}@${version} (${depEcosystem}):`, osvErr.message);
        warnings.push(`OSV API failed for ${depEcosystem}:${name}@${version}`);
        vulnerabilitiesResolved = false;
      }
    }

    const status = warnings.length === 0 ? "SUCCESS" : "PARTIAL";

    await runQuery(
      `MATCH (p:Project {name: $projectName})
       CREATE (i:Ingestion {
         project: $projectName,
         timestamp: datetime(),
         status: $status,
         ecosystem: $detectedEcosystem,
         vulnerabilitiesFound: $vulnCount,
         warnings: $warnings
       })
       CREATE (p)-[:HAS_INGESTION]->(i)`,
      {
        projectName,
        status,
        detectedEcosystem: ecosystem || "unknown",
        vulnCount: uniqueVulnIds.size,
        warnings,
      }
    );

    res.json({
      status: "success",
      ecosystem: ecosystem || "unknown",
      format: treeFormat,
      vulnerabilitiesResolved,
      vulnerabilitiesFound: uniqueVulnIds.size,
      warnings,
    });
  } catch (err) {
    console.error("[Ingest] Ingestion failed:", err);
    await runQuery(
      `MATCH (p:Project {name: $projectName})
       CREATE (i:Ingestion {
         project: $projectName,
         timestamp: datetime(),
         status: 'FAILED',
         vulnerabilitiesFound: 0,
         warnings: [$errMsg]
       })
       CREATE (p)-[:HAS_INGESTION]->(i)`,
      { projectName, errMsg: err.message }
    ).catch((e) => console.error("[Ingest] Failed to log failure:", e));

    res.status(500).json({ error: "Ingestion failed" });
  }
});

module.exports = router;
