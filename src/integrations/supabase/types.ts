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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      change_orders: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          description: string | null
          id: string
          project_id: string
          requested_by: string | null
          status: Database["public"]["Enums"]["change_order_status"]
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          project_id: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["change_order_status"]
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          project_id?: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["change_order_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          created_at: string
          id: string
          issues_encountered: string | null
          photos: string[] | null
          project_id: string
          report_date: string
          submitted_by: string | null
          weather: string | null
          work_performed: string
          workers_count: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          issues_encountered?: string | null
          photos?: string[] | null
          project_id: string
          report_date?: string
          submitted_by?: string | null
          weather?: string | null
          work_performed: string
          workers_count?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          issues_encountered?: string | null
          photos?: string[] | null
          project_id?: string
          report_date?: string
          submitted_by?: string | null
          weather?: string | null
          work_performed?: string
          workers_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      defects: {
        Row: {
          category: string
          created_at: string
          defect_condition: string
          id: string
          inspection_id: string
          item_name: string
          notes: string | null
          nspire_item_id: string
          photo_urls: string[] | null
          proof_required: boolean | null
          repair_deadline: string
          repair_verified: boolean | null
          repaired_at: string | null
          severity: Database["public"]["Enums"]["severity_level"]
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          defect_condition: string
          id?: string
          inspection_id: string
          item_name: string
          notes?: string | null
          nspire_item_id: string
          photo_urls?: string[] | null
          proof_required?: boolean | null
          repair_deadline: string
          repair_verified?: boolean | null
          repaired_at?: string | null
          severity: Database["public"]["Enums"]["severity_level"]
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          defect_condition?: string
          id?: string
          inspection_id?: string
          item_name?: string
          notes?: string | null
          nspire_item_id?: string
          photo_urls?: string[] | null
          proof_required?: boolean | null
          repair_deadline?: string
          repair_verified?: boolean | null
          repaired_at?: string | null
          severity?: Database["public"]["Enums"]["severity_level"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "defects_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          area: Database["public"]["Enums"]["inspection_area"]
          completed_at: string | null
          created_at: string
          id: string
          inspection_date: string
          inspector_id: string | null
          notes: string | null
          property_id: string
          status: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          area: Database["public"]["Enums"]["inspection_area"]
          completed_at?: string | null
          created_at?: string
          id?: string
          inspection_date?: string
          inspector_id?: string | null
          notes?: string | null
          property_id: string
          status?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          area?: Database["public"]["Enums"]["inspection_area"]
          completed_at?: string | null
          created_at?: string
          id?: string
          inspection_date?: string
          inspector_id?: string | null
          notes?: string | null
          property_id?: string
          status?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          area: Database["public"]["Enums"]["inspection_area"] | null
          assigned_to: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          defect_id: string | null
          description: string | null
          id: string
          proof_required: boolean | null
          property_id: string
          resolved_at: string | null
          severity: Database["public"]["Enums"]["severity_level"]
          source_module: Database["public"]["Enums"]["issue_source"]
          status: string | null
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          area?: Database["public"]["Enums"]["inspection_area"] | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          defect_id?: string | null
          description?: string | null
          id?: string
          proof_required?: boolean | null
          property_id: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["severity_level"]
          source_module?: Database["public"]["Enums"]["issue_source"]
          status?: string | null
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          area?: Database["public"]["Enums"]["inspection_area"] | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          defect_id?: string | null
          description?: string | null
          id?: string
          proof_required?: boolean | null
          property_id?: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["severity_level"]
          source_module?: Database["public"]["Enums"]["issue_source"]
          status?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_defect_id_fkey"
            columns: ["defect_id"]
            isOneToOne: false
            referencedRelation: "defects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          due_date: string
          id: string
          name: string
          notes: string | null
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_date: string
          id?: string
          name: string
          notes?: string | null
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_date?: string
          id?: string
          name?: string
          notes?: string | null
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_end_date: string | null
          budget: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          property_id: string
          scope: string | null
          spent: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          target_end_date: string | null
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          budget?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          property_id: string
          scope?: string | null
          spent?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_end_date?: string | null
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          budget?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          property_id?: string
          scope?: string | null
          spent?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_end_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          city: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          id: string
          mailing_address: string | null
          mailing_city: string | null
          mailing_state: string | null
          mailing_zip: string | null
          name: string
          nspire_enabled: boolean | null
          projects_enabled: boolean | null
          state: string
          status: string | null
          total_units: number | null
          updated_at: string
          year_built: number | null
          zip_code: string | null
        }
        Insert: {
          address: string
          city: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mailing_address?: string | null
          mailing_city?: string | null
          mailing_state?: string | null
          mailing_zip?: string | null
          name: string
          nspire_enabled?: boolean | null
          projects_enabled?: boolean | null
          state: string
          status?: string | null
          total_units?: number | null
          updated_at?: string
          year_built?: number | null
          zip_code?: string | null
        }
        Update: {
          address?: string
          city?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mailing_address?: string | null
          mailing_city?: string | null
          mailing_state?: string | null
          mailing_zip?: string | null
          name?: string
          nspire_enabled?: boolean | null
          projects_enabled?: boolean | null
          state?: string
          status?: string | null
          total_units?: number | null
          updated_at?: string
          year_built?: number | null
          zip_code?: string | null
        }
        Relationships: []
      }
      units: {
        Row: {
          bathrooms: number | null
          bedrooms: number | null
          created_at: string
          floor: number | null
          id: string
          last_inspection_date: string | null
          property_id: string
          square_feet: number | null
          status: string | null
          unit_number: string
          updated_at: string
        }
        Insert: {
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          floor?: number | null
          id?: string
          last_inspection_date?: string | null
          property_id: string
          square_feet?: number | null
          status?: string | null
          unit_number: string
          updated_at?: string
        }
        Update: {
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          floor?: number | null
          id?: string
          last_inspection_date?: string | null
          property_id?: string
          square_feet?: number | null
          status?: string | null
          unit_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          defect_id: string | null
          description: string | null
          due_date: string
          id: string
          issue_id: string | null
          priority: Database["public"]["Enums"]["work_order_priority"]
          proof_photos: string[] | null
          property_id: string
          status: Database["public"]["Enums"]["work_order_status"]
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          defect_id?: string | null
          description?: string | null
          due_date: string
          id?: string
          issue_id?: string | null
          priority?: Database["public"]["Enums"]["work_order_priority"]
          proof_photos?: string[] | null
          property_id: string
          status?: Database["public"]["Enums"]["work_order_status"]
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          defect_id?: string | null
          description?: string | null
          due_date?: string
          id?: string
          issue_id?: string | null
          priority?: Database["public"]["Enums"]["work_order_priority"]
          proof_photos?: string[] | null
          property_id?: string
          status?: Database["public"]["Enums"]["work_order_status"]
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_defect_id_fkey"
            columns: ["defect_id"]
            isOneToOne: false
            referencedRelation: "defects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_nspire_deadline: {
        Args: { p_severity: Database["public"]["Enums"]["severity_level"] }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "inspector" | "user"
      change_order_status: "draft" | "pending" | "approved" | "rejected"
      inspection_area: "outside" | "inside" | "unit"
      issue_source: "core" | "nspire" | "projects"
      project_status: "planning" | "active" | "on_hold" | "completed" | "closed"
      severity_level: "low" | "moderate" | "severe"
      work_order_priority: "emergency" | "routine"
      work_order_status:
        | "pending"
        | "assigned"
        | "in_progress"
        | "completed"
        | "verified"
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
      app_role: ["admin", "manager", "inspector", "user"],
      change_order_status: ["draft", "pending", "approved", "rejected"],
      inspection_area: ["outside", "inside", "unit"],
      issue_source: ["core", "nspire", "projects"],
      project_status: ["planning", "active", "on_hold", "completed", "closed"],
      severity_level: ["low", "moderate", "severe"],
      work_order_priority: ["emergency", "routine"],
      work_order_status: [
        "pending",
        "assigned",
        "in_progress",
        "completed",
        "verified",
      ],
    },
  },
} as const
