/**
 * Translates technical error messages into user-friendly notifications.
 */
export const getErrorMessage = (error: unknown, context?: string): string => {
  const extractMessage = (): string => {
    if (!error) return "";

    if (typeof error === "string") return error;

    const errObj = error as Record<string, unknown>;
    const nested = errObj.error as unknown;
    if (
      nested &&
      typeof nested === "object" &&
      typeof (nested as { message?: unknown }).message === "string"
    )
      return (nested as { message: string }).message;
    if (typeof nested === "string") return nested;
    if (typeof errObj.message === "string") return errObj.message;
    if (typeof errObj.error_description === "string")
      return errObj.error_description;
    if (typeof errObj.details === "string") return errObj.details;
    if (typeof errObj.hint === "string") return errObj.hint;

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  };

  const message = extractMessage();
  const lowercaseMessage = message.toLowerCase();

  // Network & Connection Issues
  if (
    lowercaseMessage.includes("network") ||
    lowercaseMessage.includes("fetch") ||
    lowercaseMessage.includes("internet")
  ) {
    return "Unable to connect to the server. Please check your internet connection.";
  }

  // Supabase/Database Specific Errors
  if (lowercaseMessage.includes("pgrst116")) {
    // JSON single object error
    return "Data does not exist or has been deleted.";
  }

  if (
    lowercaseMessage.includes("insufficient permissions") ||
    lowercaseMessage.includes("permission denied")
  ) {
    return "You do not have permission to perform this action. Please verify your account permissions.";
  }

  if (
    typeof error !== 'number' &&
    (lowercaseMessage.includes("401") ||
      lowercaseMessage.includes("unauthorized"))
  ) {
    return "Your session has expired. Please sign in again.";
  }

  if (
    typeof error !== 'number' &&
    (lowercaseMessage.includes("403") ||
      lowercaseMessage.includes("forbidden"))
  ) {
    return "You do not have permission to perform this action.";
  }

  if (
    typeof error !== 'number' &&
    (lowercaseMessage.includes("404") ||
      lowercaseMessage.includes("not found"))
  ) {
    return "The requested resource was not found.";
  }

  if (lowercaseMessage.includes("duplicate key")) {
    return "Data already exists in the system. Please review your input.";
  }

  // Auth Specific Errors
  if (lowercaseMessage.includes("email not confirmed")) {
    return "Please verify your email before signing in. Check your inbox for the confirmation link.";
  }

  if (lowercaseMessage.includes("invalid login credentials")) {
    return "Email or password is incorrect. Please try again.";
  }

  if (message && message !== "[object Object]") {
    return message;
  }

  // Context-based fallbacks
  if (context === "fetch_stories")
    return "Unable to load the story list. Please refresh the page.";
  if (context === "save_story")
    return "Unable to create a new story. Please check the input fields.";
  if (context === "save_chapter")
    return "Unable to create a new chapter. Please check the input fields.";
  if (context === "update_settings")
    return "Unable to update settings. Please try again later.";
  if (context === "update_profile")
    return "Unable to update profile information. Please verify your account permissions and try again.";

  return "An error occurred. Please try again in a moment.";
};
