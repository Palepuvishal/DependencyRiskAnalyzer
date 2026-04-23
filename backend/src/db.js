const neo4j = require("neo4j-driver");
require("dotenv").config();

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

/**
 * Verify connectivity to Neo4j on startup.
 * Throws if the database is unreachable.
 */
async function verifyConnection() {
  const session = driver.session();
  try {
    await session.run("RETURN 1 AS ok");
    console.log("✓ Connected to Neo4j");
  } finally {
    await session.close();
  }
}

/**
 * Recursively converts Neo4j Integers (low/high objects) to native JS numbers.
 */
function convertIntegers(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (neo4j.isInt(obj)) {
    return obj.toNumber();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertIntegers);
  }
  
  if (typeof obj === 'object') {
    // If it's a Neo4j Node or Relationship, process properties
    if (obj.properties) {
      obj.properties = convertIntegers(obj.properties);
    }
    
    const newObj = {};
    for (const key in obj) {
      newObj[key] = convertIntegers(obj[key]);
    }
    return newObj;
  }
  
  return obj;
}

/**
 * Run a parameterized Cypher query and return the records.
 * @param {string} cypher  - The Cypher query string
 * @param {object} params  - Parameters to bind to the query
 * @returns {any[]} - Processed records with native JS types
 */
async function runQuery(cypher, params = {}) {
  const session = driver.session();
  try {
    const result = await session.run(cypher, params);
    return result.records.map(record => {
      // Create a map-like object where each value is processed
      const processed = {};
      record.keys.forEach(key => {
        processed[key] = convertIntegers(record.get(key));
      });
      
      // Keep the .get() interface for compatibility with existing code
      processed.get = (key) => processed[key];
      return processed;
    });
  } finally {
    await session.close();
  }
}

/**
 * Gracefully close the driver (call on server shutdown).
 */
async function closeConnection() {
  await driver.close();
  console.log("✓ Neo4j connection closed");
}

module.exports = { driver, verifyConnection, runQuery, closeConnection };
