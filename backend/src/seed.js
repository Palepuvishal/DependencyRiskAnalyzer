const { runQuery, verifyConnection, closeConnection } = require("./db");

const SEED_CYPHER = `
MATCH (n) DETACH DELETE n
`;

const CREATE_CYPHER = `

// ── Projects ───────────────────────────────────────────
CREATE (p1:Project {name: 'MyApp'})
CREATE (p2:Project {name: 'CloudCore-API-v4'})
CREATE (p3:Project {name: 'Payment-Service'})

// ── Libraries (with ecosystem + language) ──────────────
CREATE (express:Library {name: 'express',    language: 'javascript', ecosystem: 'npm'})
CREATE (lodash:Library  {name: 'lodash',     language: 'javascript', ecosystem: 'npm'})
CREATE (axios:Library   {name: 'axios',      language: 'javascript', ecosystem: 'npm'})
CREATE (moment:Library  {name: 'moment',     language: 'javascript', ecosystem: 'npm'})
CREATE (log4j:Library   {name: 'log4j-core', language: 'java',       ecosystem: 'Maven'})
CREATE (uuid:Library    {name: 'uuid',       language: 'javascript', ecosystem: 'npm'})
CREATE (chalk:Library   {name: 'chalk',      language: 'javascript', ecosystem: 'npm'})
CREATE (debug:Library   {name: 'debug',      language: 'javascript', ecosystem: 'npm'})

// ── Versions (number + library name + ecosystem) ───────
CREATE (lodashV1:Version {number: '4.17.20', name: 'lodash',     ecosystem: 'npm'})
CREATE (lodashV2:Version {number: '4.17.21', name: 'lodash',     ecosystem: 'npm'})

CREATE (axiosV1:Version  {number: '0.21.1',  name: 'axios',      ecosystem: 'npm'})
CREATE (axiosV2:Version  {number: '1.6.0',   name: 'axios',      ecosystem: 'npm'})

CREATE (momentV1:Version {number: '2.29.1',  name: 'moment',     ecosystem: 'npm'})
CREATE (log4jV1:Version  {number: '2.14.1',  name: 'log4j-core', ecosystem: 'Maven'})
CREATE (log4jV2:Version  {number: '2.17.1',  name: 'log4j-core', ecosystem: 'Maven'})

CREATE (expressV:Version {number: '4.18.2',  name: 'express',    ecosystem: 'npm'})
CREATE (uuidV:Version    {number: '9.0.0',   name: 'uuid',       ecosystem: 'npm'})
CREATE (chalkV:Version   {number: '5.0.0',   name: 'chalk',      ecosystem: 'npm'})
CREATE (debugV:Version   {number: '4.3.4',   name: 'debug',      ecosystem: 'npm'})

// ── Vulnerabilities (both id and cve_id for compatibility) ─
CREATE (v1:Vulnerability {
  id: 'CVE-2021-23337', cve_id: 'CVE-2021-23337',
  severity: 'HIGH',
  title: 'Prototype Pollution in lodash'
})

CREATE (v2:Vulnerability {
  id: 'CVE-2021-44228', cve_id: 'CVE-2021-44228',
  severity: 'CRITICAL',
  title: 'Log4Shell Remote Code Execution'
})

CREATE (v3:Vulnerability {
  id: 'CVE-2021-3749', cve_id: 'CVE-2021-3749',
  severity: 'HIGH',
  title: 'SSRF vulnerability in axios'
})

CREATE (v4:Vulnerability {
  id: 'CVE-2022-31129', cve_id: 'CVE-2022-31129',
  severity: 'MEDIUM',
  title: 'ReDoS vulnerability in moment'
})

CREATE (v5:Vulnerability {
  id: 'CVE-2020-8203', cve_id: 'CVE-2020-8203',
  severity: 'LOW',
  title: 'Prototype pollution in lodash (minor)'
})

// ── Project → Libraries ────────────────────────────────
CREATE (p1)-[:USES]->(express)
CREATE (p1)-[:USES]->(lodash)
CREATE (p1)-[:USES]->(uuid)

CREATE (p2)-[:USES]->(axios)
CREATE (p2)-[:USES]->(moment)
CREATE (p2)-[:USES]->(log4j)
CREATE (p2)-[:USES]->(lodash)

CREATE (p3)-[:USES]->(express)
CREATE (p3)-[:USES]->(debug)
CREATE (p3)-[:USES]->(chalk)
CREATE (p3)-[:USES]->(axios)

// ── Dependency Chains (transitive paths) ───────────────
CREATE (express)-[:DEPENDS_ON]->(lodash)
CREATE (axios)-[:DEPENDS_ON]->(lodash)
CREATE (debug)-[:DEPENDS_ON]->(ms:Library {name: 'ms', language: 'javascript', ecosystem: 'npm'})
CREATE (ms)-[:DEPENDS_ON]->(lodash)
CREATE (chalk)-[:DEPENDS_ON]->(ansi:Library {name: 'ansi', language: 'javascript', ecosystem: 'npm'})
CREATE (ansi)-[:DEPENDS_ON]->(lodash)

// ── Library → Version ──────────────────────────────────
CREATE (lodash)-[:HAS_VERSION]->(lodashV1)
CREATE (lodash)-[:HAS_VERSION]->(lodashV2)

CREATE (axios)-[:HAS_VERSION]->(axiosV1)
CREATE (axios)-[:HAS_VERSION]->(axiosV2)

CREATE (moment)-[:HAS_VERSION]->(momentV1)
CREATE (log4j)-[:HAS_VERSION]->(log4jV1)
CREATE (log4j)-[:HAS_VERSION]->(log4jV2)

CREATE (express)-[:HAS_VERSION]->(expressV)
CREATE (uuid)-[:HAS_VERSION]->(uuidV)
CREATE (chalk)-[:HAS_VERSION]->(chalkV)
CREATE (debug)-[:HAS_VERSION]->(debugV)

// ── Version → Vulnerability (vulnerable versions only) ─
CREATE (lodashV1)-[:HAS_VULNERABILITY]->(v1)
CREATE (lodashV1)-[:HAS_VULNERABILITY]->(v5)

CREATE (axiosV1)-[:HAS_VULNERABILITY]->(v3)
CREATE (momentV1)-[:HAS_VULNERABILITY]->(v4)
CREATE (log4jV1)-[:HAS_VULNERABILITY]->(v2)

// ── Ingestion Tracking ─────────────────────────────────
CREATE (i1:Ingestion {
  project: 'MyApp',
  timestamp: datetime(),
  status: 'SUCCESS',
  ecosystem: 'npm',
  vulnerabilitiesFound: 2,
  warnings: []
})

CREATE (i2:Ingestion {
  project: 'CloudCore-API-v4',
  timestamp: datetime(),
  status: 'SUCCESS',
  ecosystem: 'npm',
  vulnerabilitiesFound: 3,
  warnings: []
})

CREATE (i3:Ingestion {
  project: 'Payment-Service',
  timestamp: datetime(),
  status: 'SUCCESS',
  ecosystem: 'npm',
  vulnerabilitiesFound: 2,
  warnings: []
})

CREATE (p1)-[:HAS_INGESTION]->(i1)
CREATE (p2)-[:HAS_INGESTION]->(i2)
CREATE (p3)-[:HAS_INGESTION]->(i3)

RETURN 'Seed complete' AS status
`;

async function seed() {
  try {
    await verifyConnection();

    console.log("⏳ Clearing existing data...");
    await runQuery(SEED_CYPHER);

    console.log("⏳ Creating rich dataset...");
    const records = await runQuery(CREATE_CYPHER);
    console.log(`✓ ${records[0].get("status")}`);

    const countCheck = await runQuery(`
      MATCH (n)
      RETURN labels(n)[0] AS label, count(n) AS count
      ORDER BY label
    `);

    console.log("\n📊 Graph summary:");
    countCheck.forEach((r) => {
      console.log(`   ${r.get("label")}: ${r.get("count")}`);
    });

  } catch (err) {
    console.error("✗ Seed failed:", err.message);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

seed();