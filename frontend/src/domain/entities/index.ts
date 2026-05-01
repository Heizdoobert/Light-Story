/**
 * Domain Layer - Entities
 * Domain entities are pure data structures that represent core business concepts
 * They should be serializable and contain no external dependencies
 */

// Re-export entities from types for now
// TODO: Move entity definitions into domain/entities as part of future refactoring
export type { Story, Chapter, SiteSetting, Category } from '@/types/entities';
