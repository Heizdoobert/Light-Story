/**
 * Admin client tests: provisioning and management operations.
 */

import { AdminClient } from "../client";

const TEST_BASE_URL = "http://localhost:8787";
const TEST_ADMIN_KEY = "test-admin-key-12345";

describe("AdminClient", () => {
  const client = new AdminClient({
    baseUrl: TEST_BASE_URL,
    adminKey: TEST_ADMIN_KEY,
  });

  test("provisions a new tenant", async () => {
    const response = await client.provisionTenant("Test Company");

    expect(response.tenant).toBeDefined();
    expect(response.tenant.id).toBeTruthy();
    expect(response.tenant.slug).toBe("test-company");
    expect(response.tenant.status).toBe("ready");
    expect(response.tenantKey).toBeTruthy();
  });

  test("rejects invalid admin key", async () => {
    const badClient = new AdminClient({
      baseUrl: TEST_BASE_URL,
      adminKey: "wrong-key",
    });

    await expect(badClient.provisionTenant("Test")).rejects.toThrow("Unauthorized");
  });

  test("lists all tenants", async () => {
    const response = await client.listTenants();

    expect(Array.isArray(response.tenants)).toBe(true);
    expect(response.tenants.length).toBeGreaterThan(0);
  });
});
