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
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          actor_name: string
          command_id: string | null
          created_at: string
          entity: string
          entity_id: string
          id: string
          result: string | null
          summary: string
        }
        Insert: {
          action: string
          actor_id: string
          actor_name?: string
          command_id?: string | null
          created_at?: string
          entity: string
          entity_id: string
          id: string
          result?: string | null
          summary?: string
        }
        Update: {
          action?: string
          actor_id?: string
          actor_name?: string
          command_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string
          id?: string
          result?: string | null
          summary?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          format: string
          id: string
          key: string
          name: string
          team_count: number
          tournament_id: string
        }
        Insert: {
          format?: string
          id: string
          key: string
          name: string
          team_count?: number
          tournament_id: string
        }
        Update: {
          format?: string
          id?: string
          key?: string
          name?: string
          team_count?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      contingents: {
        Row: {
          contact: string
          id: string
          manager_name: string
          name: string
          region_code: string
          short_name: string
          tournament_id: string
        }
        Insert: {
          contact?: string
          id: string
          manager_name?: string
          name: string
          region_code: string
          short_name: string
          tournament_id: string
        }
        Update: {
          contact?: string
          id?: string
          manager_name?: string
          name?: string
          region_code?: string
          short_name?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contingents_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          category_id: string
          id: string
          name: string
          stage: string
        }
        Insert: {
          category_id: string
          id: string
          name: string
          stage?: string
        }
        Update: {
          category_id?: string
          id?: string
          name?: string
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      match_events: {
        Row: {
          command_id: string | null
          created_at: string
          id: string
          match_id: string
          metadata: Json
          operator_id: string
          period: string
          player_id: string | null
          sequence_no: number | null
          team_id: string | null
          timestamp: number
          type: string
        }
        Insert: {
          command_id?: string | null
          created_at?: string
          id: string
          match_id: string
          metadata?: Json
          operator_id: string
          period: string
          player_id?: string | null
          sequence_no?: number | null
          team_id?: string | null
          timestamp?: number
          type: string
        }
        Update: {
          command_id?: string | null
          created_at?: string
          id?: string
          match_id?: string
          metadata?: Json
          operator_id?: string
          period?: string
          player_id?: string | null
          sequence_no?: number | null
          team_id?: string | null
          timestamp?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_lineups: {
        Row: {
          id: string
          is_starting: boolean
          match_id: string
          player_id: string
          shirt_number: number
          team_id: string
        }
        Insert: {
          id: string
          is_starting?: boolean
          match_id: string
          player_id: string
          shirt_number: number
          team_id: string
        }
        Update: {
          id?: string
          is_starting?: boolean
          match_id?: string
          player_id?: string
          shirt_number?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_lineups_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_lineups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_lineups_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_officials: {
        Row: {
          active: boolean
          effective_from: string | null
          effective_to: string | null
          full_name: string
          id: string
          match_id: string
          role: string
          user_id: string
        }
        Insert: {
          active?: boolean
          effective_from?: string | null
          effective_to?: string | null
          full_name: string
          id: string
          match_id: string
          role: string
          user_id: string
        }
        Update: {
          active?: boolean
          effective_from?: string | null
          effective_to?: string | null
          full_name?: string
          id?: string
          match_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_officials_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_score: number
          away_team_id: string
          category_id: string
          clock_seconds: number
          court: number
          group_id: string | null
          home_score: number
          home_team_id: string
          id: string
          kickoff_at: string
          match_number: number
          period: string
          stage: string
          status: string
          tournament_id: string
          venue_id: string
          version: number
        }
        Insert: {
          away_score?: number
          away_team_id: string
          category_id: string
          clock_seconds?: number
          court?: number
          group_id?: string | null
          home_score?: number
          home_team_id: string
          id: string
          kickoff_at: string
          match_number: number
          period?: string
          stage?: string
          status?: string
          tournament_id: string
          venue_id: string
          version?: number
        }
        Update: {
          away_score?: number
          away_team_id?: string
          category_id?: string
          clock_seconds?: number
          court?: number
          group_id?: string | null
          home_score?: number
          home_team_id?: string
          id?: string
          kickoff_at?: string
          match_number?: number
          period?: string
          stage?: string
          status?: string
          tournament_id?: string
          venue_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          birth_date: string
          full_name: string
          id: string
          is_captain: boolean
          jersey_number: number
          nik_verified: boolean
          position: string
          registration_status: string | null
          status: string
          team_id: string
        }
        Insert: {
          birth_date: string
          full_name: string
          id: string
          is_captain?: boolean
          jersey_number: number
          nik_verified?: boolean
          position: string
          registration_status?: string | null
          status?: string
          team_id: string
        }
        Update: {
          birth_date?: string
          full_name?: string
          id?: string
          is_captain?: boolean
          jersey_number?: number
          nik_verified?: boolean
          position?: string
          registration_status?: string | null
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          contingent_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          phone: string | null
          team_id: string | null
          venue_id: string | null
        }
        Insert: {
          contingent_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          is_active?: boolean
          last_login_at?: string | null
          phone?: string | null
          team_id?: string | null
          venue_id?: string | null
        }
        Update: {
          contingent_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          phone?: string | null
          team_id?: string | null
          venue_id?: string | null
        }
        Relationships: []
      }
      registration_documents: {
        Row: {
          entity_id: string
          entity_type: string
          file_name: string
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          storage_path: string | null
          team_id: string | null
          type: string
          uploaded_at: string
        }
        Insert: {
          entity_id: string
          entity_type: string
          file_name: string
          id: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_path?: string | null
          team_id?: string | null
          type: string
          uploaded_at?: string
        }
        Update: {
          entity_id?: string
          entity_type?: string
          file_name?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_path?: string | null
          team_id?: string | null
          type?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_documents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      role_requests: {
        Row: {
          contingent_id: string | null
          created_at: string
          decision_note: string | null
          id: string
          request_reason: string
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          supporting_docs: Json
          team_id: string | null
          updated_at: string
          user_id: string
          venue_id: string | null
        }
        Insert: {
          contingent_id?: string | null
          created_at?: string
          decision_note?: string | null
          id?: string
          request_reason?: string
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          supporting_docs?: Json
          team_id?: string | null
          updated_at?: string
          user_id: string
          venue_id?: string | null
        }
        Update: {
          contingent_id?: string | null
          created_at?: string
          decision_note?: string | null
          id?: string
          request_reason?: string
          requested_role?: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          supporting_docs?: Json
          team_id?: string | null
          updated_at?: string
          user_id?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_requests_contingent_id_fkey"
            columns: ["contingent_id"]
            isOneToOne: false
            referencedRelation: "contingents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_requests_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      team_accounts: {
        Row: {
          account_status: string
          created_at: string
          id: string
          last_login_at: string | null
          team_id: string
          updated_at: string
          username: string
        }
        Insert: {
          account_status?: string
          created_at?: string
          id: string
          last_login_at?: string | null
          team_id: string
          updated_at?: string
          username: string
        }
        Update: {
          account_status?: string
          created_at?: string
          id?: string
          last_login_at?: string | null
          team_id?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_accounts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_officials: {
        Row: {
          full_name: string
          id: string
          license_number: string | null
          registration_status: string | null
          role: string
          team_id: string
        }
        Insert: {
          full_name: string
          id: string
          license_number?: string | null
          registration_status?: string | null
          role: string
          team_id: string
        }
        Update: {
          full_name?: string
          id?: string
          license_number?: string | null
          registration_status?: string | null
          role?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_officials_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_profiles: {
        Row: {
          data: Json
          team_id: string
          updated_at: string
        }
        Insert: {
          data?: Json
          team_id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          category_id: string
          contingent_id: string
          group_id: string | null
          id: string
          name: string
          primary_color: string
          short_name: string
          status: string
        }
        Insert: {
          category_id: string
          contingent_id: string
          group_id?: string | null
          id: string
          name: string
          primary_color?: string
          short_name: string
          status?: string
        }
        Update: {
          category_id?: string
          contingent_id?: string
          group_id?: string | null
          id?: string
          name?: string
          primary_color?: string
          short_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_contingent_id_fkey"
            columns: ["contingent_id"]
            isOneToOne: false
            referencedRelation: "contingents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          description: string
          end_date: string
          host_city: string
          id: string
          name: string
          season: number
          start_date: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string
          end_date: string
          host_city: string
          id: string
          name: string
          season: number
          start_date: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string
          end_date?: string
          host_city?: string
          id?: string
          name?: string
          season?: number
          start_date?: string
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          address: string
          capacity: number
          city: string
          court_count: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          address?: string
          capacity?: number
          city: string
          court_count?: number
          id: string
          is_active?: boolean
          name: string
        }
        Update: {
          address?: string
          capacity?: number
          city?: string
          court_count?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      verification_history: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          new_status: string
          previous_status: string
          reason: string | null
          team_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id: string
          new_status?: string
          previous_status?: string
          reason?: string | null
          team_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          new_status?: string
          previous_status?: string
          reason?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_history_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _role_rank: {
        Args: { _r: Database["public"]["Enums"]["app_role"] }
        Returns: number
      }
      approve_role_request: {
        Args: {
          _contingent_id?: string
          _decision_note?: string
          _request_id: string
          _team_id?: string
          _venue_id?: string
        }
        Returns: {
          contingent_id: string | null
          created_at: string
          decision_note: string | null
          id: string
          request_reason: string
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          supporting_docs: Json
          team_id: string | null
          updated_at: string
          user_id: string
          venue_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "role_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      gen_random_uuid_text: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      my_team_id: { Args: never; Returns: string }
      reject_role_request: {
        Args: { _decision_note: string; _request_id: string }
        Returns: {
          contingent_id: string | null
          created_at: string
          decision_note: string | null
          id: string
          request_reason: string
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          supporting_docs: Json
          team_id: string | null
          updated_at: string
          user_id: string
          venue_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "role_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revoke_user_role: {
        Args: {
          _reason?: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "SUPER_ADMIN"
        | "TOURNAMENT_ADMIN"
        | "COMPETITION_MANAGER"
        | "VENUE_MANAGER"
        | "MATCH_COMMISSIONER"
        | "REFEREE"
        | "TIMEKEEPER"
        | "SCOREKEEPER"
        | "TEAM_OFFICIAL"
        | "MEDIA"
        | "PUBLIC"
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
      app_role: [
        "SUPER_ADMIN",
        "TOURNAMENT_ADMIN",
        "COMPETITION_MANAGER",
        "VENUE_MANAGER",
        "MATCH_COMMISSIONER",
        "REFEREE",
        "TIMEKEEPER",
        "SCOREKEEPER",
        "TEAM_OFFICIAL",
        "MEDIA",
        "PUBLIC",
      ],
    },
  },
} as const
