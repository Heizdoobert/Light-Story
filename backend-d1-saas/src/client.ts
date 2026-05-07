/**
 * Multi-tenant D1 SaaS backend client SDK.
 * Use this client in your frontend or backend to interact with the tenant provisioning and CRUD endpoints.
 */

interface ClientConfig {
  baseUrl: string;
  adminKey?: string;
  tenantKey?: string;
  tenantId?: string;
}

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  databaseId: string;
  databaseName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Story {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover_url: string;
  status: string;
  view_count: number;
  author: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export type StoryPayload = Omit<Story, "id" | "view_count" | "created_at" | "updated_at">;

interface ErrorResponse {
  error: string;
  details?: unknown;
}

function isErrorResponse(obj: unknown): obj is ErrorResponse {
  return typeof obj === "object" && obj !== null && "error" in obj;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = (await response.json()) as unknown;
    if (isErrorResponse(data)) {
      throw new Error(data.error);
    }
    throw new Error(`HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

/**
 * Admin client: provisions tenants and manages the control plane.
 */
export class AdminClient {
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    if (!config.adminKey) {
      throw new Error("AdminClient requires adminKey in config");
    }
    this.config = config;
  }

  async provisionTenant(name: string): Promise<{ tenant: TenantInfo; tenantKey: string }> {
    const response = await fetch(`${this.config.baseUrl}/tenants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": this.config.adminKey!,
      },
      body: JSON.stringify({ name }),
    });

    return handleResponse<{ tenant: TenantInfo; tenantKey: string }>(response);
  }

  async listTenants(): Promise<{ tenants: TenantInfo[] }> {
    const response = await fetch(`${this.config.baseUrl}/tenants`, {
      method: "GET",
      headers: {
        "X-Admin-Key": this.config.adminKey!,
      },
    });

    return handleResponse<{ tenants: TenantInfo[] }>(response);
  }
}

/**
 * Tenant client: performs CRUD operations within a tenant's isolated database.
 */
export class TenantClient {
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    if (!config.tenantKey || !config.tenantId) {
      throw new Error("TenantClient requires tenantKey and tenantId in config");
    }
    this.config = config;
  }

  async getTenant(): Promise<{ tenant: TenantInfo }> {
    const response = await fetch(`${this.config.baseUrl}/tenants/${this.config.tenantId}`, {
      method: "GET",
      headers: {
        "X-Tenant-Key": this.config.tenantKey!,
      },
    });

    return handleResponse<{ tenant: TenantInfo }>(response);
  }

  async listStories(): Promise<{ tenant: TenantInfo; stories: Story[] }> {
    const response = await fetch(`${this.config.baseUrl}/tenants/${this.config.tenantId}/stories`, {
      method: "GET",
      headers: {
        "X-Tenant-Key": this.config.tenantKey!,
      },
    });

    return handleResponse<{ tenant: TenantInfo; stories: Story[] }>(response);
  }

  async getStory(storyId: string): Promise<{ tenant: TenantInfo; story: Story }> {
    const response = await fetch(`${this.config.baseUrl}/tenants/${this.config.tenantId}/stories/${storyId}`, {
      method: "GET",
      headers: {
        "X-Tenant-Key": this.config.tenantKey!,
      },
    });

    return handleResponse<{ tenant: TenantInfo; story: Story }>(response);
  }

  async createStory(story: StoryPayload): Promise<{ tenant: TenantInfo; story: Story }> {
    const response = await fetch(`${this.config.baseUrl}/tenants/${this.config.tenantId}/stories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-Key": this.config.tenantKey!,
      },
      body: JSON.stringify(story),
    });

    return handleResponse<{ tenant: TenantInfo; story: Story }>(response);
  }

  async updateStory(storyId: string, story: StoryPayload): Promise<{ tenant: TenantInfo; story: Story }> {
    const response = await fetch(`${this.config.baseUrl}/tenants/${this.config.tenantId}/stories/${storyId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-Key": this.config.tenantKey!,
      },
      body: JSON.stringify(story),
    });

    return handleResponse<{ tenant: TenantInfo; story: Story }>(response);
  }

  async deleteStory(storyId: string): Promise<{ tenant: TenantInfo; deleted: boolean }> {
    const response = await fetch(`${this.config.baseUrl}/tenants/${this.config.tenantId}/stories/${storyId}`, {
      method: "DELETE",
      headers: {
        "X-Tenant-Key": this.config.tenantKey!,
      },
    });

    return handleResponse<{ tenant: TenantInfo; deleted: boolean }>(response);
  }
}
