import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ActionResult } from '@/actions/result';
import { rejectDbChangeToast, resolveDbChangeToast, startDbChangeToast } from '@/lib/utils/dbChangeToast';

export function useCrudMutation<TVars = void>(opts: {
  mutationFn: (vars: TVars) => Promise<ActionResult>;
  queryKeys: string[][];
  successMsg: string;
  actionLabel: string | ((vars: TVars) => string);
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  return useMutation<ActionResult, Error, TVars, { toastId?: string | number }>({
    mutationFn: opts.mutationFn,
    onMutate: (vars) => {
      const label = typeof opts.actionLabel === 'function' ? opts.actionLabel(vars) : opts.actionLabel;
      const toastId = startDbChangeToast(`${label}...`);
      return { toastId };
    },
    onSuccess: (data, _vars, context) => {
      if (!data?.success) {
        rejectDbChangeToast(context?.toastId, data?.error ?? 'Operation failed');
        return;
      }
      opts.queryKeys.forEach(k => queryClient.invalidateQueries({ queryKey: k }));
      opts.onSuccess?.();
      resolveDbChangeToast(context?.toastId, opts.successMsg);
    },
    onError: (error, _vars, context) => rejectDbChangeToast(context?.toastId, error),
  });
}
