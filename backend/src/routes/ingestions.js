const express = require("express");
const { runQuery } = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const cypher = `
      MATCH (p:Project)-[:HAS_INGESTION]->(i:Ingestion)
      RETURN 
        p.name AS project,
        i.status AS status,
        i.vulnerabilitiesFound AS vulnerabilitiesFound,
        toString(i.timestamp) AS timestamp,
        i.warnings AS warnings
      ORDER BY i.timestamp DESC
    `;

    const records = await runQuery(cypher);

    const ingestions = records.map(record => ({
      project: record.get("project"),
      status: record.get("status"),
      vulnerabilitiesFound: record.get("vulnerabilitiesFound"),
      timestamp: record.get("timestamp"),
      warnings: record.get("warnings") || []
    }));

    res.json(ingestions);
  } catch (err) {
    console.error("Error fetching ingestions:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
