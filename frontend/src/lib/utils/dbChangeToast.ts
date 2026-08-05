import { toast } from 'sonner';
import { getErrorMessage } from './errorUtils';

type DbToastContext = {
  loading: string;
  success: string;
  errorContext?: string;
};

export const startDbChangeToast = (message: string): string | number => {
  return toast.loading(message);
};

export const resolveDbChangeToast = (
  toastId: string | number | undefined,
  successMessage: string,
): void => {
  if (toastId !== undefined) {
    toast.dismiss(toastId);
  }
  toast.success(successMessage);
};

export const rejectDbChangeToast = (
  toastId: string | number | undefined,
  error: unknown,
  context?: string,
): void => {
  if (toastId !== undefined) {
    toast.dismiss(toastId);
  }
  toast.error(getErrorMessage(error, context));
};

export const dbToastContext = (
  loading: string,
  success: string,
  errorContext?: string,
): DbToastContext => ({ loading, success, errorContext });
