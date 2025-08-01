export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
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
            referencedRelation: "vapi_account_status"
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
          crypto_amount: number | null
          crypto_currency: string | null
          crypto_network: string | null
          crypto_payment_data: Json | null
          crypto_transaction_hash: string | null
          error_message: string | null
          id: string
          message: string | null
          payment_amount: number | null
          payment_intent_id: string | null
          payment_status: string | null
          plan_id: number | null
          status: Database["public"]["Enums"]["booking_status"]
          user_id: string | null
          vapi_call_id: string | null
          xaigate_invoice_id: string | null
        }
        Insert: {
          call_duration?: number
          created_at?: string
          crypto_amount?: number | null
          crypto_currency?: string | null
          crypto_network?: string | null
          crypto_payment_data?: Json | null
          crypto_transaction_hash?: string | null
          error_message?: string | null
          id?: string
          message?: string | null
          payment_amount?: number | null
          payment_intent_id?: string | null
          payment_status?: string | null
          plan_id?: number | null
          status?: Database["public"]["Enums"]["booking_status"]
          user_id?: string | null
          vapi_call_id?: string | null
          xaigate_invoice_id?: string | null
        }
        Update: {
          call_duration?: number
          created_at?: string
          crypto_amount?: number | null
          crypto_currency?: string | null
          crypto_network?: string | null
          crypto_payment_data?: Json | null
          crypto_transaction_hash?: string | null
          error_message?: string | null
          id?: string
          message?: string | null
          payment_amount?: number | null
          payment_intent_id?: string | null
          payment_status?: string | null
          plan_id?: number | null
          status?: Database["public"]["Enums"]["booking_status"]
          user_id?: string | null
          vapi_call_id?: string | null
          xaigate_invoice_id?: string | null
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
          events: Json | null
          id: number
        }
        Insert: {
          booking_id?: string | null
          details?: Json | null
          event_time?: string
          event_type: string
          events?: Json | null
          id?: number
        }
        Update: {
          booking_id?: string | null
          details?: Json | null
          event_time?: string
          event_type?: string
          events?: Json | null
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
          events: Json | null
          id: number
        }
        Insert: {
          booking_id?: string | null
          details?: Json | null
          event_time?: string
          event_type: string
          events?: Json | null
          id?: number
        }
        Update: {
          booking_id?: string | null
          details?: Json | null
          event_time?: string
          event_type?: string
          events?: Json | null
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
          events: Json | null
          id: number
        }
        Insert: {
          booking_id?: string | null
          details?: Json | null
          event_time?: string
          event_type: string
          events?: Json | null
          id?: number
        }
        Update: {
          booking_id?: string | null
          details?: Json | null
          event_time?: string
          event_type?: string
          events?: Json | null
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
          events: Json | null
          id: number
        }
        Insert: {
          booking_id?: string | null
          details?: Json | null
          event_time?: string
          event_type: string
          events?: Json | null
          id?: number
        }
        Update: {
          booking_id?: string | null
          details?: Json | null
          event_time?: string
          event_type?: string
          events?: Json | null
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
          events: Json | null
          id: number
        }
        Insert: {
          booking_id?: string | null
          details?: Json | null
          event_time?: string
          event_type: string
          events?: Json | null
          id?: number
        }
        Update: {
          booking_id?: string | null
          details?: Json | null
          event_time?: string
          event_type?: string
          events?: Json | null
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
            referencedRelation: "vapi_account_status"
            referencedColumns: ["id"]
          },
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
          email: string | null
          id: string
          last_free_trial: string | null
          name: string
          phone: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          last_free_trial?: string | null
          name: string
          phone: string
        }
        Update: {
          created_at?: string
          email?: string | null
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
          vault_secret_name: string | null
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
          vault_secret_name?: string | null
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
          vault_secret_name?: string | null
        }
        Relationships: []
      }
      vapi_accounts_backup: {
        Row: {
          api_key: string | null
          created_at: string | null
          current_active_calls: number | null
          id: string | null
          is_active: boolean | null
          max_concurrent_calls: number | null
          name: string | null
          phone_number_id: string | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string | null
          current_active_calls?: number | null
          id?: string | null
          is_active?: boolean | null
          max_concurrent_calls?: number | null
          name?: string | null
          phone_number_id?: string | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          created_at?: string | null
          current_active_calls?: number | null
          id?: string | null
          is_active?: boolean | null
          max_concurrent_calls?: number | null
          name?: string | null
          phone_number_id?: string | null
          updated_at?: string | null
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
            referencedRelation: "vapi_account_status"
            referencedColumns: ["id"]
          },
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
      vapi_account_status: {
        Row: {
          created_at: string | null
          current_active_calls: number | null
          id: string | null
          is_active: boolean | null
          key_status: string | null
          max_concurrent_calls: number | null
          name: string | null
          phone_number_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_active_calls?: number | null
          id?: string | null
          is_active?: boolean | null
          key_status?: never
          max_concurrent_calls?: number | null
          name?: string | null
          phone_number_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_active_calls?: number | null
          id?: string | null
          is_active?: boolean | null
          key_status?: never
          max_concurrent_calls?: number | null
          name?: string | null
          phone_number_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_vapi_agents_to_account: {
        Args: {
          p_account_id: string
          p_free_trial_agent_id: string
          p_standard_agent_id: string
          p_extended_agent_id: string
          p_priority?: number
        }
        Returns: undefined
      }
      auto_cleanup_orphaned_calls: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
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
      cleanup_stale_calls: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_stale_queue: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_booking_with_user: {
        Args: {
          p_user_name: string
          p_user_email: string
          p_user_phone: string
          p_plan_id: number
          p_message: string
          p_call_duration?: number
        }
        Returns: {
          booking_id: string
          user_id: string
        }[]
      }
      create_or_update_vault_secret: {
        Args: { secret_name: string; secret_value: string }
        Returns: undefined
      }
      create_vapi_vault_account: {
        Args: {
          p_name: string
          p_api_key: string
          p_phone_number_id: string
          p_max_calls?: number
        }
        Returns: string
      }
      decrement_call_count: {
        Args:
          | { account_uuid: string }
          | { agent_uuid: string; account_uuid: string }
        Returns: undefined
      }
      detect_orphaned_calls: {
        Args: Record<PropertyKey, never>
        Returns: {
          booking_id: string
          minutes_stuck: number
          booking_status: string
        }[]
      }
      ensure_user_has_email: {
        Args: { user_uuid: string }
        Returns: boolean
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
      get_available_agent_direct: {
        Args: { plan_type_param: string }
        Returns: {
          agent_id: string
          vapi_agent_id: string
          account_id: string
          api_key: string
          phone_number_id: string
        }[]
      }
      get_vapi_api_key: {
        Args: { account_uuid: string }
        Returns: string
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
        Args:
          | { account_uuid: string }
          | { agent_uuid: string; account_uuid: string }
        Returns: boolean
      }
      log_queue_processing: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      migrate_api_keys_to_vault: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      process_queue_cron: {
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
      test_agent_availability: {
        Args: Record<PropertyKey, never>
        Returns: {
          plan_type: string
          status: string
          agent_count: number
          total_capacity: number
        }[]
      }
      test_agent_availability_safe: {
        Args: Record<PropertyKey, never>
        Returns: {
          plan_type: string
          status: string
          agent_count: number
          capacity: number
          usage: number
        }[]
      }
      test_agent_availability_view: {
        Args: Record<PropertyKey, never>
        Returns: {
          plan_type: string
          status: string
          agent_count: number
          capacity: number
          usage: number
        }[]
      }
      test_vapi_setup: {
        Args: Record<PropertyKey, never>
        Returns: {
          component: string
          status: string
          details: string
        }[]
      }
      test_vapi_setup_safe: {
        Args: Record<PropertyKey, never>
        Returns: {
          component: string
          status: string
          details: string
        }[]
      }
      test_vapi_vault_setup: {
        Args: Record<PropertyKey, never>
        Returns: {
          test_name: string
          status: string
          details: string
        }[]
      }
      text_to_bytea: {
        Args: { data: string }
        Returns: string
      }
      update_last_free_trial: {
        Args: { user_id: string }
        Returns: undefined
      }
      upsert_user: {
        Args: { p_name: string; p_email: string; p_phone: string }
        Returns: string
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
