import { SentryDashboard } from "@/components/admin/sentry/sentry-dashboard";

export default function AdminSentryPage() {
  return (
    <SentryDashboard
      org={process.env.SENTRY_ORG || "dutteam"}
      project={process.env.SENTRY_PROJECT || "javascript-nextjs"}
    />
  );
}
