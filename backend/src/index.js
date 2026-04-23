const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { verifyConnection, closeConnection, runQuery } = require("./db");
const riskRoutes = require("./routes/risk");
const projectRoutes = require("./routes/projects");
const nodeRoutes = require("./routes/node");
const ingestRoutes = require("./routes/ingest");
const ingestionsRoutes = require("./routes/ingestions");

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health check ───────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/health/detailed", async (_req, res) => {
  try {
    const records = await runQuery(`
      MATCH (p:Project) WITH count(p) AS projects
      OPTIONAL MATCH (v:Vulnerability) WITH projects, count(v) AS vulnerabilities
      OPTIONAL MATCH (i:Ingestion) WITH projects, vulnerabilities, max(toString(i.timestamp)) AS lastIngestion
      RETURN projects, vulnerabilities, lastIngestion
    `);
    
    if (records.length === 0) {
      return res.json({ status: "ok", projects: 0, vulnerabilities: 0, lastIngestion: null });
    }

    const r = records[0];
    res.json({
      status: "ok",
      projects: r.get("projects").toNumber ? r.get("projects").toNumber() : r.get("projects"),
      vulnerabilities: r.get("vulnerabilities").toNumber ? r.get("vulnerabilities").toNumber() : r.get("vulnerabilities"),
      lastIngestion: r.get("lastIngestion")
    });
  } catch (err) {
    res.status(500).json({ error: "Detailed health check failed" });
  }
});

// ── Routes ─────────────────────────────────────────────
app.use("/risk", riskRoutes);
app.use("/projects", projectRoutes);
app.use("/node", nodeRoutes);
app.use("/ingest", ingestRoutes);
app.use("/ingestions", ingestionsRoutes);

// ── Start server ───────────────────────────────────────
async function start() {
  try {
    await verifyConnection();

    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("✗ Failed to start server:", err.message);
    process.exit(1);
  }
}

// ── Graceful shutdown ──────────────────────────────────
process.on("SIGINT", async () => {
  await closeConnection();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeConnection();
  process.exit(0);
});

start();
