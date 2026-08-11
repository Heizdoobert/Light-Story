import { toast } from "sonner";
import { getErrorMessage } from "./error-utils";

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
