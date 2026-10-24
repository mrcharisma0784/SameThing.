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
      banned_words: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          severity: string
          word: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          severity?: string
          word: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          severity?: string
          word?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          created_at: string
          hidden: boolean
          id: string
          is_anonymous: boolean
          parent_id: string | null
          pinned_at: string | null
          report_count: number
          text: string
          thing_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          hidden?: boolean
          id?: string
          is_anonymous?: boolean
          parent_id?: string | null
          pinned_at?: string | null
          report_count?: number
          text: string
          thing_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          hidden?: boolean
          id?: string
          is_anonymous?: boolean
          parent_id?: string | null
          pinned_at?: string | null
          report_count?: number
          text?: string
          thing_id?: string
          user_id?: string | null
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
            foreignKeyName: "comments_thing_id_fkey"
            columns: ["thing_id"]
            isOneToOne: false
            referencedRelation: "things"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          replied_at: string | null
          replied_by: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          replied_at?: string | null
          replied_by?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          replied_at?: string | null
          replied_by?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      mentions: {
        Row: {
          author_user_id: string | null
          comment_id: string | null
          created_at: string
          id: string
          mentioned_user_id: string
          thing_id: string
        }
        Insert: {
          author_user_id?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          mentioned_user_id: string
          thing_id: string
        }
        Update: {
          author_user_id?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          mentioned_user_id?: string
          thing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_thing_id_fkey"
            columns: ["thing_id"]
            isOneToOne: false
            referencedRelation: "things"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_range: string | null
          allow_mentions: boolean
          ban_reason: string | null
          banned_at: string | null
          bio: string | null
          created_at: string
          custom_tags: string[]
          demographics_completed_at: string | null
          emoji: string
          feed_tags: string[]
          gender: string | null
          id: string
          inbox_seen_at: string
          is_anon_default: boolean
          language: string
          last_comment_at: string | null
          last_post_at: string | null
          messages_open: boolean
          muted_until: string | null
          notification_prefs: Json
          onboarded_at: string | null
          plan: string
          rare_thing_count: number
          terms_accepted_at: string | null
          theme: string
          updated_at: string
          username: string
          username_changed_at: string | null
          warnings_count: number
        }
        Insert: {
          age_range?: string | null
          allow_mentions?: boolean
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          created_at?: string
          custom_tags?: string[]
          demographics_completed_at?: string | null
          emoji?: string
          feed_tags?: string[]
          gender?: string | null
          id: string
          inbox_seen_at?: string
          is_anon_default?: boolean
          language?: string
          last_comment_at?: string | null
          last_post_at?: string | null
          messages_open?: boolean
          muted_until?: string | null
          notification_prefs?: Json
          onboarded_at?: string | null
          plan?: string
          rare_thing_count?: number
          terms_accepted_at?: string | null
          theme?: string
          updated_at?: string
          username: string
          username_changed_at?: string | null
          warnings_count?: number
        }
        Update: {
          age_range?: string | null
          allow_mentions?: boolean
          ban_reason?: string | null
          banned_at?: string | null
          bio?: string | null
          created_at?: string
          custom_tags?: string[]
          demographics_completed_at?: string | null
          emoji?: string
          feed_tags?: string[]
          gender?: string | null
          id?: string
          inbox_seen_at?: string
          is_anon_default?: boolean
          language?: string
          last_comment_at?: string | null
          last_post_at?: string | null
          messages_open?: boolean
          muted_until?: string | null
          notification_prefs?: Json
          onboarded_at?: string | null
          plan?: string
          rare_thing_count?: number
          terms_accepted_at?: string | null
          theme?: string
          updated_at?: string
          username?: string
          username_changed_at?: string | null
          warnings_count?: number
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      system_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          link: string | null
          meta: Json
          read_at: string | null
          recipient_id: string
          sender_admin_id: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          meta?: Json
          read_at?: string | null
          recipient_id: string
          sender_admin_id?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          meta?: Json
          read_at?: string | null
          recipient_id?: string
          sender_admin_id?: string | null
          title?: string
        }
        Relationships: []
      }
      things: {
        Row: {
          comment_count: number
          comments_closed: boolean
          created_at: string
          hidden: boolean
          id: string
          is_anonymous: boolean
          is_open_to_chat: boolean
          is_rare_thing: boolean
          language: string
          nah_count: number
          only_one_permanent: boolean
          rare_locked_at: string | null
          raw_text: string
          report_count: number
          safety_flag: boolean
          same_count: number
          similarity_score: number
          simplified_text: string
          tags: string[]
          title: string
          total_votes: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          comment_count?: number
          comments_closed?: boolean
          created_at?: string
          hidden?: boolean
          id?: string
          is_anonymous?: boolean
          is_open_to_chat?: boolean
          is_rare_thing?: boolean
          language?: string
          nah_count?: number
          only_one_permanent?: boolean
          rare_locked_at?: string | null
          raw_text: string
          report_count?: number
          safety_flag?: boolean
          same_count?: number
          similarity_score?: number
          simplified_text: string
          tags?: string[]
          title: string
          total_votes?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          comment_count?: number
          comments_closed?: boolean
          created_at?: string
          hidden?: boolean
          id?: string
          is_anonymous?: boolean
          is_open_to_chat?: boolean
          is_rare_thing?: boolean
          language?: string
          nah_count?: number
          only_one_permanent?: boolean
          rare_locked_at?: string | null
          raw_text?: string
          report_count?: number
          safety_flag?: boolean
          same_count?: number
          similarity_score?: number
          simplified_text?: string
          tags?: string[]
          title?: string
          total_votes?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          id: string
          thing_id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          thing_id: string
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string
          id?: string
          thing_id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_thing_id_fkey"
            columns: ["thing_id"]
            isOneToOne: false
            referencedRelation: "things"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recompute_thing_votes: { Args: { _thing_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
