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
      activity_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      asset_type_definitions: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          key: string
          label: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          key: string
          label: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          key?: string
          label?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          asset_type: Database["public"]["Enums"]["asset_type"]
          created_at: string | null
          id: string
          latitude: number | null
          location_description: string | null
          longitude: number | null
          name: string
          photo_url: string | null
          property_id: string
          qr_code: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          asset_type: Database["public"]["Enums"]["asset_type"]
          created_at?: string | null
          id?: string
          latitude?: number | null
          location_description?: string | null
          longitude?: number | null
          name: string
          photo_url?: string | null
          property_id: string
          qr_code?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["asset_type"]
          created_at?: string | null
          id?: string
          latitude?: number | null
          location_description?: string | null
          longitude?: number | null
          name?: string
          photo_url?: string | null
          property_id?: string
          qr_code?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
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
      company_branding: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          company_name: string
          created_at: string
          email: string | null
          footer_text: string | null
          id: string
          logo_url: string | null
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          company_name: string
          created_at?: string
          email?: string | null
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      course_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string | null
          id: string
          last_accessed_at: string | null
          last_location: string | null
          progress_percent: number | null
          score: number | null
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          last_location?: string | null
          progress_percent?: number | null
          score?: number | null
          started_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          last_location?: string | null
          progress_percent?: number | null
          score?: number | null
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company_name: string | null
          contact_type: Database["public"]["Enums"]["contact_type"]
          country: string | null
          created_at: string
          created_by: string | null
          email: string | null
          fax: string | null
          first_name: string
          id: string
          insurance_expiry: string | null
          is_active: boolean | null
          is_favorite: boolean | null
          job_title: string | null
          last_name: string | null
          license_number: string | null
          mobile: string | null
          notes: string | null
          phone: string | null
          property_id: string | null
          state: string | null
          tags: string[] | null
          updated_at: string
          user_id: string | null
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_name?: string | null
          contact_type?: Database["public"]["Enums"]["contact_type"]
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          fax?: string | null
          first_name: string
          id?: string
          insurance_expiry?: string | null
          is_active?: boolean | null
          is_favorite?: boolean | null
          job_title?: string | null
          last_name?: string | null
          license_number?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          property_id?: string | null
          state?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_name?: string | null
          contact_type?: Database["public"]["Enums"]["contact_type"]
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          fax?: string | null
          first_name?: string
          id?: string
          insurance_expiry?: string | null
          is_active?: boolean | null
          is_favorite?: boolean | null
          job_title?: string | null
          last_name?: string | null
          license_number?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          property_id?: string | null
          state?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_inspection_addendums: {
        Row: {
          attachments: string[] | null
          content: string
          created_at: string | null
          created_by: string | null
          daily_inspection_id: string
          id: string
        }
        Insert: {
          attachments?: string[] | null
          content: string
          created_at?: string | null
          created_by?: string | null
          daily_inspection_id: string
          id?: string
        }
        Update: {
          attachments?: string[] | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          daily_inspection_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_inspection_addendums_daily_inspection_id_fkey"
            columns: ["daily_inspection_id"]
            isOneToOne: false
            referencedRelation: "daily_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_inspection_items: {
        Row: {
          asset_id: string
          checked_at: string | null
          daily_inspection_id: string
          defect_description: string | null
          id: string
          issue_id: string | null
          notes: string | null
          photo_urls: string[] | null
          status: Database["public"]["Enums"]["inspection_item_status"] | null
        }
        Insert: {
          asset_id: string
          checked_at?: string | null
          daily_inspection_id: string
          defect_description?: string | null
          id?: string
          issue_id?: string | null
          notes?: string | null
          photo_urls?: string[] | null
          status?: Database["public"]["Enums"]["inspection_item_status"] | null
        }
        Update: {
          asset_id?: string
          checked_at?: string | null
          daily_inspection_id?: string
          defect_description?: string | null
          id?: string
          issue_id?: string | null
          notes?: string | null
          photo_urls?: string[] | null
          status?: Database["public"]["Enums"]["inspection_item_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_inspection_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_inspection_items_daily_inspection_id_fkey"
            columns: ["daily_inspection_id"]
            isOneToOne: false
            referencedRelation: "daily_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_inspection_items_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_inspections: {
        Row: {
          attachments: string[] | null
          completed_at: string | null
          created_at: string | null
          general_notes: string | null
          general_notes_html: string | null
          id: string
          inspection_date: string
          inspector_id: string | null
          property_id: string
          review_status:
            | Database["public"]["Enums"]["daily_inspection_review_status"]
            | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string | null
          submitted_at: string | null
          voice_transcript: string | null
          weather: string | null
        }
        Insert: {
          attachments?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          general_notes?: string | null
          general_notes_html?: string | null
          id?: string
          inspection_date?: string
          inspector_id?: string | null
          property_id: string
          review_status?:
            | Database["public"]["Enums"]["daily_inspection_review_status"]
            | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string | null
          submitted_at?: string | null
          voice_transcript?: string | null
          weather?: string | null
        }
        Update: {
          attachments?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          general_notes?: string | null
          general_notes_html?: string | null
          id?: string
          inspection_date?: string
          inspector_id?: string | null
          property_id?: string
          review_status?:
            | Database["public"]["Enums"]["daily_inspection_review_status"]
            | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string | null
          submitted_at?: string | null
          voice_transcript?: string | null
          weather?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_inspections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          created_at: string
          delays: string | null
          equipment_used: string[] | null
          id: string
          issues_encountered: string | null
          materials_received: string | null
          photos: string[] | null
          project_id: string
          report_date: string
          safety_notes: string | null
          signature: string | null
          signature_date: string | null
          subcontractors: Json | null
          submitted_by: string | null
          visitor_log: Json | null
          weather: string | null
          work_performed: string
          work_performed_html: string | null
          workers_count: number | null
        }
        Insert: {
          created_at?: string
          delays?: string | null
          equipment_used?: string[] | null
          id?: string
          issues_encountered?: string | null
          materials_received?: string | null
          photos?: string[] | null
          project_id: string
          report_date?: string
          safety_notes?: string | null
          signature?: string | null
          signature_date?: string | null
          subcontractors?: Json | null
          submitted_by?: string | null
          visitor_log?: Json | null
          weather?: string | null
          work_performed: string
          work_performed_html?: string | null
          workers_count?: number | null
        }
        Update: {
          created_at?: string
          delays?: string | null
          equipment_used?: string[] | null
          id?: string
          issues_encountered?: string | null
          materials_received?: string | null
          photos?: string[] | null
          project_id?: string
          report_date?: string
          safety_notes?: string | null
          signature?: string | null
          signature_date?: string | null
          subcontractors?: Json | null
          submitted_by?: string | null
          visitor_log?: Json | null
          weather?: string | null
          work_performed?: string
          work_performed_html?: string | null
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
          life_threatening: boolean
          notes: string | null
          nspire_item_id: string
          photo_urls: string[] | null
          point_value: number | null
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
          life_threatening?: boolean
          notes?: string | null
          nspire_item_id: string
          photo_urls?: string[] | null
          point_value?: number | null
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
          life_threatening?: boolean
          notes?: string | null
          nspire_item_id?: string
          photo_urls?: string[] | null
          point_value?: number | null
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
      document_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      hud_sample_sizes: {
        Row: {
          created_at: string
          id: string
          max_units: number
          min_units: number
          sample_size: number
        }
        Insert: {
          created_at?: string
          id?: string
          max_units: number
          min_units: number
          sample_size: number
        }
        Update: {
          created_at?: string
          id?: string
          max_units?: number
          min_units?: number
          sample_size?: number
        }
        Relationships: []
      }
      inspections: {
        Row: {
          area: Database["public"]["Enums"]["inspection_area"]
          completed_at: string | null
          created_at: string
          data_retention_until: string | null
          id: string
          inspection_date: string
          inspector_id: string | null
          notes: string | null
          nspire_score: number | null
          property_id: string
          status: string | null
          unit_id: string | null
          unit_performance_score: number | null
          updated_at: string
        }
        Insert: {
          area: Database["public"]["Enums"]["inspection_area"]
          completed_at?: string | null
          created_at?: string
          data_retention_until?: string | null
          id?: string
          inspection_date?: string
          inspector_id?: string | null
          notes?: string | null
          nspire_score?: number | null
          property_id: string
          status?: string | null
          unit_id?: string | null
          unit_performance_score?: number | null
          updated_at?: string
        }
        Update: {
          area?: Database["public"]["Enums"]["inspection_area"]
          completed_at?: string | null
          created_at?: string
          data_retention_until?: string | null
          id?: string
          inspection_date?: string
          inspector_id?: string | null
          notes?: string | null
          nspire_score?: number | null
          property_id?: string
          status?: string | null
          unit_id?: string | null
          unit_performance_score?: number | null
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
      issue_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          issue_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          issue_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          issue_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_comments_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_mentions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          issue_id: string
          mentioned_user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          issue_id: string
          mentioned_user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          issue_id?: string
          mentioned_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "issue_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_mentions_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
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
          daily_inspection_item_id: string | null
          deadline: string | null
          defect_id: string | null
          description: string | null
          id: string
          maintenance_request_id: string | null
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
          daily_inspection_item_id?: string | null
          deadline?: string | null
          defect_id?: string | null
          description?: string | null
          id?: string
          maintenance_request_id?: string | null
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
          daily_inspection_item_id?: string | null
          deadline?: string | null
          defect_id?: string | null
          description?: string | null
          id?: string
          maintenance_request_id?: string | null
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
            foreignKeyName: "issues_daily_inspection_item_id_fkey"
            columns: ["daily_inspection_item_id"]
            isOneToOne: false
            referencedRelation: "daily_inspection_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_defect_id_fkey"
            columns: ["defect_id"]
            isOneToOne: false
            referencedRelation: "defects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_maintenance_request_id_fkey"
            columns: ["maintenance_request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
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
      maintenance_request_activity: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          request_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          request_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          request_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_request_activity_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          call_duration_seconds: number | null
          call_ended_at: string | null
          call_id: string | null
          call_recording_url: string | null
          call_started_at: string | null
          call_transcript: string | null
          caller_email: string | null
          caller_name: string
          caller_phone: string
          caller_unit_number: string | null
          created_at: string | null
          has_pets: boolean | null
          id: string
          is_emergency: boolean | null
          issue_category: string
          issue_description: string
          issue_location: string | null
          issue_subcategory: string | null
          preferred_access_time: string | null
          preferred_contact_time: string | null
          property_id: string | null
          resolution_notes: string | null
          resolution_photos: string[] | null
          resolved_at: string | null
          resolved_by: string | null
          special_access_instructions: string | null
          status: string | null
          ticket_number: number
          unit_id: string | null
          updated_at: string | null
          urgency_level: string | null
          work_order_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          call_duration_seconds?: number | null
          call_ended_at?: string | null
          call_id?: string | null
          call_recording_url?: string | null
          call_started_at?: string | null
          call_transcript?: string | null
          caller_email?: string | null
          caller_name: string
          caller_phone: string
          caller_unit_number?: string | null
          created_at?: string | null
          has_pets?: boolean | null
          id?: string
          is_emergency?: boolean | null
          issue_category: string
          issue_description: string
          issue_location?: string | null
          issue_subcategory?: string | null
          preferred_access_time?: string | null
          preferred_contact_time?: string | null
          property_id?: string | null
          resolution_notes?: string | null
          resolution_photos?: string[] | null
          resolved_at?: string | null
          resolved_by?: string | null
          special_access_instructions?: string | null
          status?: string | null
          ticket_number?: number
          unit_id?: string | null
          updated_at?: string | null
          urgency_level?: string | null
          work_order_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          call_duration_seconds?: number | null
          call_ended_at?: string | null
          call_id?: string | null
          call_recording_url?: string | null
          call_started_at?: string | null
          call_transcript?: string | null
          caller_email?: string | null
          caller_name?: string
          caller_phone?: string
          caller_unit_number?: string | null
          created_at?: string | null
          has_pets?: boolean | null
          id?: string
          is_emergency?: boolean | null
          issue_category?: string
          issue_description?: string
          issue_location?: string | null
          issue_subcategory?: string | null
          preferred_access_time?: string | null
          preferred_contact_time?: string | null
          property_id?: string | null
          resolution_notes?: string | null
          resolution_photos?: string[] | null
          resolved_at?: string | null
          resolved_by?: string | null
          special_access_instructions?: string | null
          status?: string | null
          ticket_number?: number
          unit_id?: string | null
          updated_at?: string | null
          urgency_level?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          is_archived: boolean | null
          is_group: boolean | null
          last_message_at: string | null
          participant_ids: string[]
          subject: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          is_archived?: boolean | null
          is_group?: boolean | null
          last_message_at?: string | null
          participant_ids?: string[]
          subject: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          is_archived?: boolean | null
          is_group?: boolean | null
          last_message_at?: string | null
          participant_ids?: string[]
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nspire_scoring_weights: {
        Row: {
          area: string
          category: string
          created_at: string
          display_order: number
          id: string
          weight: number
        }
        Insert: {
          area: string
          category: string
          created_at?: string
          display_order?: number
          id?: string
          weight: number
        }
        Update: {
          area?: string
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          weight?: number
        }
        Relationships: []
      }
      onboarding_status: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          steps_completed: Json | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          steps_completed?: Json | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          steps_completed?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      organization_documents: {
        Row: {
          created_at: string | null
          description: string | null
          expiry_date: string | null
          file_size: number | null
          file_url: string
          folder: string
          folder_id: string | null
          id: string
          is_archived: boolean | null
          mime_type: string | null
          name: string
          previous_version_id: string | null
          subfolder: string | null
          tags: string[] | null
          updated_at: string | null
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          expiry_date?: string | null
          file_size?: number | null
          file_url: string
          folder?: string
          folder_id?: string | null
          id?: string
          is_archived?: boolean | null
          mime_type?: string | null
          name: string
          previous_version_id?: string | null
          subfolder?: string | null
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          expiry_date?: string | null
          file_size?: number | null
          file_url?: string
          folder?: string
          folder_id?: string | null
          id?: string
          is_archived?: boolean | null
          mime_type?: string | null
          name?: string
          previous_version_id?: string | null
          subfolder?: string | null
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_documents_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "organization_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      permit_deliverables: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          description: string | null
          document_id: string | null
          due_date: string
          id: string
          notes: string | null
          rejection_reason: string | null
          requirement_id: string
          status: Database["public"]["Enums"]["deliverable_status"]
          submitted_at: string | null
          submitted_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          document_id?: string | null
          due_date: string
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          requirement_id: string
          status?: Database["public"]["Enums"]["deliverable_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          document_id?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          requirement_id?: string
          status?: Database["public"]["Enums"]["deliverable_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permit_deliverables_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "organization_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permit_deliverables_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "permit_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      permit_requirements: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          frequency: Database["public"]["Enums"]["requirement_frequency"]
          id: string
          last_completed_date: string | null
          next_due_date: string | null
          notes: string | null
          permit_id: string
          requirement_type: Database["public"]["Enums"]["requirement_type"]
          responsible_user_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["requirement_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["requirement_frequency"]
          id?: string
          last_completed_date?: string | null
          next_due_date?: string | null
          notes?: string | null
          permit_id: string
          requirement_type: Database["public"]["Enums"]["requirement_type"]
          responsible_user_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["requirement_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["requirement_frequency"]
          id?: string
          last_completed_date?: string | null
          next_due_date?: string | null
          notes?: string | null
          permit_id?: string
          requirement_type?: Database["public"]["Enums"]["requirement_type"]
          responsible_user_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["requirement_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permit_requirements_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "permits"
            referencedColumns: ["id"]
          },
        ]
      }
      permits: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          document_id: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuing_authority: string | null
          name: string
          notes: string | null
          permit_number: string | null
          permit_type: Database["public"]["Enums"]["permit_type"]
          property_id: string
          status: Database["public"]["Enums"]["permit_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_id?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          name: string
          notes?: string | null
          permit_number?: string | null
          permit_type: Database["public"]["Enums"]["permit_type"]
          property_id: string
          status?: Database["public"]["Enums"]["permit_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_id?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          name?: string
          notes?: string | null
          permit_number?: string | null
          permit_type?: Database["public"]["Enums"]["permit_type"]
          property_id?: string
          status?: Database["public"]["Enums"]["permit_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permits_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "organization_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auto_bcc_enabled: boolean | null
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          full_name: string | null
          hire_date: string | null
          id: string
          job_title: string | null
          last_active_at: string | null
          phone: string | null
          status: string | null
          updated_at: string
          user_id: string
          work_email: string | null
        }
        Insert: {
          auto_bcc_enabled?: boolean | null
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string
          job_title?: string | null
          last_active_at?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          work_email?: string | null
        }
        Update: {
          auto_bcc_enabled?: boolean | null
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string
          job_title?: string | null
          last_active_at?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          work_email?: string | null
        }
        Relationships: []
      }
      project_closeout_items: {
        Row: {
          category: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          document_url: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          project_id: string
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          document_url?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          project_id: string
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          document_url?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          project_id?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_closeout_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_communications: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          participants: string[] | null
          project_id: string
          subject: string
          type: Database["public"]["Enums"]["communication_type"]
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          participants?: string[] | null
          project_id: string
          subject: string
          type?: Database["public"]["Enums"]["communication_type"]
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          participants?: string[] | null
          project_id?: string
          subject?: string
          type?: Database["public"]["Enums"]["communication_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_communications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_discussion_replies: {
        Row: {
          attachments: string[] | null
          content: string
          content_html: string | null
          created_at: string
          created_by: string
          discussion_id: string
          edited_at: string | null
          id: string
          is_edited: boolean
        }
        Insert: {
          attachments?: string[] | null
          content: string
          content_html?: string | null
          created_at?: string
          created_by: string
          discussion_id: string
          edited_at?: string | null
          id?: string
          is_edited?: boolean
        }
        Update: {
          attachments?: string[] | null
          content?: string
          content_html?: string | null
          created_at?: string
          created_by?: string
          discussion_id?: string
          edited_at?: string | null
          id?: string
          is_edited?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "project_discussion_replies_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "project_discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_discussions: {
        Row: {
          attachments: string[] | null
          content: string
          content_html: string | null
          created_at: string
          created_by: string
          id: string
          is_pinned: boolean
          linked_entity_id: string | null
          linked_entity_type: string | null
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: string[] | null
          content: string
          content_html?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_pinned?: boolean
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: string[] | null
          content?: string
          content_html?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_pinned?: boolean
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_discussions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          created_at: string
          file_size: number | null
          file_url: string
          folder: string | null
          id: string
          mime_type: string | null
          name: string
          project_id: string
          updated_at: string
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          file_url: string
          folder?: string | null
          id?: string
          mime_type?: string | null
          name: string
          project_id: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string
          file_size?: number | null
          file_url?: string
          folder?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          project_id?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_lessons_learned: {
        Row: {
          category: string
          created_at: string
          id: string
          impact: string | null
          lesson: string | null
          project_id: string
          recommendation: string | null
          submitted_by: string | null
          title: string
          updated_at: string
          what_happened: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          impact?: string | null
          lesson?: string | null
          project_id: string
          recommendation?: string | null
          submitted_by?: string | null
          title: string
          updated_at?: string
          what_happened?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          impact?: string | null
          lesson?: string | null
          project_id?: string
          recommendation?: string | null
          submitted_by?: string | null
          title?: string
          updated_at?: string
          what_happened?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_lessons_learned_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          assigned_to: string | null
          color: string | null
          completed_at: string | null
          created_at: string
          depends_on: string | null
          due_date: string
          id: string
          name: string
          notes: string | null
          progress_percent: number | null
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          color?: string | null
          completed_at?: string | null
          created_at?: string
          depends_on?: string | null
          due_date: string
          id?: string
          name: string
          notes?: string | null
          progress_percent?: number | null
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          color?: string | null
          completed_at?: string | null
          created_at?: string
          depends_on?: string | null
          due_date?: string
          id?: string
          name?: string
          notes?: string | null
          progress_percent?: number | null
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_depends_on_fkey"
            columns: ["depends_on"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_progress_entries: {
        Row: {
          actual_cost: number | null
          created_at: string
          earned_value: number | null
          entry_date: string
          id: string
          notes: string | null
          percent_complete: number | null
          planned_value: number | null
          project_id: string
          scope_description: string | null
          trade: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actual_cost?: number | null
          created_at?: string
          earned_value?: number | null
          entry_date?: string
          id?: string
          notes?: string | null
          percent_complete?: number | null
          planned_value?: number | null
          project_id: string
          scope_description?: string | null
          trade: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actual_cost?: number | null
          created_at?: string
          earned_value?: number | null
          entry_date?: string
          id?: string
          notes?: string | null
          percent_complete?: number | null
          planned_value?: number | null
          project_id?: string
          scope_description?: string | null
          trade?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_progress_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_proposals: {
        Row: {
          ai_generated: boolean | null
          ai_prompt: string | null
          attachment_ids: string[] | null
          content_html: string | null
          content_text: string | null
          created_at: string
          created_by: string
          id: string
          include_letterhead: boolean | null
          include_logo: boolean | null
          letterhead_config: Json | null
          parent_version_id: string | null
          project_id: string
          proposal_number: number
          proposal_type: Database["public"]["Enums"]["proposal_type"]
          recipient_address: string | null
          recipient_company: string | null
          recipient_email: string | null
          recipient_name: string | null
          sent_at: string | null
          sent_by: string | null
          sent_email_id: string | null
          status: Database["public"]["Enums"]["proposal_status"]
          subject: string | null
          title: string
          updated_at: string
          version: number | null
        }
        Insert: {
          ai_generated?: boolean | null
          ai_prompt?: string | null
          attachment_ids?: string[] | null
          content_html?: string | null
          content_text?: string | null
          created_at?: string
          created_by: string
          id?: string
          include_letterhead?: boolean | null
          include_logo?: boolean | null
          letterhead_config?: Json | null
          parent_version_id?: string | null
          project_id: string
          proposal_number?: number
          proposal_type?: Database["public"]["Enums"]["proposal_type"]
          recipient_address?: string | null
          recipient_company?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          sent_at?: string | null
          sent_by?: string | null
          sent_email_id?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          subject?: string | null
          title: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          ai_generated?: boolean | null
          ai_prompt?: string | null
          attachment_ids?: string[] | null
          content_html?: string | null
          content_text?: string | null
          created_at?: string
          created_by?: string
          id?: string
          include_letterhead?: boolean | null
          include_logo?: boolean | null
          letterhead_config?: Json | null
          parent_version_id?: string | null
          project_id?: string
          proposal_number?: number
          proposal_type?: Database["public"]["Enums"]["proposal_type"]
          recipient_address?: string | null
          recipient_company?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          sent_at?: string | null
          sent_by?: string | null
          sent_email_id?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          subject?: string | null
          title?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_proposals_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "project_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_proposals_sent_email_id_fkey"
            columns: ["sent_email_id"]
            isOneToOne: false
            referencedRelation: "report_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      project_purchase_orders: {
        Row: {
          actual_delivery: string | null
          created_at: string
          created_by: string | null
          description: string | null
          expected_delivery: string | null
          id: string
          line_items: Json | null
          notes: string | null
          order_date: string | null
          po_number: number
          project_id: string
          status: string
          subtotal: number | null
          tax: number | null
          total: number | null
          updated_at: string
          vendor_contact: string | null
          vendor_name: string
        }
        Insert: {
          actual_delivery?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expected_delivery?: string | null
          id?: string
          line_items?: Json | null
          notes?: string | null
          order_date?: string | null
          po_number?: number
          project_id: string
          status?: string
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          updated_at?: string
          vendor_contact?: string | null
          vendor_name: string
        }
        Update: {
          actual_delivery?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expected_delivery?: string | null
          id?: string
          line_items?: Json | null
          notes?: string | null
          order_date?: string | null
          po_number?: number
          project_id?: string
          status?: string
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          updated_at?: string
          vendor_contact?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_rfis: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          project_id: string
          question: string
          responded_at: string | null
          responded_by: string | null
          response: string | null
          rfi_number: number
          status: Database["public"]["Enums"]["rfi_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          project_id: string
          question: string
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          rfi_number?: number
          status?: Database["public"]["Enums"]["rfi_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          project_id?: string
          question?: string
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          rfi_number?: number
          status?: Database["public"]["Enums"]["rfi_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_safety_incidents: {
        Row: {
          corrective_action: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          incident_date: string
          incident_type: string
          injured_party: string | null
          location: string | null
          osha_recordable: boolean | null
          project_id: string
          reported_by: string | null
          severity: string
          status: string
          title: string
          updated_at: string
          witnesses: string | null
        }
        Insert: {
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          incident_date?: string
          incident_type?: string
          injured_party?: string | null
          location?: string | null
          osha_recordable?: boolean | null
          project_id: string
          reported_by?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
          witnesses?: string | null
        }
        Update: {
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          incident_date?: string
          incident_type?: string
          injured_party?: string | null
          location?: string | null
          osha_recordable?: boolean | null
          project_id?: string
          reported_by?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          witnesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_safety_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_submittals: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          file_urls: string[] | null
          id: string
          project_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          revision: number | null
          status: Database["public"]["Enums"]["submittal_status"]
          submittal_number: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          file_urls?: string[] | null
          id?: string
          project_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision?: number | null
          status?: Database["public"]["Enums"]["submittal_status"]
          submittal_number?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          file_urls?: string[] | null
          id?: string
          project_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision?: number | null
          status?: Database["public"]["Enums"]["submittal_status"]
          submittal_number?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team_members: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          project_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          project_id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_toolbox_talks: {
        Row: {
          attendees: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          presenter: string | null
          project_id: string
          talk_date: string
          topic: string
          updated_at: string
        }
        Insert: {
          attendees?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          presenter?: string | null
          project_id: string
          talk_date?: string
          topic: string
          updated_at?: string
        }
        Update: {
          attendees?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          presenter?: string | null
          project_id?: string
          talk_date?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_toolbox_talks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_warranties: {
        Row: {
          contact_info: string | null
          coverage_details: string | null
          created_at: string
          created_by: string | null
          document_url: string | null
          duration_months: number | null
          end_date: string | null
          id: string
          item_name: string
          notes: string | null
          project_id: string
          start_date: string | null
          status: string
          updated_at: string
          vendor: string | null
          warranty_type: string | null
        }
        Insert: {
          contact_info?: string | null
          coverage_details?: string | null
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          duration_months?: number | null
          end_date?: string | null
          id?: string
          item_name: string
          notes?: string | null
          project_id: string
          start_date?: string | null
          status?: string
          updated_at?: string
          vendor?: string | null
          warranty_type?: string | null
        }
        Update: {
          contact_info?: string | null
          coverage_details?: string | null
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          duration_months?: number | null
          end_date?: string | null
          id?: string
          item_name?: string
          notes?: string | null
          project_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          vendor?: string | null
          warranty_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_warranties_project_id_fkey"
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
          daily_grounds_enabled: boolean | null
          id: string
          is_demo: boolean | null
          mailing_address: string | null
          mailing_city: string | null
          mailing_state: string | null
          mailing_zip: string | null
          name: string
          nspire_enabled: boolean | null
          occupancy_enabled: boolean | null
          projects_enabled: boolean | null
          qr_scanning_enabled: boolean | null
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
          daily_grounds_enabled?: boolean | null
          id?: string
          is_demo?: boolean | null
          mailing_address?: string | null
          mailing_city?: string | null
          mailing_state?: string | null
          mailing_zip?: string | null
          name: string
          nspire_enabled?: boolean | null
          occupancy_enabled?: boolean | null
          projects_enabled?: boolean | null
          qr_scanning_enabled?: boolean | null
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
          daily_grounds_enabled?: boolean | null
          id?: string
          is_demo?: boolean | null
          mailing_address?: string | null
          mailing_city?: string | null
          mailing_state?: string | null
          mailing_zip?: string | null
          name?: string
          nspire_enabled?: boolean | null
          occupancy_enabled?: boolean | null
          projects_enabled?: boolean | null
          qr_scanning_enabled?: boolean | null
          state?: string
          status?: string | null
          total_units?: number | null
          updated_at?: string
          year_built?: number | null
          zip_code?: string | null
        }
        Relationships: []
      }
      property_archives: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          document_number: string | null
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          name: string
          notes: string | null
          original_date: string | null
          property_id: string | null
          received_from: string | null
          revision: string | null
          subcategory: string | null
          tags: string[] | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          document_number?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          name: string
          notes?: string | null
          original_date?: string | null
          property_id?: string | null
          received_from?: string | null
          revision?: string | null
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          document_number?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          name?: string
          notes?: string | null
          original_date?: string | null
          property_id?: string | null
          received_from?: string | null
          revision?: string | null
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_archives_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_team_members: {
        Row: {
          added_by: string | null
          archived_at: string | null
          archived_by: string | null
          created_at: string
          department: string | null
          departure_notes: string | null
          departure_reason: string | null
          end_date: string | null
          id: string
          property_id: string
          role: Database["public"]["Enums"]["app_role"]
          start_date: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          department?: string | null
          departure_notes?: string | null
          departure_reason?: string | null
          end_date?: string | null
          id?: string
          property_id: string
          role?: Database["public"]["Enums"]["app_role"]
          start_date?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          department?: string | null
          departure_notes?: string | null
          departure_reason?: string | null
          end_date?: string | null
          id?: string
          property_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          start_date?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_team_members_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_templates: {
        Row: {
          content_template: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          prompt_template: string
          proposal_type: Database["public"]["Enums"]["proposal_type"]
        }
        Insert: {
          content_template?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          prompt_template: string
          proposal_type: Database["public"]["Enums"]["proposal_type"]
        }
        Update: {
          content_template?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          prompt_template?: string
          proposal_type?: Database["public"]["Enums"]["proposal_type"]
        }
        Relationships: []
      }
      punch_items: {
        Row: {
          after_photos: string[] | null
          assigned_to: string | null
          before_photos: string[] | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          location: string
          priority: string | null
          project_id: string
          status: Database["public"]["Enums"]["punch_status"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          after_photos?: string[] | null
          assigned_to?: string | null
          before_photos?: string[] | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          location: string
          priority?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["punch_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          after_photos?: string[] | null
          assigned_to?: string | null
          before_photos?: string[] | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          location?: string
          priority?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["punch_status"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "punch_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      report_emails: {
        Row: {
          archived_at: string | null
          attachment_filename: string | null
          attachment_size: number | null
          bcc_recipients: string[] | null
          body_html: string | null
          body_text: string | null
          cc_recipients: string[] | null
          daily_inspection_id: string | null
          deleted_at: string | null
          error_message: string | null
          from_user_id: string | null
          from_user_name: string | null
          id: string
          is_archived: boolean | null
          is_deleted: boolean | null
          is_read: boolean | null
          message_type: Database["public"]["Enums"]["message_type"] | null
          project_id: string | null
          property_id: string | null
          proposal_id: string | null
          recipient_user_ids: string[] | null
          recipients: string[]
          reply_to_id: string | null
          report_id: string | null
          report_type: string | null
          sent_at: string
          sent_by: string | null
          source_module: string | null
          status: string | null
          subject: string
          thread_id: string | null
          work_order_id: string | null
        }
        Insert: {
          archived_at?: string | null
          attachment_filename?: string | null
          attachment_size?: number | null
          bcc_recipients?: string[] | null
          body_html?: string | null
          body_text?: string | null
          cc_recipients?: string[] | null
          daily_inspection_id?: string | null
          deleted_at?: string | null
          error_message?: string | null
          from_user_id?: string | null
          from_user_name?: string | null
          id?: string
          is_archived?: boolean | null
          is_deleted?: boolean | null
          is_read?: boolean | null
          message_type?: Database["public"]["Enums"]["message_type"] | null
          project_id?: string | null
          property_id?: string | null
          proposal_id?: string | null
          recipient_user_ids?: string[] | null
          recipients: string[]
          reply_to_id?: string | null
          report_id?: string | null
          report_type?: string | null
          sent_at?: string
          sent_by?: string | null
          source_module?: string | null
          status?: string | null
          subject: string
          thread_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          archived_at?: string | null
          attachment_filename?: string | null
          attachment_size?: number | null
          bcc_recipients?: string[] | null
          body_html?: string | null
          body_text?: string | null
          cc_recipients?: string[] | null
          daily_inspection_id?: string | null
          deleted_at?: string | null
          error_message?: string | null
          from_user_id?: string | null
          from_user_name?: string | null
          id?: string
          is_archived?: boolean | null
          is_deleted?: boolean | null
          is_read?: boolean | null
          message_type?: Database["public"]["Enums"]["message_type"] | null
          project_id?: string | null
          property_id?: string | null
          proposal_id?: string | null
          recipient_user_ids?: string[] | null
          recipients?: string[]
          reply_to_id?: string | null
          report_id?: string | null
          report_type?: string | null
          sent_at?: string
          sent_by?: string | null
          source_module?: string | null
          status?: string | null
          subject?: string
          thread_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_emails_daily_inspection_id_fkey"
            columns: ["daily_inspection_id"]
            isOneToOne: false
            referencedRelation: "daily_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_emails_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_emails_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_emails_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "project_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_emails_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "report_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_emails_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_emails_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      role_definitions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_name: string
          id: string
          is_system_role: boolean | null
          permissions: Json
          priority: number
          role_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_system_role?: boolean | null
          permissions?: Json
          priority?: number
          role_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_system_role?: boolean | null
          permissions?: Json
          priority?: number
          role_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          action: string
          allowed: boolean | null
          created_at: string
          id: string
          module: string
          role_key: string
        }
        Insert: {
          action: string
          allowed?: boolean | null
          created_at?: string
          id?: string
          module: string
          role_key: string
        }
        Update: {
          action?: string
          allowed?: boolean | null
          created_at?: string
          id?: string
          module?: string
          role_key?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          created_at: string
          created_by: string | null
          deposit_amount: number | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          lease_end: string | null
          lease_start: string
          move_in_date: string | null
          move_out_date: string | null
          notes: string | null
          phone: string | null
          rent_amount: number | null
          status: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deposit_amount?: number | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          lease_end?: string | null
          lease_start: string
          move_in_date?: string | null
          move_out_date?: string | null
          notes?: string | null
          phone?: string | null
          rent_amount?: number | null
          status?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deposit_amount?: number | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          lease_end?: string | null
          lease_start?: string
          move_in_date?: string | null
          move_out_date?: string | null
          notes?: string | null
          phone?: string | null
          rent_amount?: number | null
          status?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_messages: {
        Row: {
          attachments: string[] | null
          content: string
          content_html: string | null
          created_at: string | null
          edited_at: string | null
          id: string
          is_edited: boolean | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          attachments?: string[] | null
          content: string
          content_html?: string | null
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          sender_id: string
          thread_id: string
        }
        Update: {
          attachments?: string[] | null
          content?: string
          content_html?: string | null
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_read_status: {
        Row: {
          id: string
          last_read_at: string | null
          thread_id: string
          user_id: string
        }
        Insert: {
          id?: string
          last_read_at?: string | null
          thread_id: string
          user_id: string
        }
        Update: {
          id?: string
          last_read_at?: string | null
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_read_status_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      training_courses: {
        Row: {
          allow_resume: boolean | null
          category: string
          content_path: string
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          entry_file: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          passing_score: number | null
          sort_order: number | null
          target_roles: Database["public"]["Enums"]["app_role"][] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
          version: string | null
        }
        Insert: {
          allow_resume?: boolean | null
          category?: string
          content_path: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          entry_file?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          passing_score?: number | null
          sort_order?: number | null
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
          version?: string | null
        }
        Update: {
          allow_resume?: boolean | null
          category?: string
          content_path?: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          entry_file?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          passing_score?: number | null
          sort_order?: number | null
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
          version?: string | null
        }
        Relationships: []
      }
      training_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          resource_id: string
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          resource_id: string
          started_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          resource_id?: string
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_progress_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "training_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      training_requests: {
        Row: {
          admin_response: string | null
          category: string | null
          created_at: string
          description: string
          id: string
          priority: string | null
          responded_at: string | null
          responded_by: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          category?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      training_resources: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          embed_code: string | null
          external_url: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          resource_type: string
          sort_order: number | null
          target_roles: Database["public"]["Enums"]["app_role"][] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          embed_code?: string | null
          external_url?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          resource_type: string
          sort_order?: number | null
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          embed_code?: string | null
          external_url?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          resource_type?: string
          sort_order?: number | null
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
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
      user_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          property_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          property_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          property_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_module_access: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          module_key: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          module_key: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          module_key?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
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
      user_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_role: Database["public"]["Enums"]["app_role"] | null
          new_status: string
          notes: string | null
          previous_role: Database["public"]["Enums"]["app_role"] | null
          previous_status: string | null
          property_id: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_role?: Database["public"]["Enums"]["app_role"] | null
          new_status: string
          notes?: string | null
          previous_role?: Database["public"]["Enums"]["app_role"] | null
          previous_status?: string | null
          property_id?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_role?: Database["public"]["Enums"]["app_role"] | null
          new_status?: string
          notes?: string | null
          previous_role?: Database["public"]["Enums"]["app_role"] | null
          previous_status?: string | null
          property_id?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_status_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_agent_config: {
        Row: {
          after_hours_message: string | null
          agent_name: string | null
          avg_call_duration_seconds: number | null
          business_hours_end: string | null
          business_hours_start: string | null
          calls_handled: number | null
          closing_message: string | null
          created_at: string | null
          emergency_keywords: string[] | null
          emergency_notification_phone: string | null
          greeting_message: string | null
          id: string
          issue_categories: Json | null
          knowledge_base: Json | null
          property_id: string | null
          supervisor_notification_emails: string[] | null
          updated_at: string | null
        }
        Insert: {
          after_hours_message?: string | null
          agent_name?: string | null
          avg_call_duration_seconds?: number | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          calls_handled?: number | null
          closing_message?: string | null
          created_at?: string | null
          emergency_keywords?: string[] | null
          emergency_notification_phone?: string | null
          greeting_message?: string | null
          id?: string
          issue_categories?: Json | null
          knowledge_base?: Json | null
          property_id?: string | null
          supervisor_notification_emails?: string[] | null
          updated_at?: string | null
        }
        Update: {
          after_hours_message?: string | null
          agent_name?: string | null
          avg_call_duration_seconds?: number | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          calls_handled?: number | null
          closing_message?: string | null
          created_at?: string | null
          emergency_keywords?: string[] | null
          emergency_notification_phone?: string | null
          greeting_message?: string | null
          id?: string
          issue_categories?: Json | null
          knowledge_base?: Json | null
          property_id?: string | null
          supervisor_notification_emails?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_agent_config_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_activity: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          user_id: string | null
          work_order_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
          work_order_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_activity_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_comments: {
        Row: {
          attachments: string[] | null
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          work_order_id: string
        }
        Insert: {
          attachments?: string[] | null
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          work_order_id: string
        }
        Update: {
          attachments?: string[] | null
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_comments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          actual_cost: number | null
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          closed_at: string | null
          closed_by: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          defect_id: string | null
          description: string | null
          due_date: string
          estimated_cost: number | null
          id: string
          issue_id: string | null
          notes: string | null
          priority: Database["public"]["Enums"]["work_order_priority"]
          proof_photos: string[] | null
          property_id: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["work_order_status"]
          submitted_at: string | null
          title: string
          unit_id: string | null
          updated_at: string
          work_order_number: number
        }
        Insert: {
          actual_cost?: number | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          closed_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          defect_id?: string | null
          description?: string | null
          due_date: string
          estimated_cost?: number | null
          id?: string
          issue_id?: string | null
          notes?: string | null
          priority?: Database["public"]["Enums"]["work_order_priority"]
          proof_photos?: string[] | null
          property_id: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          submitted_at?: string | null
          title: string
          unit_id?: string | null
          updated_at?: string
          work_order_number?: number
        }
        Update: {
          actual_cost?: number | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          closed_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          defect_id?: string | null
          description?: string | null
          due_date?: string
          estimated_cost?: number | null
          id?: string
          issue_id?: string | null
          notes?: string | null
          priority?: Database["public"]["Enums"]["work_order_priority"]
          proof_photos?: string[] | null
          property_id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          submitted_at?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string
          work_order_number?: number
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
      can_view_demo_property: { Args: { _user_id: string }; Returns: boolean }
      get_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          property_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }[]
        SetofOptions: {
          from: "*"
          to: "user_invitations"
          isOneToOne: false
          isSetofReturn: true
        }
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
      app_role:
        | "admin"
        | "manager"
        | "inspector"
        | "user"
        | "owner"
        | "project_manager"
        | "superintendent"
        | "subcontractor"
        | "viewer"
        | "administrator"
        | "clerk"
      asset_type:
        | "cleanout"
        | "catch_basin"
        | "lift_station"
        | "retention_pond"
        | "general_grounds"
      change_order_status: "draft" | "pending" | "approved" | "rejected"
      communication_type: "call" | "email" | "meeting" | "note"
      contact_type:
        | "vendor"
        | "regulator"
        | "contractor"
        | "tenant"
        | "owner"
        | "inspector"
        | "utility"
        | "government"
        | "other"
      daily_inspection_review_status:
        | "pending_review"
        | "approved"
        | "needs_revision"
        | "rejected"
      deliverable_status:
        | "pending"
        | "submitted"
        | "approved"
        | "rejected"
        | "overdue"
      inspection_area: "outside" | "inside" | "unit"
      inspection_item_status: "ok" | "needs_attention" | "defect_found"
      issue_source:
        | "core"
        | "nspire"
        | "projects"
        | "daily_grounds"
        | "permits"
        | "voice_agent"
      message_type: "external" | "internal"
      permit_status: "draft" | "active" | "expired" | "renewed" | "revoked"
      permit_type:
        | "building_permit"
        | "occupancy_certificate"
        | "fire_safety"
        | "elevator"
        | "pool"
        | "boiler"
        | "environmental"
        | "hud_compliance"
        | "ada"
        | "other"
      project_status: "planning" | "active" | "on_hold" | "completed" | "closed"
      proposal_status: "draft" | "review" | "approved" | "sent" | "archived"
      proposal_type:
        | "project_proposal"
        | "change_order_request"
        | "scope_amendment"
        | "cost_estimate"
        | "letter"
        | "memo"
        | "correspondence"
      punch_status: "open" | "in_progress" | "completed" | "verified"
      requirement_frequency:
        | "one_time"
        | "monthly"
        | "quarterly"
        | "semi_annual"
        | "annual"
        | "biennial"
        | "as_needed"
      requirement_status:
        | "pending"
        | "in_progress"
        | "compliant"
        | "non_compliant"
        | "waived"
      requirement_type:
        | "inspection"
        | "report"
        | "certification"
        | "filing"
        | "payment"
        | "training"
        | "other"
      rfi_status: "open" | "pending" | "answered" | "closed"
      severity_level: "low" | "moderate" | "severe"
      submittal_status: "pending" | "approved" | "rejected" | "revise"
      work_order_priority: "emergency" | "routine"
      work_order_status:
        | "draft"
        | "pending_approval"
        | "rejected"
        | "pending"
        | "assigned"
        | "in_progress"
        | "completed"
        | "verified"
        | "closed"
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
        "admin",
        "manager",
        "inspector",
        "user",
        "owner",
        "project_manager",
        "superintendent",
        "subcontractor",
        "viewer",
        "administrator",
        "clerk",
      ],
      asset_type: [
        "cleanout",
        "catch_basin",
        "lift_station",
        "retention_pond",
        "general_grounds",
      ],
      change_order_status: ["draft", "pending", "approved", "rejected"],
      communication_type: ["call", "email", "meeting", "note"],
      contact_type: [
        "vendor",
        "regulator",
        "contractor",
        "tenant",
        "owner",
        "inspector",
        "utility",
        "government",
        "other",
      ],
      daily_inspection_review_status: [
        "pending_review",
        "approved",
        "needs_revision",
        "rejected",
      ],
      deliverable_status: [
        "pending",
        "submitted",
        "approved",
        "rejected",
        "overdue",
      ],
      inspection_area: ["outside", "inside", "unit"],
      inspection_item_status: ["ok", "needs_attention", "defect_found"],
      issue_source: [
        "core",
        "nspire",
        "projects",
        "daily_grounds",
        "permits",
        "voice_agent",
      ],
      message_type: ["external", "internal"],
      permit_status: ["draft", "active", "expired", "renewed", "revoked"],
      permit_type: [
        "building_permit",
        "occupancy_certificate",
        "fire_safety",
        "elevator",
        "pool",
        "boiler",
        "environmental",
        "hud_compliance",
        "ada",
        "other",
      ],
      project_status: ["planning", "active", "on_hold", "completed", "closed"],
      proposal_status: ["draft", "review", "approved", "sent", "archived"],
      proposal_type: [
        "project_proposal",
        "change_order_request",
        "scope_amendment",
        "cost_estimate",
        "letter",
        "memo",
        "correspondence",
      ],
      punch_status: ["open", "in_progress", "completed", "verified"],
      requirement_frequency: [
        "one_time",
        "monthly",
        "quarterly",
        "semi_annual",
        "annual",
        "biennial",
        "as_needed",
      ],
      requirement_status: [
        "pending",
        "in_progress",
        "compliant",
        "non_compliant",
        "waived",
      ],
      requirement_type: [
        "inspection",
        "report",
        "certification",
        "filing",
        "payment",
        "training",
        "other",
      ],
      rfi_status: ["open", "pending", "answered", "closed"],
      severity_level: ["low", "moderate", "severe"],
      submittal_status: ["pending", "approved", "rejected", "revise"],
      work_order_priority: ["emergency", "routine"],
      work_order_status: [
        "draft",
        "pending_approval",
        "rejected",
        "pending",
        "assigned",
        "in_progress",
        "completed",
        "verified",
        "closed",
      ],
    },
  },
} as const
