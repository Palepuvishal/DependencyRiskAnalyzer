const express = require("express");
const { runQuery } = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const cypher = `MATCH (p:Project) RETURN p.name AS name`;
    const records = await runQuery(cypher);
    const projects = records.map(record => ({
      name: record.get("name")
    }));

    res.json(projects);
  } catch (err) {
    console.error("Error fetching projects:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
