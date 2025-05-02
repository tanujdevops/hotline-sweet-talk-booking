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
      active_calls: {
        Row: {
          booking_id: string
          started_at: string
          vapi_call_id: string | null
        }
        Insert: {
          booking_id: string
          started_at?: string
          vapi_call_id?: string | null
        }
        Update: {
          booking_id?: string
          started_at?: string
          vapi_call_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "active_calls_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          id: string
          message: string | null
          payment_amount: number | null
          payment_intent_id: string | null
          payment_status: string | null
          plan_id: number | null
          status: Database["public"]["Enums"]["booking_status"]
          user_id: string | null
          vapi_call_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          payment_amount?: number | null
          payment_intent_id?: string | null
          payment_status?: string | null
          plan_id?: number | null
          status?: Database["public"]["Enums"]["booking_status"]
          user_id?: string | null
          vapi_call_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          payment_amount?: number | null
          payment_intent_id?: string | null
          payment_status?: string | null
          plan_id?: number | null
          status?: Database["public"]["Enums"]["booking_status"]
          user_id?: string | null
          vapi_call_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      call_events: {
        Row: {
          booking_id: string | null
          details: Json | null
          event_time: string
          event_type: string
          id: number
        }
        Insert: {
          booking_id?: string | null
          details?: Json | null
          event_time?: string
          event_type: string
          id?: number
        }
        Update: {
          booking_id?: string | null
          details?: Json | null
          event_time?: string
          event_type?: string
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "call_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          booking_id: string | null
          created_at: string
          cryptomus_invoice_id: string | null
          cryptomus_payment_id: string | null
          currency: string
          id: number
          status: string
        }
        Insert: {
          amount_cents: number
          booking_id?: string | null
          created_at?: string
          cryptomus_invoice_id?: string | null
          cryptomus_payment_id?: string | null
          currency: string
          id?: number
          status: string
        }
        Update: {
          amount_cents?: number
          booking_id?: string | null
          created_at?: string
          cryptomus_invoice_id?: string | null
          cryptomus_payment_id?: string | null
          currency?: string
          id?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          cryptomus_price_id: string | null
          duration_seconds: number
          id: number
          key: Database["public"]["Enums"]["plan_key"]
          price_cents: number
          vapi_assistant_id: string | null
        }
        Insert: {
          cryptomus_price_id?: string | null
          duration_seconds: number
          id?: number
          key: Database["public"]["Enums"]["plan_key"]
          price_cents: number
          vapi_assistant_id?: string | null
        }
        Update: {
          cryptomus_price_id?: string | null
          duration_seconds?: number
          id?: number
          key?: Database["public"]["Enums"]["plan_key"]
          price_cents?: number
          vapi_assistant_id?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_free_trial_cooldown: {
        Args: { client_ip: string }
        Returns: boolean
      }
      generate_booking_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      booking_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "failed"
        | "pending_payment"
        | "payment_failed"
        | "queued"
        | "initiating"
        | "calling"
      plan_key: "free_trial" | "standard" | "extended" | "premium"
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
    Enums: {
      booking_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "failed",
        "pending_payment",
        "payment_failed",
        "queued",
        "initiating",
        "calling",
      ],
      plan_key: ["free_trial", "standard", "extended", "premium"],
    },
  },
} as const
