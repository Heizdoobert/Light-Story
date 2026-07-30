export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_email: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      analytics_snapshots: {
        Row: {
          created_at: string
          expires_at: string
          id: number
          metric_type: string
          snapshot_data: Json
          time_range: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: never
          metric_type: string
          snapshot_data: Json
          time_range: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: never
          metric_type?: string
          snapshot_data?: Json
          time_range?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          ip_address: unknown
          metadata: Json
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          ip_address?: unknown
          metadata?: Json
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          ip_address?: unknown
          metadata?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      authors: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          comic_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          comic_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          comic_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      chapter_views: {
        Row: {
          chapter_id: string
          id: string
          viewed_at: string
          viewed_by: string
        }
        Insert: {
          chapter_id: string
          id?: string
          viewed_at?: string
          viewed_by: string
        }
        Update: {
          chapter_id?: string
          id?: string
          viewed_at?: string
          viewed_by?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          chapter_number: number
          content: string | null
          created_at: string
          id: string
          published_at: string | null
          story_id: string
          title: string
          updated_at: string
        }
        Insert: {
          chapter_number: number
          content?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          story_id: string
          title: string
          updated_at?: string
        }
        Update: {
          chapter_number?: number
          content?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          story_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_stories: {
        Row: {
          collection_id: string
          created_at: string
          sort_order: number
          story_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          sort_order?: number
          story_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          sort_order?: number
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_stories_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_stories_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          like_count: number
          parent_id: string | null
          status: string
          story_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          like_count?: number
          parent_id?: string | null
          status?: string
          story_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          like_count?: number
          parent_id?: string | null
          status?: string
          story_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crawler_runs: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          items_created: number
          items_seen: number
          items_updated: number
          log: string | null
          source_id: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          items_created?: number
          items_seen?: number
          items_updated?: number
          log?: string | null
          source_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          items_created?: number
          items_seen?: number
          items_updated?: number
          log?: string | null
          source_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crawler_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "crawler_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      crawler_sources: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          last_crawled_at: string | null
          last_status: string | null
          name: string
          notes: string | null
          source_type: string
          source_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_crawled_at?: string | null
          last_status?: string | null
          name: string
          notes?: string | null
          source_type?: string
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_crawled_at?: string | null
          last_status?: string | null
          name?: string
          notes?: string | null
          source_type?: string
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_access_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          id: number
          ip_address: unknown
          method: string
          route: string
          status_code: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          id?: never
          ip_address?: unknown
          method?: string
          route: string
          status_code?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          id?: never
          ip_address?: unknown
          method?: string
          route?: string
          status_code?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_access_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          slug: string
          starts_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          slug: string
          starts_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          slug?: string
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      moderation_queue: {
        Row: {
          chapter_id: string | null
          created_at: string
          id: string
          notes: string | null
          reason: string
          reporter_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          story_id: string | null
          updated_at: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          reason: string
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          story_id?: string | null
          updated_at?: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          reason?: string
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          story_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_queue_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_queue_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_queue_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_queue_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          is_active: boolean
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          review: string | null
          status: string
          story_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          review?: string | null
          status?: string
          story_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          review?: string | null
          status?: string
          story_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_history: {
        Row: {
          chapter_id: string
          chapter_number: number | null
          comic_id: string
          id: string
          progress_pct: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chapter_id: string
          chapter_number?: number | null
          comic_id: string
          id?: string
          progress_pct?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chapter_id?: string
          chapter_number?: number | null
          comic_id?: string
          id?: string
          progress_pct?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recruitment_candidates: {
        Row: {
          admin_notes: string | null
          avatar_url: string | null
          created_at: string | null
          creator_handle: string | null
          creator_name: string | null
          decided_at: string | null
          evaluated_at: string | null
          evaluation_json: Json | null
          follower_count: number | null
          id: string
          score: number | null
          source_platform: string
          source_url: string
          status: string
          verdict: string | null
        }
        Insert: {
          admin_notes?: string | null
          avatar_url?: string | null
          created_at?: string | null
          creator_handle?: string | null
          creator_name?: string | null
          decided_at?: string | null
          evaluated_at?: string | null
          evaluation_json?: Json | null
          follower_count?: number | null
          id?: string
          score?: number | null
          source_platform: string
          source_url: string
          status?: string
          verdict?: string | null
        }
        Update: {
          admin_notes?: string | null
          avatar_url?: string | null
          created_at?: string | null
          creator_handle?: string | null
          creator_name?: string | null
          decided_at?: string | null
          evaluated_at?: string | null
          evaluation_json?: Json | null
          follower_count?: number | null
          id?: string
          score?: number | null
          source_platform?: string
          source_url?: string
          status?: string
          verdict?: string | null
        }
        Relationships: []
      }
      recruitment_decisions: {
        Row: {
          action: string
          admin_id: string
          candidate_id: string
          created_at: string | null
          id: string
          notes: string | null
        }
        Insert: {
          action: string
          admin_id: string
          candidate_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          candidate_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_decisions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_invites: {
        Row: {
          accepted_at: string | null
          candidate_id: string
          expires_at: string | null
          id: string
          invite_code: string
          opened_at: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          candidate_id: string
          expires_at?: string | null
          id?: string
          invite_code: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          candidate_id?: string
          expires_at?: string | null
          id?: string
          invite_code?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_invites_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "recruitment_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_snapshots: {
        Row: {
          ad_revenue: number
          created_at: string
          id: string
          notes: string | null
          premium_subscriptions: number
          snapshot_date: string
          total_revenue: number
          total_transactions: number
          updated_at: string
        }
        Insert: {
          ad_revenue?: number
          created_at?: string
          id?: string
          notes?: string | null
          premium_subscriptions?: number
          snapshot_date: string
          total_revenue?: number
          total_transactions?: number
          updated_at?: string
        }
        Update: {
          ad_revenue?: number
          created_at?: string
          id?: string
          notes?: string | null
          premium_subscriptions?: number
          snapshot_date?: string
          total_revenue?: number
          total_transactions?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          id: number
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          id?: never
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          id?: never
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          author: string | null
          author_id: string | null
          category: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          like_count: number
          search_vector: string | null
          status: string
          summary: string | null
          title: string
          translator: string | null
          translator_id: string | null
          updated_at: string
          views: number
        }
        Insert: {
          author?: string | null
          author_id?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          like_count?: number
          search_vector?: string | null
          status?: string
          summary?: string | null
          title: string
          translator?: string | null
          translator_id?: string | null
          updated_at?: string
          views?: number
        }
        Update: {
          author?: string | null
          author_id?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          like_count?: number
          search_vector?: string | null
          status?: string
          summary?: string | null
          title?: string
          translator?: string | null
          translator_id?: string | null
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "stories_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_translator_id_fkey"
            columns: ["translator_id"]
            isOneToOne: false
            referencedRelation: "translators"
            referencedColumns: ["id"]
          },
        ]
      }
      story_likes: {
        Row: {
          created_at: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_likes_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewed_by: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewed_by: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_viewed_by_fkey"
            columns: ["viewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          metadata: Json
          reference_code: string | null
          status: string
          transaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          reference_code?: string | null
          status?: string
          transaction_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          reference_code?: string | null
          status?: string
          transaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      translators: {
        Row: {
          contact: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contact?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contact?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      analytics_time_range_key: {
        Args: { p_time_range: string }
        Returns: string
      }
      can_read_chapter: {
        Args: { _chapter_id: string; _uid: string }
        Returns: boolean
      }
      get_content_performance: {
        Args: { p_limit?: number; p_time_range?: string }
        Returns: {
          avg_views_per_chapter: number
          engagement_score: number
          top_chapters: Json
          total_favorites: number
          total_views: number
        }[]
      }
      get_inactive_user_cohort: {
        Args: { p_inactive_days?: number }
        Returns: {
          days_inactive: number
          last_activity_at: string
          user_email: string
          user_id: string
          user_role: string
        }[]
      }
      get_operations_table_counts: { Args: never; Returns: Json }
      get_signup_trend: {
        Args: { p_days_back?: number }
        Returns: {
          cumulative_users: number
          new_users: number
          signup_date: string
        }[]
      }
      get_storage_metrics: {
        Args: { p_time_range?: string }
        Returns: {
          bandwidth_gb: number
          cache_hit_ratio_pct: number
          d1_avg_latency_ms: number
          d1_queries_count: number
          device_desktop: number
          device_mobile: number
          device_tablet: number
          page_views: number
          r2_allocated_gb: number
          r2_egress_gb: number
          r2_object_count: number
          r2_usage_gb: number
          storage_efficiency_pct: number
          top_zones: Json
        }[]
      }
      get_story_completion_rates: {
        Args: { p_story_id?: string }
        Returns: {
          completion_rate: number
          story_id: string
          story_title: string
          total_chapters: number
        }[]
      }
      get_top_chapters_by_reads: {
        Args: { p_limit?: number; p_time_range?: string }
        Returns: {
          chapter_id: string
          chapter_number: number
          chapter_title: string
          created_at: string
          favorite_count: number
          read_count: number
          story_id: string
          story_title: string
        }[]
      }
      get_top_stories_by_metric: {
        Args: { p_limit?: number; p_metric?: string; p_time_range?: string }
        Returns: {
          author: string
          created_at: string
          metric_name: string
          metric_value: number
          story_id: string
          title: string
        }[]
      }
      get_total_favorites: { Args: never; Returns: number }
      get_total_views: { Args: { p_time_range?: string }; Returns: number }
      get_user_engagement_metrics: {
        Args: { p_time_range?: string }
        Returns: {
          active_users: number
          avg_session_duration_minutes: number
          churn_rate_pct: number
          growth_rate_pct: number
          new_users: number
          total_favorites: number
          total_users: number
          total_views: number
        }[]
      }
      get_user_engagement_summary:
        | {
            Args: {
              p_days_back?: number
              p_end_date?: string
              p_start_date?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_end_date?: string
              p_start_date?: string
              p_time_range?: string
            }
            Returns: Json
          }
      increment_chapter_views: {
        Args: { chapter_id_param: string }
        Returns: undefined
      }
      increment_story_views: {
        Args: { story_id_param: string }
        Returns: undefined
      }
      is_admin_or_higher: { Args: { uid: string }; Returns: boolean }
      is_superadmin: { Args: { uid: string }; Returns: boolean }
      log_dashboard_access: {
        Args: { p_actor_user_id: string; p_metadata?: Json }
        Returns: undefined
      }
      read_dashboard_access_logs: {
        Args: { limit_count?: number }
        Returns: {
          action: string
          actor_user_id: string
          created_at: string
          id: string
          metadata: Json
        }[]
      }
      search_stories: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          cover_url: string
          id: string
          similarity: number
          summary: string
          title: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      toggle_story_like: { Args: { story_id_param: string }; Returns: boolean }
      user_has_role: {
        Args: { role_name: string; uid: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
