/**
 * Infrastructure Layer - Public API
 * Exports all infrastructure components following Clean Architecture
 */

// Supabase client and configuration
export { supabase, createSupabaseClient, getSupabaseClient } from './supabase';

// Repositories (implementations of domain interfaces)
export {
  SupabaseStoryRepository,
  SupabaseChapterRepository,
  SupabaseSettingsRepository,
  SupabaseTaxonomyRepository,
} from './repositories';
