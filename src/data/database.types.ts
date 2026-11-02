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
    PostgrestVersion: "14.18"
  }
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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      ai_usage: {
        Row: {
          created_at: string
          id: number
          input_tokens: number
          model: string
          output_tokens: number
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          input_tokens?: number
          model: string
          output_tokens?: number
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          input_tokens?: number
          model?: string
          output_tokens?: number
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_files: {
        Row: {
          booking_id: string
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          trip_id: string
          uploaded_by: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          trip_id: string
          uploaded_by?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          trip_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_files_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_files_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          created_by: string | null
          detail: string
          ends_at: string | null
          id: string
          imported_at: string | null
          kind: Database["public"]["Enums"]["booking_kind"]
          provider: string | null
          reference: string | null
          source: Database["public"]["Enums"]["booking_source"]
          starts_at: string
          ticket: Json | null
          timezone: string | null
          title: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          detail?: string
          ends_at?: string | null
          id?: string
          imported_at?: string | null
          kind: Database["public"]["Enums"]["booking_kind"]
          provider?: string | null
          reference?: string | null
          source?: Database["public"]["Enums"]["booking_source"]
          starts_at: string
          ticket?: Json | null
          timezone?: string | null
          title: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          detail?: string
          ends_at?: string | null
          id?: string
          imported_at?: string | null
          kind?: Database["public"]["Enums"]["booking_kind"]
          provider?: string | null
          reference?: string | null
          source?: Database["public"]["Enums"]["booking_source"]
          starts_at?: string
          ticket?: Json | null
          timezone?: string | null
          title?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      import_addresses: {
        Row: {
          alias: string
          created_at: string
          user_id: string
        }
        Insert: {
          alias?: string
          created_at?: string
          user_id: string
        }
        Update: {
          alias?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_imports: {
        Row: {
          drafts: Json
          error: string | null
          files: Json
          from_email: string | null
          id: string
          received_at: string
          status: string
          subject: string | null
          suggested_trip_id: string | null
          user_id: string
        }
        Insert: {
          drafts?: Json
          error?: string | null
          files?: Json
          from_email?: string | null
          id?: string
          received_at?: string
          status?: string
          subject?: string | null
          suggested_trip_id?: string | null
          user_id: string
        }
        Update: {
          drafts?: Json
          error?: string | null
          files?: Json
          from_email?: string | null
          id?: string
          received_at?: string
          status?: string
          subject?: string | null
          suggested_trip_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_imports_suggested_trip_id_fkey"
            columns: ["suggested_trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_imports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_reactions: {
        Row: {
          created_at: string
          kind: string
          photo_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          kind: string
          photo_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          kind?: string
          photo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_reactions_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photo_shares"
            referencedColumns: ["photo_id"]
          },
        ]
      }
      photo_reports: {
        Row: {
          created_at: string
          details: string | null
          photo_id: string
          reason: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          photo_id: string
          reason: string
          reporter_id?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          photo_id?: string
          reason?: string
          reporter_id?: string
        }
        Relationships: []
      }
      photo_shares: {
        Row: {
          author_id: string
          caption: string | null
          city: string
          country_code: string
          destination_id: string | null
          hidden_at: string | null
          hidden_reason: string | null
          last_notified_at: string | null
          lat: number
          lng: number
          photo_id: string
          published_at: string
          trip_id: string
        }
        Insert: {
          author_id: string
          caption?: string | null
          city: string
          country_code: string
          destination_id?: string | null
          hidden_at?: string | null
          hidden_reason?: string | null
          last_notified_at?: string | null
          lat: number
          lng: number
          photo_id: string
          published_at?: string
          trip_id: string
        }
        Update: {
          author_id?: string
          caption?: string | null
          city?: string
          country_code?: string
          destination_id?: string | null
          hidden_at?: string | null
          hidden_reason?: string | null
          last_notified_at?: string | null
          lat?: number
          lng?: number
          photo_id?: string
          published_at?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_shares_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: true
            referencedRelation: "trip_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_name: string
          home_city: string | null
          home_lat: number | null
          home_lng: number | null
          id: string
          locale: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_name: string
          home_city?: string | null
          home_lat?: number | null
          home_lng?: number | null
          id: string
          locale?: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string
          home_city?: string | null
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          locale?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_interval: string | null
          cancel_at_period_end: boolean
          current_period_end: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval?: string | null
          cancel_at_period_end?: boolean
          current_period_end?: string | null
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_interval?: string | null
          cancel_at_period_end?: boolean
          current_period_end?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_destinations: {
        Row: {
          arrive_on: string | null
          city: string
          country_code: string
          created_at: string
          id: string
          lat: number
          leave_on: string | null
          lng: number
          position: number
          timezone: string | null
          trip_id: string
        }
        Insert: {
          arrive_on?: string | null
          city: string
          country_code: string
          created_at?: string
          id?: string
          lat: number
          leave_on?: string | null
          lng: number
          position?: number
          timezone?: string | null
          trip_id: string
        }
        Update: {
          arrive_on?: string | null
          city?: string
          country_code?: string
          created_at?: string
          id?: string
          lat?: number
          leave_on?: string | null
          lng?: number
          position?: number
          timezone?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_destinations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invited_by: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["trip_role"]
          token: string
          trip_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["trip_role"]
          token?: string
          trip_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["trip_role"]
          token?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_invitations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_members: {
        Row: {
          joined_at: string
          role: Database["public"]["Enums"]["trip_role"]
          trip_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          role?: Database["public"]["Enums"]["trip_role"]
          trip_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          role?: Database["public"]["Enums"]["trip_role"]
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_photos: {
        Row: {
          caption: string | null
          created_at: string
          duration_seconds: number | null
          height: number | null
          id: string
          kind: string
          mime_type: string
          path: string
          size_bytes: number
          storage: string
          taken_at: string | null
          thumb_path: string
          trip_id: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          kind?: string
          mime_type: string
          path: string
          size_bytes?: number
          storage?: string
          taken_at?: string | null
          thumb_path: string
          trip_id: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          kind?: string
          mime_type?: string
          path?: string
          size_bytes?: number
          storage?: string
          taken_at?: string | null
          thumb_path?: string
          trip_id?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_photos_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          budget_amount: number | null
          budget_currency: string
          cover_colors: string[] | null
          cover_path: string | null
          cover_photo_id: string | null
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          start_date: string
          title: string
          transport: Database["public"]["Enums"]["transport_mode"]
          updated_at: string
        }
        Insert: {
          budget_amount?: number | null
          budget_currency?: string
          cover_colors?: string[] | null
          cover_path?: string | null
          cover_photo_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          start_date: string
          title: string
          transport?: Database["public"]["Enums"]["transport_mode"]
          updated_at?: string
        }
        Update: {
          budget_amount?: number | null
          budget_currency?: string
          cover_colors?: string[] | null
          cover_path?: string | null
          cover_photo_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          start_date?: string
          title?: string
          transport?: Database["public"]["Enums"]["transport_mode"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_cover_photo_id_fkey"
            columns: ["cover_photo_id"]
            isOneToOne: false
            referencedRelation: "trip_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id?: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      user_countries: {
        Row: {
          country_code: string
          created_at: string
          first_visited_on: string | null
          user_id: string
        }
        Insert: {
          country_code: string
          created_at?: string
          first_visited_on?: string | null
          user_id?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          first_visited_on?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_countries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      my_visited_countries: {
        Row: {
          country_code: string | null
          first_visited_on: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string }
      ai_allowance: { Args: { p_trip?: string; p_user: string }; Returns: Json }
      delete_my_account: { Args: never; Returns: undefined }
      invitation_preview: {
        Args: { p_token: string }
        Returns: {
          end_date: string
          invited_by_name: string
          role: Database["public"]["Enums"]["trip_role"]
          start_date: string
          status: string
          trip_title: string
        }[]
      }
      my_plan: { Args: never; Returns: Json }
      photo_quota_check: {
        Args: { p_bytes: number; p_trip: string }
        Returns: string
      }
      public_photos: {
        Args: {
          p_before?: string
          p_city?: string
          p_country?: string
          p_limit?: number
          p_wishlist?: boolean
        }
        Returns: {
          author_avatar: string
          author_id: string
          author_name: string
          caption: string
          city: string
          country_code: string
          duration_seconds: number
          height: number
          kind: string
          my_reaction: string
          path: string
          photo_id: string
          published_at: string
          reactions: Json
          taken_month: string
          thumb_path: string
          width: number
        }[]
      }
      public_places: {
        Args: never
        Returns: {
          city: string
          country_code: string
          cover_thumb_path: string
          lat: number
          lng: number
          photo_count: number
        }[]
      }
      publish_photo: {
        Args: { p_caption?: string; p_destination: string; p_photo: string }
        Returns: undefined
      }
      react_to_photo: {
        Args: { p_kind: string | null; p_photo: string }
        Returns: undefined
      }
      regenerate_import_alias: { Args: never; Returns: string }
      save_push_subscription: {
        Args: {
          p_auth: string
          p_endpoint: string
          p_p256dh: string
          p_user_agent?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      booking_kind:
        | "vol"
        | "train"
        | "car"
        | "bateau"
        | "location"
        | "hotel"
        | "activite"
        | "autre"
      booking_source: "manuel" | "email" | "pdf"
      transport_mode: "avion" | "train" | "voiture" | "bateau" | "autre"
      trip_role: "owner" | "editor" | "viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      booking_kind: [
        "vol",
        "train",
        "car",
        "bateau",
        "location",
        "hotel",
        "activite",
        "autre",
      ],
      booking_source: ["manuel", "email", "pdf"],
      transport_mode: ["avion", "train", "voiture", "bateau", "autre"],
      trip_role: ["owner", "editor", "viewer"],
    },
  },
} as const
