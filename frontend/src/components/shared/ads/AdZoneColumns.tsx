"use client";

import { usePathname } from "next/navigation";
import { AdZone } from "@/components/shared/ads/AdZone";
import { ROUTES } from "@/lib/constants/routes";

export function AdZoneColumns() {
  const pathname = usePathname();
  if (pathname.startsWith(ROUTES.ADMIN.ROOT)) return null;

  return (
    <>
      <aside className="fixed left-0 top-24 w-[80px] h-[calc(100vh-6rem)] z-50">
        <AdZone zoneId="layout-left" format="skyscraper" label="Left" />
      </aside>
      <aside className="fixed right-0 top-24 w-[80px] h-[calc(100vh-6rem)] z-50">
        <AdZone zoneId="layout-right" format="skyscraper" label="Right" />
      </aside>
    </>
  );
}
