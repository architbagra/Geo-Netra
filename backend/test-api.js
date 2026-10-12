/**
 * GeoNetra Automated REST API Integration Test Suite
 * Member 4 Deliverable: Validates all core telemetry, GIS, and authentication endpoints.
 * Run directly via: node test-api.js OR npm test
 */

const { app } = require("./server");
const http = require("http");

const TEST_PORT = process.env.TEST_PORT || 3199;
const BASE_URL = `http://localhost:${TEST_PORT}`;

let server;
let passedCount = 0;
let failedCount = 0;

function logPass(title, detail = "") {
  passedCount++;
  console.log(`  \x1b[32m✔ PASS\x1b[0m  ${title} ${detail ? `\x1b[90m(${detail})\x1b[0m` : ""}`);
}

function logFail(title, error) {
  failedCount++;
  console.error(`  \x1b[31m✖ FAIL\x1b[0m  ${title}`);
  if (error) console.error(`        \x1b[31m${error.message || error}\x1b[0m`);
}

async function runTest(title, testFn) {
  try {
    await testFn();
    logPass(title);
  } catch (err) {
    logFail(title, err);
  }
}

async function startTestServer() {
  return new Promise((resolve, reject) => {
    server = app.listen(TEST_PORT, () => {
      console.log(`\n\x1b[36m=================================================================\x1b[0m`);
      console.log(`\x1b[1m\x1b[34mGEONETRA AUTOMATED API INTEGRATION TEST SUITE\x1b[0m`);
      console.log(`\x1b[90mTarget: ${BASE_URL} | Node.js ${process.version}\x1b[0m`);
      console.log(`\x1b[36m=================================================================\x1b[0m\n`);
      resolve();
    });
    server.on("error", reject);
  });
}

function stopTestServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
}

async function runAllTests() {
  const startTime = Date.now();
  await startTestServer();

  const timestamp = Date.now();
  const testUsername = `testuser_${timestamp}`;
  const testEmail = `test_${timestamp}@geonetra.org`;
  const testPhone = "9" + Math.floor(100000000 + Math.random() * 900000000);
  const testPassword = "StrongPassword@123";
  let authToken = null;

  try {
    // -------------------------------------------------------------
    // Test 1: Health Probes (/health and /api/health)
    // -------------------------------------------------------------
    await runTest("System Health Probes (GET /health & GET /api/health)", async () => {
      const res1 = await fetch(`${BASE_URL}/health`);
      if (res1.status !== 200) throw new Error(`Expected 200 on /health, got ${res1.status}`);
      const body1 = await res1.json();
      if (body1.status !== "healthy") throw new Error(`Unexpected status payload: ${JSON.stringify(body1)}`);

      const res2 = await fetch(`${BASE_URL}/api/health`);
      if (res2.status !== 200) throw new Error(`Expected 200 on /api/health, got ${res2.status}`);
      const body2 = await res2.json();
      if (body2.service !== "GeoNetra Central Backend") {
        throw new Error(`Unexpected service identifier: ${body2.service}`);
      }
    });

    // -------------------------------------------------------------
    // Test 2: Public Hazards List (/api/hazards)
    // -------------------------------------------------------------
    await runTest("Hazards Telemetry Feed (GET /api/hazards)", async () => {
      const res = await fetch(`${BASE_URL}/api/hazards`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const list = await res.json();
      if (!Array.isArray(list)) throw new Error("Expected response to be an array of hazards");
    });

    // -------------------------------------------------------------
    // Test 3: Geospatial Bounding-Box Filter (?bbox=...)
    // -------------------------------------------------------------
    await runTest("Geospatial Bounding-Box Query (GET /api/hazards?bbox=68,8,97,37)", async () => {
      const res = await fetch(`${BASE_URL}/api/hazards?bbox=68,8,97,37`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const list = await res.json();
      if (!Array.isArray(list)) throw new Error("Expected array output from spatial query");
    });

    // -------------------------------------------------------------
    // Test 4: Standard GeoJSON Export (/api/hazards/export/geojson)
    // -------------------------------------------------------------
    await runTest("RFC-7946 GeoJSON Stream Export (GET /api/hazards/export/geojson)", async () => {
      const res = await fetch(`${BASE_URL}/api/hazards/export/geojson`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/geo+json") && !contentType.includes("application/json")) {
        throw new Error(`Invalid Content-Type header: ${contentType}`);
      }
      const geojson = await res.json();
      if (geojson.type !== "FeatureCollection") {
        throw new Error(`Expected type 'FeatureCollection', got '${geojson.type}'`);
      }
      if (!Array.isArray(geojson.features)) {
        throw new Error("Missing 'features' array in GeoJSON export");
      }
    });

    // -------------------------------------------------------------
    // Test 5: Dynamic Emergency Shelters API (/api/shelters)
    // -------------------------------------------------------------
    await runTest("Emergency Relief Shelters Catalog (GET /api/shelters)", async () => {
      const res = await fetch(`${BASE_URL}/api/shelters`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const shelters = await res.json();
      if (!Array.isArray(shelters) || shelters.length === 0) {
        throw new Error("Expected non-empty array of emergency relief shelters");
      }
      const first = shelters[0];
      if (!first.name || first.totalCapacity === undefined) {
        throw new Error(`Shelter object missing required schema properties: ${JSON.stringify(first)}`);
      }
    });

    // -------------------------------------------------------------
    // Test 6: Registration Input Validation Rejection
    // -------------------------------------------------------------
    await runTest("Auth Validation Guard Rejection (POST /api/auth/register)", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "x", // too short
          email: "not-an-email",
          password: "weak"
        })
      });
      if (res.status !== 400) {
        throw new Error(`Expected 400 Bad Request on invalid input, got ${res.status}`);
      }
      const body = await res.json();
      if (!body.error) throw new Error("Expected descriptive error field in response");
    });

    // -------------------------------------------------------------
    // Test 7: Account Registration & JWT Token Issuance
    // -------------------------------------------------------------
    await runTest("Citizen Observer Registration (POST /api/auth/register)", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: testUsername,
          email: testEmail,
          phone: testPhone,
          password: testPassword
        })
      });
      if (res.status !== 201 && res.status !== 200) {
        const errBody = await res.text();
        throw new Error(`Expected 200/201, got ${res.status}: ${errBody}`);
      }
      const data = await res.json();
      if (!data.token) throw new Error("Expected JWT token upon registration");
      authToken = data.token;
    });

    // -------------------------------------------------------------
    // Test 8: Account Login Authentication
    // -------------------------------------------------------------
    await runTest("Citizen Observer Authentication (POST /api/auth/login)", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: testEmail,
          password: testPassword
        })
      });
      if (res.status !== 200) {
        const err = await res.text();
        throw new Error(`Expected 200 OK, got ${res.status}: ${err}`);
      }
      const data = await res.json();
      if (!data.token) throw new Error("Expected valid JWT token on successful login");
      authToken = data.token;
    });

    // -------------------------------------------------------------
    // Test 9: Protected Token-Guarded Route (/api/auth/me)
    // -------------------------------------------------------------
    await runTest("Stateless JWT Guard Verification (GET /api/auth/me)", async () => {
      // 1. Authorized call
      const resAuth = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (resAuth.status !== 200) {
        throw new Error(`Expected 200 with valid JWT, got ${resAuth.status}`);
      }
      const user = await resAuth.json();
      if (user.username !== testUsername) {
        throw new Error(`Expected username ${testUsername}, got ${user.username}`);
      }

      // 2. Unauthorized call
      const resNoAuth = await fetch(`${BASE_URL}/api/auth/me`);
      if (resNoAuth.status !== 401) {
        throw new Error(`Expected 401 Unauthorized when missing token, got ${resNoAuth.status}`);
      }
    });

    // -------------------------------------------------------------
    // Test 10: Input Sanitization Middleware Security Check
    // -------------------------------------------------------------
    await runTest("XSS & Null-Byte Input Sanitization Guard", async () => {
      const maliciousPayload = {
        username: `sanitized_${Date.now()}`,
        email: `sanitized_${Date.now()}@geonetra.org`,
        phone: "9" + Math.floor(100000000 + Math.random() * 900000000),
        password: "CleanPassword!99",
        role: "<script>alert('pwned')</script>\0observer"
      };

      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(maliciousPayload)
      });

      // Should either accept with sanitization or reject, but NEVER execute script or throw 500
      if (res.status >= 500) {
        throw new Error(`Server threw 500 internal error on injection payload`);
      }
    });

    // -------------------------------------------------------------
    // Test 11: Static Client-Side Asset Delivery (/index.html)
    // -------------------------------------------------------------
    await runTest("Frontend Static Asset Delivery (GET /index.html)", async () => {
      const res = await fetch(`${BASE_URL}/index.html`);
      if (res.status !== 200) {
        throw new Error(`Expected 200 OK for static portal index, got ${res.status}`);
      }
      const html = await res.text();
      if (!html.toLowerCase().includes("geonetra")) {
        throw new Error("Expected page HTML to contain GeoNetra brand title");
      }
    });

  } finally {
    await stopTestServer();
  }

  const durationMs = Date.now() - startTime;
  console.log(`\n\x1b[36m-----------------------------------------------------------------\x1b[0m`);
  console.log(`\x1b[1mTEST EXECUTION SUMMARY:\x1b[0m`);
  console.log(`  Passed:   \x1b[32m${passedCount}\x1b[0m`);
  console.log(`  Failed:   \x1b[${failedCount > 0 ? "31" : "32"}m${failedCount}\x1b[0m`);
  console.log(`  Duration: \x1b[90m${durationMs}ms\x1b[0m`);
  console.log(`\x1b[36m-----------------------------------------------------------------\x1b[0m\n`);

  if (failedCount > 0) {
    console.error(`\x1b[31m💥 Test suite finished with ${failedCount} failures.\x1b[0m\n`);
    process.exit(1);
  } else {
    console.log(`\x1b[32m✔ All ${passedCount} integration checks passed successfully.\x1b[0m\n`);
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error("Fatal test suite runner error:", err);
  process.exit(1);
});
