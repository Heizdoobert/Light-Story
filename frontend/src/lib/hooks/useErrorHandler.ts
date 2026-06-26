"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { ApiError, ValidationError, UnauthorizedError, NotFoundError } from "@/lib/errors";

/**
 * Phase 1 core hook: Centralized error handling.
 * Provides user-friendly error notifications and logging.
 */
export function useErrorHandler() {
  const getErrorMessage = useCallback((error: any, context?: string): string => {
    const extractMessage = (): string => {
      if (!error) return "";

      if (typeof error === "string") return error;

      if (error?.message && typeof error.message === "string") {
        return error.message;
      }

      if (error?.error_description && typeof error.error_description === "string") {
        return error.error_description;
      }

      if (error?.details && typeof error.details === "string") {
        return error.details;
      }

      if (error?.hint && typeof error.hint === "string") {
        return error.hint;
      }

      try {
        return JSON.stringify(error);
      } catch {
        return String(error);
      }
    };

    const message = extractMessage();
    const lowercaseMessage = message.toLowerCase();

    // Domain errors
    if (error instanceof UnauthorizedError) {
      return "You are not authorized to perform this action.";
    }

    if (error instanceof NotFoundError) {
      return error.message;
    }

    if (error instanceof ValidationError) {
      return error.message;
    }

    if (error instanceof ApiError) {
      if (error.status === 401) return "Your session has expired. Please log in again.";
      if (error.status === 403) return "You do not have permission to perform this action.";
      if (error.status === 404) return "The requested resource was not found.";
      if (error.status === 429) return "Too many requests. Please try again later.";
      if (error.status >= 500) return "Server error occurred. Please try again later.";
    }

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
    if (context === "upload_file")
      return "Failed to upload file. Please try again.";
    if (context === "delete_item")
      return "Failed to delete item. Please try again.";

    return "An error occurred. Please try again in a moment.";
  }, []);

  const handleError = useCallback((error: any, context?: string, showToast = true): string => {
    const message = getErrorMessage(error, context);

    if (showToast) {
      toast.error(message);
    }

    if (process.env.NODE_ENV === 'development') {
      console.error(`[${context || 'Error'}]`, error);
    }

    return message;
  }, [getErrorMessage]);

  const handleSuccess = useCallback((message: string) => {
    toast.success(message);
  }, []);

  const handleInfo = useCallback((message: string) => {
    toast.info(message);
  }, []);

  return {
    getErrorMessage,
    handleError,
    handleSuccess,
    handleInfo,
  };
}
