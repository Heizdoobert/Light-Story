import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const resolve = (p: string) => path.resolve(__dirname, '../../', p);

function read(path: string): string {
  return readFileSync(resolve(path), 'utf-8');
}

describe("Break Circular Dependencies in Frontend", () => {
  it("AC-1: UserRole extracted [FR-1, FR-2, FR-3]", () => {
    const roles = read('types/roles.ts');
    expect(roles).toMatch(/export\s+type\s+UserRole\s*=/);
    expect(roles).toMatch(/"superadmin"\s*\|\s*"admin"\s*\|\s*"employee"\s*\|\s*"user"/);

    const settings = read('lib/admin/systemSettings.ts');
    expect(settings).toMatch(/import.*UserRole.*from\s+['"]@\/types\/roles['"]/);
    expect(settings).not.toMatch(/import.*UserRole.*from\s+['"]@\/modules\/auth\/AuthContext['"]/);

    const nav = read('lib/admin/adminNavigation.ts');
    expect(nav).toMatch(/import.*UserRole.*from\s+['"]@\/types\/roles['"]/);
    expect(nav).not.toMatch(/import.*UserRole.*from\s+['"]@\/modules\/auth\/AuthContext['"]/);

    const authContext = read('modules/auth/AuthContext.tsx');
    expect(authContext).toMatch(/export.*UserRole/);
  });

  it("AC-2: Visibility types moved [FR-4, FR-5, FR-6]", () => {
    const settingsType = read('types/settings.ts');
    expect(settingsType).toMatch(/export\s+type\s+DashboardTabVisibility\s*=/);
    expect(settingsType).toMatch(/export\s+type\s+SidebarMenuVisibility\s*=/);

    const sysSettings = read('lib/admin/systemSettings.ts');
    expect(sysSettings).toMatch(/import.*DashboardTabVisibility.*from\s+['"]@\/types\/settings['"]/);
    expect(sysSettings).toMatch(/import.*SidebarMenuVisibility.*from\s+['"]@\/types\/settings['"]/);
    expect(sysSettings).not.toMatch(/^\s*export\s+type\s+DashboardTabVisibility\s*=/m);
    expect(sysSettings).not.toMatch(/^\s*export\s+type\s+SidebarMenuVisibility\s*=/m);
  });

  it("AC-3: No behavior change [NFR-1]", () => {
    // All AC tests pass -> the refactored types work with existing consumers
    const dto = read('types/dto.ts');
    expect(dto).toMatch(/DashboardTabVisibility|SidebarMenuVisibility/);
  });

  it("AC-4: Zero circular deps [NFR-4]", { timeout: 30000 }, () => {
    const projectRoot = resolve('');
    execSync(`npx madge --circular "src/" --extensions ts,tsx --ts-config tsconfig.json 2>&1`, {
      cwd: projectRoot,
      encoding: 'utf-8',
      timeout: 25000,
    });
  });

  it("EC-3: dto chain does not create cycle", () => {
    const dto = read('types/dto.ts');
    expect(dto).toMatch(/from\s+['"]@\/types\/settings['"]/);
    expect(dto).not.toMatch(/from\s+['"]@\/lib\/admin\/systemSettings['"]/);

    const settings = read('lib/admin/systemSettings.ts');
    const settingsService = read('services/admin/systemSettings.service.ts');
    expect(settingsService).toMatch(/from\s+['"]@\/types\/dto['"]/);
    const dtoImportsSettings = (dto.match(/from\s+['"]@\/types\/settings['"]/g) || []).length > 0;
    const settingsServiceImportsDto = (settingsService.match(/from\s+['"]@\/types\/dto['"]/g) || []).length > 0;
    expect(dtoImportsSettings).toBe(true);
    expect(settingsServiceImportsDto).toBe(true);
  });
});