/**
 * Enhanced provisioning with rollback and recovery support.
 * This module handles tenant database provisioning with error recovery.
 */

interface ProvisioningState {
  tenantId: string;
  step: "init" | "database_created" | "schema_bootstrapped" | "ready" | "failed";
  databaseId?: string;
  databaseName?: string;
  error?: string;
  timestamp: number;
  attempts: number;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run<T = Record<string, unknown>>(): Promise<T>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

/**
 * Transactional provisioning client that supports rollback and recovery.
 */
export class TransactionalProvisioningClient {
  constructor(
    private readonly env: any,
    private readonly control: any,
    private readonly cloudflareClient: any,
  ) {}

  /**
   * Provision a tenant with automatic rollback on failure.
   */
  async provisionWithRollback(
    tenantId: string,
    tenantSlug: string,
    name: string,
    databaseName: string,
    apiKeyHash: string,
  ): Promise<{ success: boolean; databaseId?: string; error?: string }> {
    const maxAttempts = 3;
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxAttempts) {
      attempt += 1;

      try {
        // Step 1: Create the D1 database
        const provisioned = await this.cloudflareClient.createDatabase(databaseName);

        // Step 2: Create tenant record in control plane with "provisioning" status
        await this.control.createTenant({
          id: tenantId,
          slug: tenantSlug,
          name,
          database_id: provisioned.id,
          database_name: provisioned.name,
          api_key_hash: apiKeyHash,
          status: "provisioning",
        });

        // Step 3: Bootstrap the database schema
        try {
          await this.cloudflareClient.bootstrapDatabase(provisioned.id);
        } catch (bootstrapError) {
          // If bootstrap fails, mark tenant as "failed_bootstrap" for recovery
          await this.control.updateTenantStatus(tenantId, "failed_bootstrap");
          throw new Error(`Schema bootstrap failed: ${(bootstrapError as Error).message}`);
        }

        // Step 4: Mark tenant as ready
        await this.control.markReady(tenantId);

        return { success: true, databaseId: provisioned.id };
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxAttempts) {
          // Wait before retrying (exponential backoff: 1s, 2s, 4s)
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }

        // All attempts exhausted, attempt rollback
        try {
          await this.rollbackTenant(tenantId);
        } catch (rollbackError) {
          console.error(`Rollback failed for tenant ${tenantId}:`, rollbackError);
        }

        return { success: false, error: lastError.message };
      }
    }

    return { success: false, error: lastError?.message || "Unknown error" };
  }

  /**
   * Recover a failed provisioning attempt.
   */
  async recoverProvisioning(tenantId: string): Promise<{ success: boolean; message: string }> {
    const tenant = await this.control.getTenantById(tenantId);

    if (!tenant) {
      return { success: false, message: "Tenant not found" };
    }

    if (tenant.status === "ready") {
      return { success: true, message: "Tenant is already provisioned" };
    }

    if (tenant.status === "failed_bootstrap" && tenant.database_id) {
      // Try to bootstrap again
      try {
        await this.cloudflareClient.bootstrapDatabase(tenant.database_id);
        await this.control.markReady(tenantId);
        return { success: true, message: "Tenant recovered and marked ready" };
      } catch (error) {
        return { success: false, message: `Recovery failed: ${(error as Error).message}` };
      }
    }

    if (tenant.status === "provisioning") {
      return { success: false, message: "Provisioning is in progress, please wait" };
    }

    return { success: false, message: `Cannot recover tenant in status: ${tenant.status}` };
  }

  /**
   * Rollback a failed provisioning attempt.
   * This removes the tenant record and can optionally delete the database.
   */
  private async rollbackTenant(tenantId: string): Promise<void> {
    try {
      const tenant = await this.control.getTenantById(tenantId);

      if (!tenant) {
        return; // Already gone
      }

      // Remove from control plane (optional: could mark as "deleted" instead)
      await this.control.deleteTenant(tenantId);

      // Optionally delete the database (commented out for safety)
      // if (tenant.database_id) {
      //   await this.cloudflareClient.deleteDatabase(tenant.database_id);
      // }
    } catch (error) {
      console.error(`Rollback error for tenant ${tenantId}:`, error);
      throw error;
    }
  }
}

/**
 * Extended control plane repository with recovery operations.
 */
export class ExtendedControlPlaneRepository {
  constructor(private readonly db: D1Database) {}

  async updateTenantStatus(tenantId: string, status: string): Promise<void> {
    await this.db
      .prepare(`UPDATE tenants SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(status, tenantId)
      .run();
  }

  async deleteTenant(tenantId: string): Promise<void> {
    await this.db.prepare(`DELETE FROM tenants WHERE id = ?`).bind(tenantId).run();
  }

  async listFailedTenants(): Promise<Array<{ id: string; slug: string; status: string }>> {
    const result = await this.db
      .prepare(`SELECT id, slug, status FROM tenants WHERE status IN ('failed', 'failed_bootstrap', 'provisioning') ORDER BY updated_at DESC`)
      .all<{ id: string; slug: string; status: string }>();

    return result.results;
  }

  async getTenantById(id: string): Promise<any> {
    return this.db
      .prepare(
        `SELECT id, slug, name, database_id, database_name, api_key_hash, status, created_at, updated_at FROM tenants WHERE id = ? LIMIT 1`,
      )
      .bind(id)
      .first();
  }

  async createTenant(row: any): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO tenants (id, slug, name, database_id, database_name, api_key_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(row.id, row.slug, row.name, row.database_id, row.database_name, row.api_key_hash, row.status)
      .run();
  }

  async markReady(id: string): Promise<void> {
    await this.db
      .prepare(`UPDATE tenants SET status = 'ready', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(id)
      .run();
  }
}
