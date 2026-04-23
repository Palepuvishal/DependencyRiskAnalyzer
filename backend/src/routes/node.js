const express = require("express");
const { runQuery } = require("../db");

const router = express.Router();

router.get("/:id", async (req, res) => {
  const nodeId = req.params.id;

  try {
    const cypher = `
      MATCH (n) 
      WHERE n.name = $nodeId OR n.number = $nodeId OR n.cve_id = $nodeId
      WITH n LIMIT 1
      
      OPTIONAL MATCH (n)-[:HAS_VULNERABILITY]->(v:Vulnerability)
      WITH n, collect(DISTINCT v.cve_id) AS vulns

      OPTIONAL MATCH (n)-[:HAS_VERSION]->(ver:Version)
      WITH n, vulns, collect(DISTINCT ver.number) AS versions

      OPTIONAL MATCH (n)<-[:USES|DEPENDS_ON]-(d)
      WITH n, vulns, versions, collect(DISTINCT d.name) AS dependents

      OPTIONAL MATCH (n)-[:USES|DEPENDS_ON]->(dep:Library)
      WITH n, vulns, versions, dependents, collect(DISTINCT dep.name) AS dependencies

      RETURN 
        n { .name, .number, .cve_id, .description, .severity } AS properties,
        labels(n)[0] AS type,
        vulns,
        versions,
        dependents,
        dependencies
    `;

    const records = await runQuery(cypher, { nodeId });

    if (records.length === 0) {
      return res.status(404).json({ error: "Node not found" });
    }

    const record = records[0];
    const properties = record.get("properties");
    const type = record.get("type");
    
    // Construct response
    const response = {
      id: properties.name || properties.number || properties.cve_id,
      type: type,
      connectedVulnerabilities: record.get("vulns"),
      versions: record.get("versions"),
      dependents: record.get("dependents"),
      dependencies: record.get("dependencies")
    };

    res.json(response);
  } catch (err) {
    console.error("Error fetching node details:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
