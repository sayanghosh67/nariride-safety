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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      driver_profiles: {
        Row: {
          city: string
          created_at: string
          docs: Json
          gender: string
          licence_number: string
          name: string
          online: boolean
          phone: string
          rating: number
          updated_at: string
          user_id: string
          vehicle_model: string
          vehicle_number: string
          vehicle_type: string
          verification: string
          women_only: boolean
        }
        Insert: {
          city?: string
          created_at?: string
          docs?: Json
          gender?: string
          licence_number?: string
          name?: string
          online?: boolean
          phone?: string
          rating?: number
          updated_at?: string
          user_id: string
          vehicle_model?: string
          vehicle_number?: string
          vehicle_type?: string
          verification?: string
          women_only?: boolean
        }
        Update: {
          city?: string
          created_at?: string
          docs?: Json
          gender?: string
          licence_number?: string
          name?: string
          online?: boolean
          phone?: string
          rating?: number
          updated_at?: string
          user_id?: string
          vehicle_model?: string
          vehicle_number?: string
          vehicle_type?: string
          verification?: string
          women_only?: boolean
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount: number
          id: string
          method: string
          reference: string
          requested_at: string
          settled_at: string | null
          status: string
          trip_ids: Json
          user_id: string
        }
        Insert: {
          amount?: number
          id?: string
          method?: string
          reference?: string
          requested_at?: string
          settled_at?: string | null
          status?: string
          trip_ids?: Json
          user_id: string
        }
        Update: {
          amount?: number
          id?: string
          method?: string
          reference?: string
          requested_at?: string
          settled_at?: string | null
          status?: string
          trip_ids?: Json
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_mode: string
          created_at: string
          home_label: string
          id: string
          name: string
          phone: string
          updated_at: string
          work_label: string
        }
        Insert: {
          active_mode?: string
          created_at?: string
          home_label?: string
          id: string
          name?: string
          phone?: string
          updated_at?: string
          work_label?: string
        }
        Update: {
          active_mode?: string
          created_at?: string
          home_label?: string
          id?: string
          name?: string
          phone?: string
          updated_at?: string
          work_label?: string
        }
        Relationships: []
      }
      ride_matches: {
        Row: {
          arrived_at: string | null
          cancel_reason: string
          cancelled_by: string
          completed_at: string | null
          created_at: string
          distance_km: number
          driver_feedback: string
          driver_rating: number | null
          dropoff: Json
          eta_minutes: number
          fare: number
          fare_final: number
          otp_verified_at: string | null
          partner: Json | null
          partner_id: string | null
          passenger_feedback: string
          passenger_id: string
          passenger_name: string
          passenger_phone: string
          passenger_rating: number | null
          payment_method: string
          payment_status: string
          pickup: Json
          pin: string
          ride_id: string
          started_at: string | null
          status: string
          tip: number
          trusted_journey: boolean
          updated_at: string
          vehicle_class: string
        }
        Insert: {
          arrived_at?: string | null
          cancel_reason?: string
          cancelled_by?: string
          completed_at?: string | null
          created_at?: string
          distance_km?: number
          driver_feedback?: string
          driver_rating?: number | null
          dropoff: Json
          eta_minutes?: number
          fare?: number
          fare_final?: number
          otp_verified_at?: string | null
          partner?: Json | null
          partner_id?: string | null
          passenger_feedback?: string
          passenger_id: string
          passenger_name?: string
          passenger_phone?: string
          passenger_rating?: number | null
          payment_method?: string
          payment_status?: string
          pickup: Json
          pin?: string
          ride_id: string
          started_at?: string | null
          status?: string
          tip?: number
          trusted_journey?: boolean
          updated_at?: string
          vehicle_class?: string
        }
        Update: {
          arrived_at?: string | null
          cancel_reason?: string
          cancelled_by?: string
          completed_at?: string | null
          created_at?: string
          distance_km?: number
          driver_feedback?: string
          driver_rating?: number | null
          dropoff?: Json
          eta_minutes?: number
          fare?: number
          fare_final?: number
          otp_verified_at?: string | null
          partner?: Json | null
          partner_id?: string | null
          passenger_feedback?: string
          passenger_id?: string
          passenger_name?: string
          passenger_phone?: string
          passenger_rating?: number | null
          payment_method?: string
          payment_status?: string
          pickup?: Json
          pin?: string
          ride_id?: string
          started_at?: string | null
          status?: string
          tip?: number
          trusted_journey?: boolean
          updated_at?: string
          vehicle_class?: string
        }
        Relationships: []
      }
      sos_incidents: {
        Row: {
          created_at: string
          destination_label: string
          driver: Json | null
          id: string
          location: Json | null
          partner_id: string | null
          passenger_id: string
          passenger_name: string
          passenger_phone: string
          pickup_label: string
          ride_id: string | null
          risk_level: string
          risk_score: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          destination_label?: string
          driver?: Json | null
          id?: string
          location?: Json | null
          partner_id?: string | null
          passenger_id: string
          passenger_name?: string
          passenger_phone?: string
          pickup_label?: string
          ride_id?: string | null
          risk_level?: string
          risk_score?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          destination_label?: string
          driver?: Json | null
          id?: string
          location?: Json | null
          partner_id?: string | null
          passenger_id?: string
          passenger_name?: string
          passenger_phone?: string
          pickup_label?: string
          ride_id?: string | null
          risk_level?: string
          risk_score?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      trusted_contacts: {
        Row: {
          created_at: string
          id: string
          name: string
          notify_on_deviation: boolean
          phone: string
          relationship: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notify_on_deviation?: boolean
          phone: string
          relationship?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notify_on_deviation?: boolean
          phone?: string
          relationship?: string
          user_id?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Enums: {
      app_role: "admin" | "responder"
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
      app_role: ["admin", "responder"],
    },
  },
} as const
