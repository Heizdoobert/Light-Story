#!/usr/bin/env node

/**
 * Smoke tests for the multi-tenant D1 backend.
 * Run this against a live worker to verify tenant provisioning and CRUD operations.
 *
 * Usage: node smoke-tests.mjs
 *
 * Environment variables:
 * - BACKEND_URL: base URL of the backend worker (default: http://localhost:8787)
 * - ADMIN_KEY: admin API key for provisioning
 */

const BASE_URL = process.env.BACKEND_URL || "http://localhost:8787";
const ADMIN_KEY = process.env.ADMIN_KEY || "test-admin-key-12345";

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
};

function log(message, color = "reset") {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

async function apiCall(method, path, body = null, headers = {}) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": ADMIN_KEY,
      ...headers,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`${response.status}: ${data.error || response.statusText}`);
  }

  return data;
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Health check
    log("\n✓ Test 1: Health check", "yellow");
    try {
      await apiCall("GET", "/health");
      log("  PASS: Backend is running", "green");
      passed++;
    } catch (e) {
      log(`  FAIL: ${e.message}`, "red");
      failed++;
    }

    // Test 2: Provision a tenant
    log("\n✓ Test 2: Provision a tenant", "yellow");
    let tenantId = "";
    let tenantKey = "";
    try {
      const result = await apiCall("POST", "/tenants", { name: "Smoke Test Tenant" });
      tenantId = result.tenant.id;
      tenantKey = result.tenantKey;
      log(`  PASS: Tenant provisioned (id=${tenantId.slice(0, 8)}...)`, "green");
      passed++;
    } catch (e) {
      log(`  FAIL: ${e.message}`, "red");
      failed++;
    }

    if (!tenantId) {
      log("  SKIP: Remaining tests require a tenant", "yellow");
      return { passed, failed };
    }

    // Test 3: List tenants
    log("\n✓ Test 3: List tenants", "yellow");
    try {
      const result = await apiCall("GET", "/tenants");
      if (Array.isArray(result.tenants) && result.tenants.length > 0) {
        log(`  PASS: Retrieved ${result.tenants.length} tenant(s)`, "green");
        passed++;
      } else {
        throw new Error("No tenants returned");
      }
    } catch (e) {
      log(`  FAIL: ${e.message}`, "red");
      failed++;
    }

    // Test 4: Get tenant info
    log("\n✓ Test 4: Get tenant info", "yellow");
    try {
      const result = await apiCall("GET", `/tenants/${tenantId}`, null, {
        "X-Tenant-Key": tenantKey,
      });
      if (result.tenant.id === tenantId && result.tenant.status === "ready") {
        log(`  PASS: Retrieved tenant ${result.tenant.slug}`, "green");
        passed++;
      } else {
        throw new Error("Tenant data mismatch");
      }
    } catch (e) {
      log(`  FAIL: ${e.message}`, "red");
      failed++;
    }

    // Test 5: Create a story
    log("\n✓ Test 5: Create a story", "yellow");
    let storyId = "";
    try {
      const result = await apiCall(
        "POST",
        `/tenants/${tenantId}/stories`,
        {
          title: "Test Story",
          slug: "test-story",
          description: "This is a test story.",
          cover_url: "",
          status: "ongoing",
          author: "Smoke Test Author",
          category: JSON.stringify(["Action"]),
        },
        { "X-Tenant-Key": tenantKey },
      );
      storyId = result.story.id;
      log(`  PASS: Story created (id=${storyId.slice(0, 8)}...)`, "green");
      passed++;
    } catch (e) {
      log(`  FAIL: ${e.message}`, "red");
      failed++;
    }

    // Test 6: List stories
    log("\n✓ Test 6: List stories", "yellow");
    try {
      const result = await apiCall("GET", `/tenants/${tenantId}/stories`, null, {
        "X-Tenant-Key": tenantKey,
      });
      if (Array.isArray(result.stories) && result.stories.length > 0) {
        log(`  PASS: Retrieved ${result.stories.length} story(s)`, "green");
        passed++;
      } else {
        throw new Error("No stories returned");
      }
    } catch (e) {
      log(`  FAIL: ${e.message}`, "red");
      failed++;
    }

    // Test 7: Get single story
    log("\n✓ Test 7: Get single story", "yellow");
    try {
      const result = await apiCall("GET", `/tenants/${tenantId}/stories/${storyId}`, null, {
        "X-Tenant-Key": tenantKey,
      });
      if (result.story.id === storyId) {
        log(`  PASS: Retrieved story "${result.story.title}"`, "green");
        passed++;
      } else {
        throw new Error("Story mismatch");
      }
    } catch (e) {
      log(`  FAIL: ${e.message}`, "red");
      failed++;
    }

    // Test 8: Update a story
    log("\n✓ Test 8: Update a story", "yellow");
    try {
      const result = await apiCall(
        "PUT",
        `/tenants/${tenantId}/stories/${storyId}`,
        {
          title: "Updated Story",
          slug: "updated-story",
          description: "This is updated.",
          cover_url: "",
          status: "completed",
          author: "Smoke Test Author",
          category: JSON.stringify(["Action", "Drama"]),
        },
        { "X-Tenant-Key": tenantKey },
      );
      if (result.story.title === "Updated Story") {
        log(`  PASS: Story updated`, "green");
        passed++;
      } else {
        throw new Error("Update failed");
      }
    } catch (e) {
      log(`  FAIL: ${e.message}`, "red");
      failed++;
    }

    // Test 9: Delete a story
    log("\n✓ Test 9: Delete a story", "yellow");
    try {
      const result = await apiCall("DELETE", `/tenants/${tenantId}/stories/${storyId}`, null, {
        "X-Tenant-Key": tenantKey,
      });
      if (result.deleted) {
        log(`  PASS: Story deleted`, "green");
        passed++;
      } else {
        throw new Error("Delete failed");
      }
    } catch (e) {
      log(`  FAIL: ${e.message}`, "red");
      failed++;
    }

    // Test 10: Verify tenant isolation (cannot access other tenant's data)
    log("\n✓ Test 10: Verify tenant isolation", "yellow");
    try {
      // Try to access stories with wrong tenant key
      await apiCall("GET", `/tenants/${tenantId}/stories`, null, {
        "X-Tenant-Key": "wrong-key",
      });
      log(`  FAIL: Tenant isolation violated`, "red");
      failed++;
    } catch (e) {
      if (e.message.includes("401") || e.message.includes("403")) {
        log(`  PASS: Request correctly rejected`, "green");
        passed++;
      } else {
        log(`  FAIL: ${e.message}`, "red");
        failed++;
      }
    }
  } catch (e) {
    log(`\nUnexpected error: ${e.message}`, "red");
    failed++;
  }

  log("\n" + "=".repeat(50), "yellow");
  log(`Results: ${passed} passed, ${failed} failed`, failed > 0 ? "red" : "green");
  log("=".repeat(50), "yellow");

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((e) => {
  log(`Fatal error: ${e.message}`, "red");
  process.exit(1);
});
