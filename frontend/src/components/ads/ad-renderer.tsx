"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  parseSiteSettingsRows,
  type AdSlotKey,
  validateAdMarkup,
} from "@/lib/admin/ad-policy";

type SiteSettingItem = { key: string; value: unknown };

type AdPosition = "header" | "middle" | "sidebar" | "left_side" | "right_side";

const SLOT_CLASSES: Record<AdSlotKey, string> = {
  ad_header: "mb-6",
  ad_middle: "my-8",
  ad_sidebar: "sticky top-6",
  ad_left_side: "",
  ad_right_side: "",
};

const SLOT_KEY_BY_POSITION: Record<AdPosition, AdSlotKey> = {
  header: "ad_header",
  middle: "ad_middle",
  sidebar: "ad_sidebar",
  left_side: "ad_left_side",
  right_side: "ad_right_side",
};

const fetchAdRuntime = async (): Promise<SiteSettingItem[]> => [] as SiteSettingItem[];

export default function AdRenderer({ position }: { position: AdPosition }) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasInjectedRef = useRef(false);
  const pendingTaskRef = useRef<number | null>(null);
  const refreshTaskRef = useRef<number | null>(null);
  const previousMarkupRef = useRef("");
  const [isVisible, setIsVisible] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [renderCycle, setRenderCycle] = useState(0);

  const slotKey = SLOT_KEY_BY_POSITION[position];

  const { data } = useQuery({
    queryKey: ["site_settings", "ad_runtime"],
    queryFn: fetchAdRuntime,
    staleTime: 20_000,
    gcTime: 300_000,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });

  const parsed = useMemo(
    () =>
      parseSiteSettingsRows(
        (data ?? []).map(({ key, value }) => ({ key, value })),
      ),
    [data],
  );

  const runtime = parsed.runtime;
  const markup = (parsed.slotMarkup[slotKey] ?? "").trim();

  const clearInjectionTask = () => {
    if (pendingTaskRef.current !== null) {
      if (typeof cancelIdleCallback === "function")
        cancelIdleCallback(pendingTaskRef.current);
      else clearTimeout(pendingTaskRef.current);
      pendingTaskRef.current = null;
    }
  };

  const clearRefreshTask = () => {
    if (refreshTaskRef.current !== null) {
      clearTimeout(refreshTaskRef.current);
      refreshTaskRef.current = null;
    }
  };

  const injectMarkup = (markupToInject: string) => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    const fragment = document
      .createRange()
      .createContextualFragment(markupToInject);
    containerRef.current.appendChild(fragment);
  };

  // Reset everything on route or slot change
  useEffect(() => {
    clearInjectionTask();
    clearRefreshTask();
    hasInjectedRef.current = false;
    setIsVisible(false);
    setPolicyError(null);
    setRenderCycle(0);
    previousMarkupRef.current = "";
    if (containerRef.current) containerRef.current.innerHTML = "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, slotKey]);

  // Reset when markup changes or ads disabled
  useEffect(() => {
    if (!runtime.enabled) {
      clearInjectionTask();
      clearRefreshTask();
      hasInjectedRef.current = false;
      setPolicyError(null);
      setRenderCycle(0);
      previousMarkupRef.current = "";
      if (containerRef.current) containerRef.current.innerHTML = "";
      return;
    }
    if (previousMarkupRef.current !== markup) {
      clearInjectionTask();
      clearRefreshTask();
      hasInjectedRef.current = false;
      setPolicyError(null);
      setRenderCycle(0);
      if (containerRef.current) containerRef.current.innerHTML = "";
      previousMarkupRef.current = markup;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markup, runtime.enabled]);

  // IntersectionObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [pathname, slotKey]);

  // Injection
  useEffect(() => {
    if (!runtime.enabled || !markup || !isVisible) return;
    if (hasInjectedRef.current) return;
    const validation = validateAdMarkup(markup, runtime);
    if (!validation.ok) {
      setPolicyError(validation.reason);
      return;
    }
    clearInjectionTask();
    const task = () => {
      try {
        injectMarkup(markup);
        hasInjectedRef.current = true;
        setRenderCycle((v) => v + 1);
      } catch {
        setPolicyError("Failed to render ad markup.");
      } finally {
        pendingTaskRef.current = null;
      }
    };
    if (typeof requestIdleCallback === "function") {
      pendingTaskRef.current = requestIdleCallback(task, { timeout: 2000 });
    } else {
      pendingTaskRef.current = window.setTimeout(task, 0);
    }
    return clearInjectionTask;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isVisible,
    markup,
    renderCycle,
    runtime.enabled,
    runtime.allowedHosts,
    runtime.blockedTerms,
    runtime.minHeight,
    runtime.refreshSeconds,
  ]);

  // Refresh cycle
  useEffect(() => {
    if (
      !isVisible ||
      !markup ||
      !runtime.enabled ||
      runtime.refreshSeconds <= 0
    )
      return;
    clearRefreshTask();
    refreshTaskRef.current = window.setTimeout(() => {
      if (containerRef.current) containerRef.current.innerHTML = "";
      hasInjectedRef.current = false;
      setRenderCycle((v) => v + 1);
    }, runtime.refreshSeconds * 1000);
    return clearRefreshTask;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, markup, renderCycle, runtime.enabled, runtime.refreshSeconds]);

  if (!runtime.enabled || !markup) return null;

  return (
    <section
      className={`ad-container overflow-hidden rounded-xl border border-slate-200/70 bg-slate-100/60 dark:border-slate-800/70 dark:bg-slate-900/50 ${SLOT_CLASSES[slotKey]}`}
      style={{ minHeight: `${runtime.minHeight}px` }}
      aria-live="polite"
      data-ad-position={position}
    >
      <div
        ref={containerRef}
        className="flex min-h-[inherit] w-full items-center justify-center"
        data-ad-slot={slotKey}
      />
      {policyError && (
        <p className="px-3 pb-3 text-center text-[11px] font-semibold text-amber-700 dark:text-amber-400">
          Ad hidden by content policy.
        </p>
      )}
    </section>
  );
}
