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
          vapi_account_id: string | null
          vapi_agent_id: string | null
          vapi_call_id: string | null
        }
        Insert: {
          booking_id: string
          started_at?: string
          vapi_account_id?: string | null
          vapi_agent_id?: string | null
          vapi_call_id?: string | null
        }
        Update: {
          booking_id?: string
          started_at?: string
          vapi_account_id?: string | null
          vapi_agent_id?: string | null
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
          {
            foreignKeyName: "active_calls_vapi_account_id_fkey"
            columns: ["vapi_account_id"]
            isOneToOne: false
            referencedRelation: "vapi_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_calls_vapi_agent_id_fkey"
            columns: ["vapi_agent_id"]
            isOneToOne: false
            referencedRelation: "vapi_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          call_duration: number
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
          call_duration?: number
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
          call_duration?: number
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
            foreignKeyName: "call_events_new_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      call_events_default: {
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
        Relationships: []
      }
      call_events_y2025m04: {
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
        Relationships: []
      }
      call_events_y2025m05: {
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
        Relationships: []
      }
      call_events_y2025m06: {
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
        Relationships: []
      }
      call_queue: {
        Row: {
          assigned_account_id: string | null
          assigned_agent_id: string | null
          booking_id: string
          created_at: string
          id: string
          max_retries: number
          plan_type: string
          priority: number
          retry_count: number
          scheduled_for: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_account_id?: string | null
          assigned_agent_id?: string | null
          booking_id: string
          created_at?: string
          id?: string
          max_retries?: number
          plan_type: string
          priority?: number
          retry_count?: number
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_account_id?: string | null
          assigned_agent_id?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          max_retries?: number
          plan_type?: string
          priority?: number
          retry_count?: number
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_queue_assigned_account_id_fkey"
            columns: ["assigned_account_id"]
            isOneToOne: false
            referencedRelation: "vapi_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_queue_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "vapi_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_queue_booking_id_fkey"
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
          last_free_trial: string | null
          name: string
          phone: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_free_trial?: string | null
          name: string
          phone: string
        }
        Update: {
          created_at?: string
          id?: string
          last_free_trial?: string | null
          name?: string
          phone?: string
        }
        Relationships: []
      }
      vapi_accounts: {
        Row: {
          api_key: string
          created_at: string
          current_active_calls: number
          id: string
          is_active: boolean
          max_concurrent_calls: number
          name: string
          phone_number_id: string | null
          updated_at: string
        }
        Insert: {
          api_key: string
          created_at?: string
          current_active_calls?: number
          id?: string
          is_active?: boolean
          max_concurrent_calls?: number
          name: string
          phone_number_id?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          current_active_calls?: number
          id?: string
          is_active?: boolean
          max_concurrent_calls?: number
          name?: string
          phone_number_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vapi_agents: {
        Row: {
          agent_id: string
          agent_type: string
          created_at: string
          current_active_calls: number
          id: string
          is_active: boolean
          max_concurrent_calls: number
          priority: number
          updated_at: string
          vapi_account_id: string
        }
        Insert: {
          agent_id: string
          agent_type: string
          created_at?: string
          current_active_calls?: number
          id?: string
          is_active?: boolean
          max_concurrent_calls?: number
          priority?: number
          updated_at?: string
          vapi_account_id: string
        }
        Update: {
          agent_id?: string
          agent_type?: string
          created_at?: string
          current_active_calls?: number
          id?: string
          is_active?: boolean
          max_concurrent_calls?: number
          priority?: number
          updated_at?: string
          vapi_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vapi_agents_vapi_account_id_fkey"
            columns: ["vapi_account_id"]
            isOneToOne: false
            referencedRelation: "vapi_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bytea_to_text: {
        Args: { data: string }
        Returns: string
      }
      check_call_durations: {
        Args: Record<PropertyKey, never>
        Returns: {
          booking_id: string
          status: string
          message: string
        }[]
      }
      check_free_trial_cooldown: {
        Args: Record<PropertyKey, never> | { client_ip: string }
        Returns: boolean
      }
      check_free_trial_eligibility: {
        Args: { user_id: string }
        Returns: boolean
      }
      cleanup_inactive_call: {
        Args: {
          p_booking_id: string
          p_status: string
          p_error_message?: string
        }
        Returns: undefined
      }
      decrement_call_count: {
        Args: { agent_uuid: string; account_uuid: string }
        Returns: undefined
      }
      free_agent: {
        Args: { p_agent_id: string; p_account_id: string }
        Returns: undefined
      }
      generate_booking_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_available_agent: {
        Args: { plan_type_param: string }
        Returns: {
          agent_id: string
          vapi_agent_id: string
          account_id: string
          api_key: string
          phone_number_id: string
        }[]
      }
      handle_call_end: {
        Args: {
          p_booking_id: string
          p_call_id: string
          p_agent_id: string
          p_account_id: string
          p_ended_reason: string
        }
        Returns: undefined
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_delete: {
        Args:
          | { uri: string }
          | { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_get: {
        Args: { uri: string } | { uri: string; data: Json }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
      }
      http_list_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_post: {
        Args:
          | { uri: string; content: string; content_type: string }
          | { uri: string; data: Json }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_put: {
        Args: { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      increment_call_count: {
        Args: { agent_uuid: string; account_uuid: string }
        Returns: undefined
      }
      log_queue_processing: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      safe_decrement_call_count: {
        Args: { agent_uuid: string; account_uuid: string }
        Returns: undefined
      }
      sync_booking_payment_status: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      text_to_bytea: {
        Args: { data: string }
        Returns: string
      }
      update_last_free_trial: {
        Args: { user_id: string }
        Returns: undefined
      }
      urlencode: {
        Args: { data: Json } | { string: string } | { string: string }
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
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown | null
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
