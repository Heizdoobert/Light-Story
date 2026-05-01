import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { parseSiteSettingsRows, type AdSlotKey, validateAdMarkup } from '@/lib/adPolicy';

type SiteSettingItem = { key: string; value: unknown };

interface AdRendererProps {
  position: 'header' | 'middle' | 'sidebar';
}

const SLOT_CLASSES: Record<AdSlotKey, string> = {
  ad_header: 'mb-6',
  ad_middle: 'my-8',
  ad_sidebar: 'sticky top-6',
};

const slotKeyByPosition: Record<AdRendererProps['position'], AdSlotKey> = {
  header: 'ad_header',
  middle: 'ad_middle',
  sidebar: 'ad_sidebar',
};

const fetchAdRuntime = async (): Promise<SiteSettingItem[]> => {
  const res = await fetch('/api/site-settings?scope=public', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch ad settings');
  }

  const json = (await res.json()) as { data?: SiteSettingItem[] };
  return Array.isArray(json.data) ? json.data : [];
};

const injectMarkup = (container: HTMLDivElement, markup: string): void => {
  container.innerHTML = '';

  const range = document.createRange();
  const fragment = range.createContextualFragment(markup);
  container.appendChild(fragment);
};

export const AdRenderer: React.FC<AdRendererProps> = ({ position }) => {
  const slotKey = slotKeyByPosition[position];
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const hasInjectedRef = useRef(false);
  const pendingTaskRef = useRef<number | null>(null);
  const refreshTaskRef = useRef<number | null>(null);
  const previousMarkupRef = useRef<string>('');
  const [isVisible, setIsVisible] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [renderCycle, setRenderCycle] = useState(0);

  const { data } = useQuery({
    queryKey: ['site_settings', 'ad_runtime'],
    queryFn: fetchAdRuntime,
    staleTime: 20_000,
    gcTime: 300_000,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });

  const parsed = useMemo(() => {
    return parseSiteSettingsRows((data ?? []).map((item) => ({ key: item.key, value: item.value })));
  }, [data]);

  const runtime = parsed.runtime;
  const markup = parsed.slotMarkup[slotKey].trim();

  const clearInjectionTask = () => {
    if (pendingTaskRef.current === null) return;

    if (typeof pendingTaskRef.current === 'number' && 'cancelIdleCallback' in window) {
      window.cancelIdleCallback(pendingTaskRef.current);
    } else {
      globalThis.clearTimeout(pendingTaskRef.current);
    }

    pendingTaskRef.current = null;
  };

  const clearRefreshTask = () => {
    if (refreshTaskRef.current !== null) {
      globalThis.clearTimeout(refreshTaskRef.current);
      refreshTaskRef.current = null;
    }
  };

  useEffect(() => {
    hasInjectedRef.current = false;
    setIsVisible(false);
    setPolicyError(null);
    clearInjectionTask();
    clearRefreshTask();
    previousMarkupRef.current = '';

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
  }, [pathname, slotKey]);

  useEffect(() => {
    if (!runtime.enabled) {
      hasInjectedRef.current = false;
      setIsVisible(false);
      setPolicyError(null);
      clearInjectionTask();
      clearRefreshTask();
      previousMarkupRef.current = markup;

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      return;
    }

    if (previousMarkupRef.current && previousMarkupRef.current !== markup) {
      hasInjectedRef.current = false;
      setIsVisible(false);
      setPolicyError(null);
      clearInjectionTask();
      clearRefreshTask();

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    }

    previousMarkupRef.current = markup;
  }, [markup, runtime.enabled]);

  useEffect(() => {
    clearInjectionTask();

    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [pathname, slotKey]);

  useEffect(() => {
    clearInjectionTask();

    if (!runtime.enabled || !markup || !isVisible) return;
    const node = containerRef.current;
    if (!node || hasInjectedRef.current) return;

    const validation = validateAdMarkup(markup, runtime);
    if (!validation.ok) {
      setPolicyError(validation.reason);
      return;
    }

    const run = () => {
      const current = containerRef.current;
      if (!current || hasInjectedRef.current) return;

      try {
        injectMarkup(current, markup);
        hasInjectedRef.current = true;
        setRenderCycle((value) => value + 1);
      } catch {
        setPolicyError('Failed to render ad markup.');
      }
    };

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(run, { timeout: 2000 });
      pendingTaskRef.current = idleId;
      return () => {
        if (typeof pendingTaskRef.current === 'number' && 'cancelIdleCallback' in window) {
          window.cancelIdleCallback(pendingTaskRef.current);
          pendingTaskRef.current = null;
        }
      };
    }

    const timeoutId = globalThis.setTimeout(run, 0) as unknown as number;
    pendingTaskRef.current = timeoutId;
    return () => {
      clearInjectionTask();
    };
  }, [isVisible, markup, renderCycle, runtime.enabled, runtime.allowedHosts, runtime.blockedTerms, runtime.minHeight, runtime.refreshSeconds]);

  useEffect(() => {
    clearRefreshTask();

    if (!runtime.enabled || !markup || !isVisible || !hasInjectedRef.current) return;

    refreshTaskRef.current = window.setTimeout(() => {
      const current = containerRef.current;
      if (current) {
        current.innerHTML = '';
      }

      hasInjectedRef.current = false;
      setRenderCycle((value) => value + 1);
    }, runtime.refreshSeconds * 1000);

    return () => {
      clearRefreshTask();
    };
  }, [isVisible, markup, renderCycle, runtime.enabled, runtime.refreshSeconds]);

  useEffect(() => {
    if (!runtime.enabled) {
      hasInjectedRef.current = false;
      setPolicyError(null);
      setIsVisible(false);
      clearInjectionTask();
      clearRefreshTask();
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      return;
    }

    if (!markup) {
      hasInjectedRef.current = false;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    }
  }, [markup, runtime.enabled]);

  if (!runtime.enabled) return null;

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
      {policyError ? (
        <p className="px-3 pb-3 text-center text-[11px] font-semibold text-amber-700 dark:text-amber-400">
          Ad hidden by content policy.
        </p>
      ) : null}
    </section>
  );
};
