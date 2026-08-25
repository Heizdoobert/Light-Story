"use client";

import { ROUTES } from "@/lib/constants/routes";
import { useRoleGuard } from "@/hooks/common/use-role-guard";

export function SentryDashboard({
  org,
  project,
}: {
  org: string;
  project: string;
}) {
  useRoleGuard(["superadmin"], ROUTES.ADMIN.DASHBOARD);

  return (
    <div className="flex h-full min-h-[70vh] flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sentry</h1>
        <a
          href={`https://sentry.io/organizations/${org}/projects/${project}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          Mở trong tab mới →
        </a>
      </div>
      <iframe
        title="Sentry Dashboard"
        src={`https://sentry.io/organizations/${org}/projects/${project}/`}
        className="h-full min-h-[60vh] w-full rounded-lg border"
      />
    </div>
  );
}
