export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          end_date: string
          id: string
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          end_date: string
          id?: string
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      password_reset_requests: {
        Row: {
          email: string
          fulfilled: boolean | null
          id: string
          requested_at: string | null
        }
        Insert: {
          email: string
          fulfilled?: boolean | null
          id?: string
          requested_at?: string | null
        }
        Update: {
          email?: string
          fulfilled?: boolean | null
          id?: string
          requested_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_requests_email_fkey"
            columns: ["email"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["email"]
          },
        ]
      }
      schedules: {
        Row: {
          created_at: string
          dates: Json
          edit_count: number | null
          id: string
          month: string
          notes: string | null
          printed_at: string | null
          updated_at: string
          user_email: string
          user_name: string
        }
        Insert: {
          created_at?: string
          dates: Json
          edit_count?: number | null
          id?: string
          month: string
          notes?: string | null
          printed_at?: string | null
          updated_at?: string
          user_email: string
          user_name: string
        }
        Update: {
          created_at?: string
          dates?: Json
          edit_count?: number | null
          id?: string
          month?: string
          notes?: string | null
          printed_at?: string | null
          updated_at?: string
          user_email?: string
          user_name?: string
        }
        Relationships: []
      }
      shift_exchange_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          offered_date: string
          offered_shift: string
          requested_date: string
          requested_shift: string
          requester_email: string
          requester_name: string
          responded_at: string | null
          status: string
          target_email: string
          target_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          offered_date: string
          offered_shift: string
          requested_date: string
          requested_shift: string
          requester_email: string
          requester_name: string
          responded_at?: string | null
          status?: string
          target_email: string
          target_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          offered_date?: string
          offered_shift?: string
          requested_date?: string
          requested_shift?: string
          requester_email?: string
          requester_name?: string
          responded_at?: string | null
          status?: string
          target_email?: string
          target_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          active: boolean
          created_at: string | null
          email: string
          id: string
          mechanographic_number: string
          name: string
          needs_password_change: boolean
          password_hash: string
          role: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          email: string
          id?: string
          mechanographic_number: string
          name: string
          needs_password_change?: boolean
          password_hash?: string
          role: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string | null
          email?: string
          id?: string
          mechanographic_number?: string
          name?: string
          needs_password_change?: boolean
          password_hash?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
