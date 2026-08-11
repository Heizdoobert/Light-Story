import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ActionResult } from '@/actions/result';
import { rejectDbChangeToast, resolveDbChangeToast, startDbChangeToast } from '@/lib/utils/db-change-toast';

export function useCrudMutation<TVars = void>(opts: {
  mutationFn: (vars: TVars) => Promise<ActionResult>;
  queryKeys: string[][];
  successMsg: string;
  actionLabel: string | ((vars: TVars) => string);
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<ActionResult | undefined>(undefined);

  const mutateAsync = useCallback(
    async (vars?: TVars): Promise<ActionResult> => {
      setIsPending(true);
      setError(null);
      const actualVars = vars as TVars;
      const label = typeof opts.actionLabel === 'function' ? opts.actionLabel(actualVars) : opts.actionLabel;
      const toastId = startDbChangeToast(`${label}...`);

      try {
        const result = await opts.mutationFn(actualVars);
        setData(result);
        if (!result?.success) {
          rejectDbChangeToast(toastId, result?.error ?? 'Operation failed');
        } else {
          opts.queryKeys.forEach((k) => queryClient.invalidateQueries({ queryKey: k }));
          opts.onSuccess?.();
          resolveDbChangeToast(toastId, opts.successMsg);
        }
        setIsPending(false);
        return result;
      } catch (err: any) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        rejectDbChangeToast(toastId, e);
        setIsPending(false);
        throw e;
      }
    },
    [queryClient, opts],
  );

  const mutate = useCallback(
    (vars?: TVars) => {
      mutateAsync(vars).catch(() => {});
    },
    [mutateAsync],
  );

  return {
    mutate,
    mutateAsync,
    isPending,
    error,
    data,
  };
}
