import { SpaceTypeValue } from '@/common/types/spaceData';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      discovered_mini_apps: {
        Row: {
          cast_hash: string | null
          cast_url: string | null
          description: string | null
          discovered_at: string | null
          discovery_source: string | null
          domain: string
          engagement_score: number | null
          home_url: string
          icon_url: string | null
          id: number
          is_valid: boolean | null
          last_used_at: string | null
          last_validated_at: string | null
          manifest_data: Json | null
          manifest_url: string
          name: string
          updated_at: string | null
          usage_count: number | null
          validation_errors: string[] | null
          validation_warnings: string[] | null
        }
        Insert: {
          cast_hash?: string | null
          cast_url?: string | null
          description?: string | null
          discovered_at?: string | null
          discovery_source?: string | null
          domain: string
          engagement_score?: number | null
          home_url: string
          icon_url?: string | null
          id?: number
          is_valid?: boolean | null
          last_used_at?: string | null
          last_validated_at?: string | null
          manifest_data?: Json | null
          manifest_url: string
          name: string
          updated_at?: string | null
          usage_count?: number | null
          validation_errors?: string[] | null
          validation_warnings?: string[] | null
        }
        Update: {
          cast_hash?: string | null
          cast_url?: string | null
          description?: string | null
          discovered_at?: string | null
          discovery_source?: string | null
          domain?: string
          engagement_score?: number | null
          home_url?: string
          icon_url?: string | null
          id?: number
          is_valid?: boolean | null
          last_used_at?: string | null
          last_validated_at?: string | null
          manifest_data?: Json | null
          manifest_url?: string
          name?: string
          updated_at?: string | null
          usage_count?: number | null
          validation_errors?: string[] | null
          validation_warnings?: string[] | null
        }
        Relationships: []
      }
      discovery_runs: {
        Row: {
          completed_at: string | null
          config: Json | null
          error_message: string | null
          existing_apps_updated: number | null
          id: number
          new_apps_discovered: number | null
          started_at: string | null
          status: string | null
          total_casts_processed: number | null
          total_domains_found: number | null
          validation_errors: number | null
        }
        Insert: {
          completed_at?: string | null
          config?: Json | null
          error_message?: string | null
          existing_apps_updated?: number | null
          id?: number
          new_apps_discovered?: number | null
          started_at?: string | null
          status?: string | null
          total_casts_processed?: number | null
          total_domains_found?: number | null
          validation_errors?: number | null
        }
        Update: {
          completed_at?: string | null
          config?: Json | null
          error_message?: string | null
          existing_apps_updated?: number | null
          id?: number
          new_apps_discovered?: number | null
          started_at?: string | null
          status?: string | null
          total_casts_processed?: number | null
          total_domains_found?: number | null
          validation_errors?: number | null
        }
        Relationships: []
      }
      domain_crawl_history: {
        Row: {
          crawled_at: string | null
          domain: string
          error_message: string | null
          http_status: number | null
          id: number
          manifest_found: boolean | null
          manifest_valid: boolean | null
          response_time_ms: number | null
          status: string
        }
        Insert: {
          crawled_at?: string | null
          domain: string
          error_message?: string | null
          http_status?: number | null
          id?: number
          manifest_found?: boolean | null
          manifest_valid?: boolean | null
          response_time_ms?: number | null
          status: string
        }
        Update: {
          crawled_at?: string | null
          domain?: string
          error_message?: string | null
          http_status?: number | null
          id?: number
          manifest_found?: boolean | null
          manifest_valid?: boolean | null
          response_time_ms?: number | null
          status?: string
        }
        Relationships: []
      }
      community_configs: {
        Row: {
          id: number
          community_id: string
          brand_config: Json | null
          assets_config: Json | null
          community_config: Json | null
          fidgets_config: Json | null
          navigation_config: Json | null
          ui_config: Json | null
          admin_identity_public_keys: string[] | null
          custom_domain_authorized: boolean
          admin_email: string | null
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          community_id: string
          brand_config?: Json | null
          assets_config?: Json | null
          community_config?: Json | null
          fidgets_config?: Json | null
          navigation_config?: Json | null
          ui_config?: Json | null
          admin_identity_public_keys?: string[] | null
          custom_domain_authorized?: boolean
          admin_email?: string | null
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          community_id?: string
          brand_config?: Json | null
          assets_config?: Json | null
          community_config?: Json | null
          fidgets_config?: Json | null
          navigation_config?: Json | null
          ui_config?: Json | null
          admin_identity_public_keys?: string[] | null
          custom_domain_authorized?: boolean
          admin_email?: string | null
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_domains: {
        Row: {
          id: string
          community_id: string
          domain: string
          domain_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          community_id: string
          domain: string
          domain_type: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          community_id?: string
          domain?: string
          domain_type?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      fidRegistrations: {
        Row: {
          created: string
          fid: number
          id: number
          identityPublicKey: string
          isSigningKeyValid: boolean
          signature: string | null
          signingKeyLastValidatedAt: string | null
          signingPublicKey: string | null
        }
        Insert: {
          created?: string
          fid: number
          id?: number
          identityPublicKey: string
          isSigningKeyValid: boolean
          signature?: string | null
          signingKeyLastValidatedAt?: string | null
          signingPublicKey?: string | null
        }
        Update: {
          created?: string
          fid?: number
          id?: number
          identityPublicKey?: string
          isSigningKeyValid?: boolean
          signature?: string | null
          signingKeyLastValidatedAt?: string | null
          signingPublicKey?: string | null
        }
        Relationships: []
      }
      lastSeenNotificationCursors: {
        Row: {
          created: string
          fid: number
          id: number
          identityPublicKey: string
          lastSeenTimestamp: string
        }
        Insert: {
          created?: string
          fid: number
          id?: number
          identityPublicKey: string
          lastSeenTimestamp: string
        }
        Update: {
          created?: string
          fid?: number
          id?: number
          identityPublicKey?: string
          lastSeenTimestamp?: string
        }
        Relationships: []
      }
      processed_casts: {
        Row: {
          cast_data: Json | null
          cast_hash: string
          discovery_run_id: number | null
          domains_found: string[] | null
          id: number
          processed_at: string | null
        }
        Insert: {
          cast_data?: Json | null
          cast_hash: string
          discovery_run_id?: number | null
          domains_found?: string[] | null
          id?: number
          processed_at?: string | null
        }
        Update: {
          cast_data?: Json | null
          cast_hash?: string
          discovery_run_id?: number | null
          domains_found?: string[] | null
          id?: number
          processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processed_casts_discovery_run_id_fkey"
            columns: ["discovery_run_id"]
            isOneToOne: false
            referencedRelation: "discovery_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      sharedContentAccessRequests: {
        Row: {
          cid: string
          created_at: string
          id: number
          publicKey: string
          signature: string
        }
        Insert: {
          cid: string
          created_at?: string
          id?: number
          publicKey: string
          signature: string
        }
        Update: {
          cid?: string
          created_at?: string
          id?: number
          publicKey?: string
          signature?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_sharedContentAccessRequests_cid_fkey"
            columns: ["cid"]
            isOneToOne: false
            referencedRelation: "sharedContentRegistrations"
            referencedColumns: ["cid"]
          },
        ]
      }
      sharedContentRegistrations: {
        Row: {
          cid: string
          name: string | null
          publicKey: string
          signature: string
          timestamp: string
        }
        Insert: {
          cid: string
          name?: string | null
          publicKey: string
          signature: string
          timestamp: string
        }
        Update: {
          cid?: string
          name?: string | null
          publicKey?: string
          signature?: string
          timestamp?: string
        }
        Relationships: []
      }
      spaceOrderings: {
        Row: {
          fid: number
          id: number
          identityPublicKey: string
          ordering: string[]
          signature: string
          timestamp: string
        }
        Insert: {
          fid: number
          id?: number
          identityPublicKey: string
          ordering: string[]
          signature: string
          timestamp: string
        }
        Update: {
          fid?: number
          id?: number
          identityPublicKey?: string
          ordering?: string[]
          signature?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_spaceOrderings_fid_fkey"
            columns: ["fid"]
            isOneToOne: true
            referencedRelation: "fidRegistrations"
            referencedColumns: ["fid"]
          },
        ]
      }
      spaceRegistrations: {
        Row: {
          contractAddress: string | null
          fid: number | null
          identityPublicKey: string
          network: string | null
          signature: string
          spaceId: string
          spaceName: string
          timestamp: string
          proposalId: string | null
          spaceType: SpaceTypeValue
        }
        Insert: {
          contractAddress?: string | null
          fid?: number | null
          identityPublicKey: string
          network?: string | null
          signature: string
          spaceId?: string
          spaceName: string
          timestamp: string
          proposalId?: string | null
          spaceType: SpaceTypeValue
        }
        Update: {
          contractAddress?: string | null
          fid?: number | null
          identityPublicKey?: string
          network?: string | null
          signature?: string
          spaceId?: string
          spaceName?: string
          timestamp?: string
          proposalId?: string | null
          spaceType?: SpaceTypeValue
        }
        Relationships: [
          {
            foreignKeyName: "public_spaceRegistrations_fid_fkey"
            columns: ["fid"]
            isOneToOne: false
            referencedRelation: "fidRegistrations"
            referencedColumns: ["fid"]
          },
        ]
      }
      walletIdentities: {
        Row: {
          id: string
          identityPublicKey: string
          nonce: string
          signature: string
          timestamp: string
          type: string
          walletAddress: string
        }
        Insert: {
          id?: string
          identityPublicKey: string
          nonce: string
          signature: string
          timestamp: string
          type: string
          walletAddress: string
        }
        Update: {
          id?: string
          identityPublicKey?: string
          nonce?: string
          signature?: string
          timestamp?: string
          type?: string
          walletAddress?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_mini_apps: {
        Row: {
          description: string | null
          discovered_at: string | null
          discovery_source: string | null
          domain: string | null
          engagement_score: number | null
          home_url: string | null
          icon_url: string | null
          id: number | null
          last_validated_at: string | null
          name: string | null
          usage_count: number | null
        }
        Insert: {
          description?: string | null
          discovered_at?: string | null
          discovery_source?: string | null
          domain?: string | null
          engagement_score?: number | null
          home_url?: string | null
          icon_url?: string | null
          id?: number | null
          last_validated_at?: string | null
          name?: string | null
          usage_count?: number | null
        }
        Update: {
          description?: string | null
          discovered_at?: string | null
          discovery_source?: string | null
          domain?: string | null
          engagement_score?: number | null
          home_url?: string | null
          icon_url?: string | null
          id?: number | null
          last_validated_at?: string | null
          name?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      scheduled_discovery_jobs: {
        Row: {
          active: boolean | null
          command: string | null
          database: string | null
          jobid: number | null
          nodename: string | null
          nodeport: number | null
          schedule: string | null
          username: string | null
        }
        Insert: {
          active?: boolean | null
          command?: string | null
          database?: string | null
          jobid?: number | null
          nodename?: string | null
          nodeport?: number | null
          schedule?: string | null
          username?: string | null
        }
        Update: {
          active?: boolean | null
          command?: string | null
          database?: string | null
          jobid?: number | null
          nodename?: string | null
          nodeport?: number | null
          schedule?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_engagement_score: {
        Args: {
          usage_count: number
          days_since_discovery: number
          validation_errors_count: number
        }
        Returns: number
      }
      run_mini_app_discovery: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      trigger_mini_app_discovery: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; name: string; owner: string; metadata: Json }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: {
        Args: { name: string }
        Returns: string
      }
      filename: {
        Args: { name: string }
        Returns: string
      }
      foldername: {
        Args: { name: string }
        Returns: string[]
      }
      get_level: {
        Args: { name: string }
        Returns: number
      }
      get_prefix: {
        Args: { name: string }
        Returns: string
      }
      get_prefixes: {
        Args: { name: string }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
        }
        Returns: {
          key: string
          id: string
          created_at: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          prefix_param: string
          delimiter_param: string
          max_keys?: number
          start_after?: string
          next_token?: string
        }
        Returns: {
          name: string
          id: string
          metadata: Json
          updated_at: string
        }[]
      }
      operation: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_legacy_v1: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_v1_optimised: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
      search_v2: {
        Args: {
          prefix: string
          bucket_name: string
          limits?: number
          levels?: number
          start_after?: string
        }
        Returns: {
          key: string
          name: string
          id: string
          updated_at: string
          created_at: string
          metadata: Json
        }[]
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
  storage: {
    Enums: {},
  },
} as const
