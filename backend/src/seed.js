const { runQuery, verifyConnection, closeConnection } = require("./db");

const SEED_CYPHER = `
MATCH (n) DETACH DELETE n
`;

const CREATE_CYPHER = `

// ── Projects ───────────────────────────────────────────
CREATE (p1:Project {name: 'MyApp'})
CREATE (p2:Project {name: 'CloudCore-API-v4'})
CREATE (p3:Project {name: 'Payment-Service'})

// ── Libraries ──────────────────────────────────────────
CREATE (express:Library {name: 'express'})
CREATE (lodash:Library {name: 'lodash'})
CREATE (axios:Library {name: 'axios'})
CREATE (moment:Library {name: 'moment'})
CREATE (log4j:Library {name: 'log4j-core'})
CREATE (uuid:Library {name: 'uuid'})
CREATE (chalk:Library {name: 'chalk'})
CREATE (debug:Library {name: 'debug'})

// ── Versions ───────────────────────────────────────────
CREATE (lodashV1:Version {name: '4.17.20'})
CREATE (lodashV2:Version {name: '4.17.21'})

CREATE (axiosV1:Version {name: '0.21.1'})
CREATE (axiosV2:Version {name: '1.6.0'})

CREATE (momentV1:Version {name: '2.29.1'})
CREATE (log4jV1:Version {name: '2.14.1'})
CREATE (log4jV2:Version {name: '2.17.1'})

CREATE (expressV:Version {name: '4.18.2'})
CREATE (uuidV:Version {name: '9.0.0'})
CREATE (chalkV:Version {name: '5.0.0'})
CREATE (debugV:Version {name: '4.3.4'})

// ── Vulnerabilities (ALL SEVERITIES) ───────────────────
CREATE (v1:Vulnerability {
  id: 'CVE-2021-23337',
  severity: 'HIGH',
  title: 'Prototype Pollution'
})

CREATE (v2:Vulnerability {
  id: 'CVE-2021-44228',
  severity: 'CRITICAL',
  title: 'Log4Shell RCE'
})

CREATE (v3:Vulnerability {
  id: 'CVE-2021-3749',
  severity: 'HIGH',
  title: 'SSRF in axios'
})

CREATE (v4:Vulnerability {
  id: 'CVE-2022-31129',
  severity: 'MEDIUM',
  title: 'ReDoS in moment'
})

CREATE (v5:Vulnerability {
  id: 'CVE-2020-8203',
  severity: 'LOW',
  title: 'Minor lodash issue'
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

// ── Dependency Chains (MULTIPLE PATHS) ─────────────────
CREATE (express)-[:DEPENDS_ON]->(lodash)
CREATE (axios)-[:DEPENDS_ON]->(lodash)
CREATE (debug)-[:DEPENDS_ON]->(ms:Library {name: 'ms'})
CREATE (ms)-[:DEPENDS_ON]->(lodash)

CREATE (chalk)-[:DEPENDS_ON]->(ansi:Library {name: 'ansi'})
CREATE (ansi)-[:DEPENDS_ON]->(lodash)

// ── Versions ───────────────────────────────────────────
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

// ── Vulnerabilities Mapping ────────────────────────────
CREATE (lodashV1)-[:HAS_VULNERABILITY]->(v1)
CREATE (lodashV1)-[:HAS_VULNERABILITY]->(v5)

CREATE (axiosV1)-[:HAS_VULNERABILITY]->(v3)
CREATE (momentV1)-[:HAS_VULNERABILITY]->(v4)

CREATE (log4jV1)-[:HAS_VULNERABILITY]->(v2)

// ── SAFE versions (NO vulnerabilities) ─────────────────
/*
lodashV2, axiosV2, log4jV2, uuidV, chalkV, debugV are SAFE
*/

// ── Ingestion Tracking ─────────────────────────────────
CREATE (i1:Ingestion {
  project: 'MyApp',
  timestamp: datetime(),
  status: 'SUCCESS',
  vulnerabilitiesFound: 2
})

CREATE (i2:Ingestion {
  project: 'CloudCore-API-v4',
  timestamp: datetime(),
  status: 'SUCCESS',
  vulnerabilitiesFound: 3
})

CREATE (i3:Ingestion {
  project: 'Payment-Service',
  timestamp: datetime(),
  status: 'SUCCESS',
  vulnerabilitiesFound: 2
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