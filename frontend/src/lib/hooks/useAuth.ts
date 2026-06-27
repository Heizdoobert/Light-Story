"use client";

/**
 * Phase 1 core hook: Centralized auth logic.
 * Re-exports useAuth from AuthContext (consolidates auth service functionality).
 */
export { useAuth } from "@/modules/auth/AuthContext";
