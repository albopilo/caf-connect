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
      loyalty_transactions: {
        Row: {
          amount: number
          cashback: number
          created_at: string
          id: string
          member_id: string
          order_id: string | null
          points_earned: number
          source: string
          table_name: string | null
        }
        Insert: {
          amount?: number
          cashback?: number
          created_at?: string
          id?: string
          member_id: string
          order_id?: string | null
          points_earned?: number
          source?: string
          table_name?: string | null
        }
        Update: {
          amount?: number
          cashback?: number
          created_at?: string
          id?: string
          member_id?: string
          order_id?: string | null
          points_earned?: number
          source?: string
          table_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_programs: {
        Row: {
          active: boolean
          buy_product_ids: string[]
          created_at: string
          free_product_id: string | null
          free_qty: number
          free_variant: string | null
          id: string
          type: string
        }
        Insert: {
          active?: boolean
          buy_product_ids?: string[]
          created_at?: string
          free_product_id?: string | null
          free_qty?: number
          free_variant?: string | null
          id?: string
          type?: string
        }
        Update: {
          active?: boolean
          buy_product_ids?: string[]
          created_at?: string
          free_product_id?: string | null
          free_qty?: number
          free_variant?: string | null
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_programs_free_product_id_fkey"
            columns: ["free_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          birthdate: string | null
          created_at: string
          discount_rate: number
          email: string | null
          monthly_since_upgrade: number
          name: string | null
          name_lower: string | null
          phone: string | null
          redeemable_points: number
          spending_since_upgrade: number
          tax_rate: number
          tier: string
          upgrade_date: string | null
          user_id: string
          yearly_since_upgrade: number
        }
        Insert: {
          birthdate?: string | null
          created_at?: string
          discount_rate?: number
          email?: string | null
          monthly_since_upgrade?: number
          name?: string | null
          name_lower?: string | null
          phone?: string | null
          redeemable_points?: number
          spending_since_upgrade?: number
          tax_rate?: number
          tier?: string
          upgrade_date?: string | null
          user_id: string
          yearly_since_upgrade?: number
        }
        Update: {
          birthdate?: string | null
          created_at?: string
          discount_rate?: number
          email?: string | null
          monthly_since_upgrade?: number
          name?: string | null
          name_lower?: string | null
          phone?: string | null
          redeemable_points?: number
          spending_since_upgrade?: number
          tax_rate?: number
          tier?: string
          upgrade_date?: string | null
          user_id?: string
          yearly_since_upgrade?: number
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          order_id: string
          status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          order_id: string
          status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          date: string
          delivery_fee: number
          discount: number
          grand_total: number
          id: string
          is_member: boolean
          items: Json
          loyalty_recorded: boolean
          loyalty_tx_id: string | null
          member_id: string | null
          olsera_order_id: string | null
          payment_method: string
          payment_status: string
          phone: string | null
          proof_url: string | null
          status: string
          subtotal: number
          table_name: string
          tax: number
          total: number
          voucher_id: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          delivery_fee?: number
          discount?: number
          grand_total?: number
          id?: string
          is_member?: boolean
          items?: Json
          loyalty_recorded?: boolean
          loyalty_tx_id?: string | null
          member_id?: string | null
          olsera_order_id?: string | null
          payment_method?: string
          payment_status?: string
          phone?: string | null
          proof_url?: string | null
          status?: string
          subtotal?: number
          table_name?: string
          tax?: number
          total?: number
          voucher_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          delivery_fee?: number
          discount?: number
          grand_total?: number
          id?: string
          is_member?: boolean
          items?: Json
          loyalty_recorded?: boolean
          loyalty_tx_id?: string | null
          member_id?: string | null
          olsera_order_id?: string | null
          payment_method?: string
          payment_status?: string
          phone?: string | null
          proof_url?: string | null
          status?: string
          subtotal?: number
          table_name?: string
          tax?: number
          total?: number
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          olsera_id: string | null
          photo_1: string | null
          photo_10: string | null
          photo_2: string | null
          photo_3: string | null
          photo_4: string | null
          photo_5: string | null
          photo_6: string | null
          photo_7: string | null
          photo_8: string | null
          photo_9: string | null
          pos_hidden: boolean
          pos_sell_price: number
          updated_at: string
          variant_label: string | null
          variant_names: string[]
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          name: string
          olsera_id?: string | null
          photo_1?: string | null
          photo_10?: string | null
          photo_2?: string | null
          photo_3?: string | null
          photo_4?: string | null
          photo_5?: string | null
          photo_6?: string | null
          photo_7?: string | null
          photo_8?: string | null
          photo_9?: string | null
          pos_hidden?: boolean
          pos_sell_price?: number
          updated_at?: string
          variant_label?: string | null
          variant_names?: string[]
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          olsera_id?: string | null
          photo_1?: string | null
          photo_10?: string | null
          photo_2?: string | null
          photo_3?: string | null
          photo_4?: string | null
          photo_5?: string | null
          photo_6?: string | null
          photo_7?: string | null
          photo_8?: string | null
          photo_9?: string | null
          pos_hidden?: boolean
          pos_sell_price?: number
          updated_at?: string
          variant_label?: string | null
          variant_names?: string[]
        }
        Relationships: []
      }
      staff_push_tokens: {
        Row: {
          created_at: string
          id: string
          role: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          token?: string
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
      voucher_redemptions: {
        Row: {
          id: string
          order_id: string | null
          redeemed_at: string
          table_name: string | null
          voucher_id: string
        }
        Insert: {
          id?: string
          order_id?: string | null
          redeemed_at?: string
          table_name?: string | null
          voucher_id: string
        }
        Update: {
          id?: string
          order_id?: string | null
          redeemed_at?: string
          table_name?: string | null
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_redemptions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          limit_per_day: number
          type: string
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          limit_per_day?: number
          type?: string
          value?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          limit_per_day?: number
          type?: string
          value?: number
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
      app_role: "admin" | "staff" | "member"
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
  public: {
    Enums: {
      app_role: ["admin", "staff", "member"],
    },
  },
} as const
