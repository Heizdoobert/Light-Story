/**
 * Translates technical error messages into user-friendly notifications.
 */
export const getErrorMessage = (error: any, context?: string): string => {
  const message = error?.message || String(error);
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

  if (lowercaseMessage.includes("duplicate key")) {
    return "Data already exists in the system. Please review your input.";
  }

  // Auth Specific Errors
  if (lowercaseMessage.includes("invalid login credentials")) {
    return "Email or password is incorrect. Please try again.";
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

  return "An error occurred. Please try again in a moment.";
};
