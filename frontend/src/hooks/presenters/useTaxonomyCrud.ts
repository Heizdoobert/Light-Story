import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rejectDbChangeToast, resolveDbChangeToast, startDbChangeToast } from '@/lib/utils/dbChangeToast';

export function useCrudMutation<TData, TVars = void>(opts: {
  mutationFn: (vars: TVars) => Promise<TData>;
  queryKeys: string[][];
  successMsg: string;
  actionLabel: string | ((vars: TVars) => string);
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: opts.mutationFn,
    onMutate: (vars) => {
      const label = typeof opts.actionLabel === 'function' ? opts.actionLabel(vars) : opts.actionLabel;
      const toastId = startDbChangeToast(`${label}...`);
      return { toastId };
    },
    onSuccess: (_data, _vars, context) => {
      opts.queryKeys.forEach(k => queryClient.invalidateQueries({ queryKey: k }));
      opts.onSuccess?.();
      resolveDbChangeToast(context?.toastId, opts.successMsg);
    },
    onError: (error, _vars, context) => rejectDbChangeToast(context?.toastId, error),
  });
}
