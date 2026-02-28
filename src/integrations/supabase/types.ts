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
      action_item_comments: {
        Row: {
          action_item_id: string
          content: string
          created_at: string | null
          created_by: string
          id: string
          updated_at: string | null
        }
        Insert: {
          action_item_id: string
          content: string
          created_at?: string | null
          created_by: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          action_item_id?: string
          content?: string
          created_at?: string | null
          created_by?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_item_comments_action_item_id_fkey"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "project_action_items"
            referencedColumns: ["id"]
          },
        ]
      }
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
      ai_skill_prompts: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          model: string
          skill_key: string
          system_prompt: string
          updated_at: string
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          model?: string
          skill_key: string
          system_prompt: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          model?: string
          skill_key?: string
          system_prompt?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_skill_prompts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      client_action_items: {
        Row: {
          action_type: string
          amount: number | null
          attachment_urls: string[] | null
          client_response: string | null
          client_selection: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          linked_change_order_id: string | null
          linked_document_id: string | null
          linked_rfi_id: string | null
          options: Json | null
          pm_notes: string | null
          priority: string
          project_id: string
          resolved_at: string | null
          resolved_by: string | null
          responded_at: string | null
          sent_at: string | null
          status: string
          title: string
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          action_type?: string
          amount?: number | null
          attachment_urls?: string[] | null
          client_response?: string | null
          client_selection?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          linked_change_order_id?: string | null
          linked_document_id?: string | null
          linked_rfi_id?: string | null
          options?: Json | null
          pm_notes?: string | null
          priority?: string
          project_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          responded_at?: string | null
          sent_at?: string | null
          status?: string
          title: string
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          action_type?: string
          amount?: number | null
          attachment_urls?: string[] | null
          client_response?: string | null
          client_selection?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          linked_change_order_id?: string | null
          linked_document_id?: string | null
          linked_rfi_id?: string | null
          options?: Json | null
          pm_notes?: string | null
          priority?: string
          project_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          responded_at?: string | null
          sent_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_action_items_linked_change_order_id_fkey"
            columns: ["linked_change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_action_items_linked_document_id_fkey"
            columns: ["linked_document_id"]
            isOneToOne: false
            referencedRelation: "project_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_action_items_linked_rfi_id_fkey"
            columns: ["linked_rfi_id"]
            isOneToOne: false
            referencedRelation: "project_rfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_action_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_messages: {
        Row: {
          body: string
          created_at: string
          direction: string
          id: string
          parent_id: string | null
          photo_urls: string[] | null
          project_id: string
          read_by_client: boolean
          read_by_client_at: string | null
          read_by_pm: boolean
          read_by_pm_at: string | null
          read_by_pm_user: string | null
          requires_response: boolean
          resolves_action_item_id: string | null
          responded_at: string | null
          sent_by: string | null
          subject: string | null
          thread_id: string | null
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          direction: string
          id?: string
          parent_id?: string | null
          photo_urls?: string[] | null
          project_id: string
          read_by_client?: boolean
          read_by_client_at?: string | null
          read_by_pm?: boolean
          read_by_pm_at?: string | null
          read_by_pm_user?: string | null
          requires_response?: boolean
          resolves_action_item_id?: string | null
          responded_at?: string | null
          sent_by?: string | null
          subject?: string | null
          thread_id?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          direction?: string
          id?: string
          parent_id?: string | null
          photo_urls?: string[] | null
          project_id?: string
          read_by_client?: boolean
          read_by_client_at?: string | null
          read_by_pm?: boolean
          read_by_pm_at?: string | null
          read_by_pm_user?: string | null
          requires_response?: boolean
          resolves_action_item_id?: string | null
          responded_at?: string | null
          sent_by?: string | null
          subject?: string | null
          thread_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "client_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_messages_resolves_action_item_fkey"
            columns: ["resolves_action_item_id"]
            isOneToOne: false
            referencedRelation: "client_action_items"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portals: {
        Row: {
          brand_accent_color: string | null
          brand_logo_url: string | null
          client_contact_email: string | null
          client_contact_name: string | null
          client_name: string | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          pending_requests_count: number
          portal_slug: string
          portal_type: string
          project_id: string | null
          shared_modules: string[]
          status: string
          updated_at: string
          welcome_message: string | null
          workspace_id: string
        }
        Insert: {
          brand_accent_color?: string | null
          brand_logo_url?: string | null
          client_contact_email?: string | null
          client_contact_name?: string | null
          client_name?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          pending_requests_count?: number
          portal_slug: string
          portal_type?: string
          project_id?: string | null
          shared_modules?: string[]
          status?: string
          updated_at?: string
          welcome_message?: string | null
          workspace_id: string
        }
        Update: {
          brand_accent_color?: string | null
          brand_logo_url?: string | null
          client_contact_email?: string | null
          client_contact_name?: string | null
          client_name?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          pending_requests_count?: number
          portal_slug?: string
          portal_type?: string
          project_id?: string | null
          shared_modules?: string[]
          status?: string
          updated_at?: string
          welcome_message?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          client_type: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          id: string
          industry: string | null
          is_active: boolean
          name: string
          notes: string | null
          state: string | null
          updated_at: string
          website: string | null
          workspace_id: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          client_type?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          name: string
          notes?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
          workspace_id?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          client_type?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          name?: string
          notes?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
          workspace_id: string | null
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
          workspace_id?: string | null
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
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_branding_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_events: {
        Row: {
          agency: string | null
          assigned_to: string | null
          category: string
          completed_at: string | null
          completion_notes: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string
          id: string
          notes: string | null
          priority: string
          property_id: string | null
          reminder_days: number[] | null
          source_id: string | null
          source_type: string
          status: string
          title: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          agency?: string | null
          assigned_to?: string | null
          category?: string
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date: string
          id?: string
          notes?: string | null
          priority?: string
          property_id?: string | null
          reminder_days?: number[] | null
          source_id?: string | null
          source_type?: string
          status?: string
          title: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          agency?: string | null
          assigned_to?: string | null
          category?: string
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          priority?: string
          property_id?: string | null
          reminder_days?: number[] | null
          source_id?: string | null
          source_type?: string
          status?: string
          title?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_events_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "compliance_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "compliance_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_performance_snapshots: {
        Row: {
          avg_days_to_complete: number | null
          completed_late: number | null
          completed_on_time: number | null
          contractor_id: string
          created_at: string | null
          defect_count: number | null
          id: string
          open_work_orders: number | null
          pay_apps_disputed: number | null
          punch_items_resolved: number | null
          snapshot_date: string
          total_certified_amount: number | null
          total_pay_apps: number | null
          total_punch_items: number | null
          total_work_orders: number | null
          workspace_id: string
        }
        Insert: {
          avg_days_to_complete?: number | null
          completed_late?: number | null
          completed_on_time?: number | null
          contractor_id: string
          created_at?: string | null
          defect_count?: number | null
          id?: string
          open_work_orders?: number | null
          pay_apps_disputed?: number | null
          punch_items_resolved?: number | null
          snapshot_date?: string
          total_certified_amount?: number | null
          total_pay_apps?: number | null
          total_punch_items?: number | null
          total_work_orders?: number | null
          workspace_id: string
        }
        Update: {
          avg_days_to_complete?: number | null
          completed_late?: number | null
          completed_on_time?: number | null
          contractor_id?: string
          created_at?: string | null
          defect_count?: number | null
          id?: string
          open_work_orders?: number | null
          pay_apps_disputed?: number | null
          punch_items_resolved?: number | null
          snapshot_date?: string
          total_certified_amount?: number | null
          total_pay_apps?: number | null
          total_punch_items?: number | null
          total_work_orders?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_performance_snapshots_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_performance_snapshots_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          company: string | null
          created_at: string | null
          email: string | null
          id: string
          insurance_expiry: string | null
          license_expiry: string | null
          license_number: string | null
          name: string
          notes: string | null
          phone: string | null
          status: string
          trade: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          insurance_expiry?: string | null
          license_expiry?: string | null
          license_number?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          trade?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          insurance_expiry?: string | null
          license_expiry?: string | null
          license_number?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          trade?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractors_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      credential_alerts: {
        Row: {
          alert_type: string
          created_at: string
          credential_id: string
          id: string
          sent_at: string | null
          sent_to: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          credential_id: string
          id?: string
          sent_at?: string | null
          sent_to: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          credential_id?: string
          id?: string
          sent_at?: string | null
          sent_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "credential_alerts_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credential_alerts_sent_to_fkey"
            columns: ["sent_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      credential_share_links: {
        Row: {
          access_count: number
          accessed_at: string | null
          created_at: string
          created_by: string
          credential_id: string
          expires_at: string
          id: string
          revoked: boolean
          token: string
        }
        Insert: {
          access_count?: number
          accessed_at?: string | null
          created_at?: string
          created_by: string
          credential_id: string
          expires_at?: string
          id?: string
          revoked?: boolean
          token: string
        }
        Update: {
          access_count?: number
          accessed_at?: string | null
          created_at?: string
          created_by?: string
          credential_id?: string
          expires_at?: string
          id?: string
          revoked?: boolean
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "credential_share_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "credential_share_links_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      credentials: {
        Row: {
          created_at: string
          credential_number: string | null
          credential_type: string
          custom_type_label: string | null
          document_url: string | null
          expiry_date: string | null
          holder_id: string
          id: string
          is_org_credential: boolean
          issue_date: string | null
          issuing_authority: string | null
          notes: string | null
          renewal_url: string | null
          status: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          credential_number?: string | null
          credential_type: string
          custom_type_label?: string | null
          document_url?: string | null
          expiry_date?: string | null
          holder_id: string
          id?: string
          is_org_credential?: boolean
          issue_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          renewal_url?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          credential_number?: string | null
          credential_type?: string
          custom_type_label?: string | null
          document_url?: string | null
          expiry_date?: string | null
          holder_id?: string
          id?: string
          is_org_credential?: boolean
          issue_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          renewal_url?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credentials_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "credentials_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
          workspace_id: string | null
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
          workspace_id?: string | null
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
          workspace_id?: string | null
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
          {
            foreignKeyName: "crm_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_assets: {
        Row: {
          asset_tag: string | null
          assigned_location: string | null
          assigned_to: string | null
          category_slug: string
          color: string | null
          condition: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          license_plate: string | null
          make: string | null
          model: string | null
          name: string
          notes: string | null
          photo_url: string | null
          serial_number: string | null
          status: string
          updated_at: string
          vin: string | null
          workspace_id: string
          year: number | null
        }
        Insert: {
          asset_tag?: string | null
          assigned_location?: string | null
          assigned_to?: string | null
          category_slug: string
          color?: string | null
          condition?: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name: string
          notes?: string | null
          photo_url?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
          vin?: string | null
          workspace_id: string
          year?: number | null
        }
        Update: {
          asset_tag?: string | null
          assigned_location?: string | null
          assigned_to?: string | null
          category_slug?: string
          color?: string | null
          condition?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          photo_url?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
          vin?: string | null
          workspace_id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "equipment_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      equipment_categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      equipment_checkouts: {
        Row: {
          asset_id: string
          checked_in_at: string | null
          checked_in_by: string | null
          checked_out_at: string
          checked_out_by: string
          condition_on_return: string | null
          created_at: string
          destination: string | null
          expected_return: string | null
          id: string
          is_active: boolean
          purpose: string | null
          return_notes: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          asset_id: string
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string
          checked_out_by: string
          condition_on_return?: string | null
          created_at?: string
          destination?: string | null
          expected_return?: string | null
          id?: string
          is_active?: boolean
          purpose?: string | null
          return_notes?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          asset_id?: string
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string
          checked_out_by?: string
          condition_on_return?: string | null
          created_at?: string
          destination?: string | null
          expected_return?: string | null
          id?: string
          is_active?: boolean
          purpose?: string | null
          return_notes?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_checkouts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "equipment_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_checkouts_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "equipment_checkouts_checked_out_by_fkey"
            columns: ["checked_out_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      equipment_documents: {
        Row: {
          asset_id: string
          created_at: string
          custom_type_label: string | null
          document_number: string | null
          document_type: string
          document_url: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuing_authority: string | null
          notes: string | null
          status: string
          updated_at: string
          uploaded_by: string
          workspace_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          custom_type_label?: string | null
          document_number?: string | null
          document_type: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          uploaded_by: string
          workspace_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          custom_type_label?: string | null
          document_number?: string | null
          document_type?: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "equipment_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      escalation_log: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          entity_id: string
          entity_title: string | null
          entity_type: string
          fired_at: string | null
          id: string
          notification_channels: string[] | null
          notified_user_ids: string[] | null
          resolved_at: string | null
          rule_id: string | null
          rule_name: string | null
          workspace_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          entity_id: string
          entity_title?: string | null
          entity_type: string
          fired_at?: string | null
          id?: string
          notification_channels?: string[] | null
          notified_user_ids?: string[] | null
          resolved_at?: string | null
          rule_id?: string | null
          rule_name?: string | null
          workspace_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          entity_id?: string
          entity_title?: string | null
          entity_type?: string
          fired_at?: string | null
          id?: string
          notification_channels?: string[] | null
          notified_user_ids?: string[] | null
          resolved_at?: string | null
          rule_id?: string | null
          rule_name?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalation_log_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "escalation_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "escalation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_rules: {
        Row: {
          created_at: string | null
          created_by: string | null
          delay_hours: number
          description: string | null
          id: string
          is_active: boolean | null
          message_template: string | null
          name: string
          notification_channel: string[] | null
          notify_roles: string[] | null
          notify_user_ids: string[] | null
          resolution_condition: Json | null
          trigger_condition: Json
          trigger_entity: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          delay_hours?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          message_template?: string | null
          name: string
          notification_channel?: string[] | null
          notify_roles?: string[] | null
          notify_user_ids?: string[] | null
          resolution_condition?: Json | null
          trigger_condition: Json
          trigger_entity: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          delay_hours?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          message_template?: string | null
          name?: string
          notification_channel?: string[] | null
          notify_roles?: string[] | null
          notify_user_ids?: string[] | null
          resolution_condition?: Json | null
          trigger_condition?: Json
          trigger_entity?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "escalation_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_document_categories: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          name: string
          requires_expiry: boolean
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          requires_expiry?: boolean
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          requires_expiry?: boolean
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_document_categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_documents: {
        Row: {
          category_id: string | null
          created_at: string
          employee_id: string
          expiry_date: string | null
          file_name: string | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          notes: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
          workspace_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          employee_id: string
          expiry_date?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          notes?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
          workspace_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          employee_id?: string
          expiry_date?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          notes?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "hr_document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      inventory_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          linked_project_id: string | null
          linked_work_order_id: string | null
          notes: string | null
          property_id: string
          quantity: number
          quantity_after: number | null
          reference_number: string | null
          total_cost: number | null
          transaction_date: string
          transaction_type: string
          unit_cost: number | null
          vendor: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          linked_project_id?: string | null
          linked_work_order_id?: string | null
          notes?: string | null
          property_id: string
          quantity: number
          quantity_after?: number | null
          reference_number?: string | null
          total_cost?: number | null
          transaction_date?: string
          transaction_type: string
          unit_cost?: number | null
          vendor?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          linked_project_id?: string | null
          linked_work_order_id?: string | null
          notes?: string | null
          property_id?: string
          quantity?: number
          quantity_after?: number | null
          reference_number?: string | null
          total_cost?: number | null
          transaction_date?: string
          transaction_type?: string
          unit_cost?: number | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "property_inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
          closure_photo_url: string | null
          corrective_action_required: boolean | null
          corrective_deadline: string | null
          corrective_status: string | null
          created_at: string
          created_by: string | null
          daily_inspection_item_id: string | null
          deadline: string | null
          defect_id: string | null
          description: string | null
          id: string
          linked_work_order_id: string | null
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
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          area?: Database["public"]["Enums"]["inspection_area"] | null
          assigned_to?: string | null
          closure_photo_url?: string | null
          corrective_action_required?: boolean | null
          corrective_deadline?: string | null
          corrective_status?: string | null
          created_at?: string
          created_by?: string | null
          daily_inspection_item_id?: string | null
          deadline?: string | null
          defect_id?: string | null
          description?: string | null
          id?: string
          linked_work_order_id?: string | null
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
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          area?: Database["public"]["Enums"]["inspection_area"] | null
          assigned_to?: string | null
          closure_photo_url?: string | null
          corrective_action_required?: boolean | null
          corrective_deadline?: string | null
          corrective_status?: string | null
          created_at?: string
          created_by?: string | null
          daily_inspection_item_id?: string | null
          deadline?: string | null
          defect_id?: string | null
          description?: string | null
          id?: string
          linked_work_order_id?: string | null
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
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
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
            foreignKeyName: "issues_linked_work_order_id_fkey"
            columns: ["linked_work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
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
      lien_waivers: {
        Row: {
          amount: number | null
          created_at: string | null
          file_url: string | null
          id: string
          notes: string | null
          pay_app_id: string
          received_date: string | null
          through_date: string | null
          waiver_type: string
          workspace_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          pay_app_id: string
          received_date?: string | null
          through_date?: string | null
          waiver_type: string
          workspace_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          pay_app_id?: string
          received_date?: string | null
          through_date?: string | null
          waiver_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lien_waivers_pay_app_id_fkey"
            columns: ["pay_app_id"]
            isOneToOne: false
            referencedRelation: "pay_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_waivers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lw_courses: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          difficulty: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean
          lw_course_id: string
          lw_url: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          lw_course_id: string
          lw_url?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          lw_course_id?: string
          lw_url?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lw_school_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          is_primary: boolean
          notes: string | null
          priority: number
          school_id: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          priority?: number
          school_id: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          priority?: number
          school_id?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lw_school_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "lw_school_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "lw_schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lw_school_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lw_schools: {
        Row: {
          api_key: string | null
          categories: string[]
          client_id: string | null
          client_secret: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          logo_url: string | null
          name: string
          school_url: string
          slug: string
          sso_secret: string | null
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          categories?: string[]
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          logo_url?: string | null
          name: string
          school_url: string
          slug: string
          sso_secret?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          categories?: string[]
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          logo_url?: string | null
          name?: string
          school_url?: string
          slug?: string
          sso_secret?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lw_sso_sessions: {
        Row: {
          expires_at: string
          id: string
          launched_at: string
          lw_course_id: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          expires_at: string
          id?: string
          launched_at?: string
          lw_course_id?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          expires_at?: string
          id?: string
          launched_at?: string
          lw_course_id?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lw_sso_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
      meeting_unlock_requests: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          reason: string | null
          requested_at: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          reason?: string | null
          requested_at?: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          reason?: string | null
          requested_at?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_unlock_requests_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "project_meetings"
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
          workspace_id: string
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
          workspace_id: string
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
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
          shared_with_owner: boolean | null
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
          shared_with_owner?: boolean | null
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
          shared_with_owner?: boolean | null
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
      pay_app_line_items: {
        Row: {
          certified_this_period: number | null
          created_at: string | null
          id: string
          materials_stored: number
          pay_app_id: string
          retainage_pct_override: number | null
          sov_line_item_id: string
          updated_at: string | null
          work_completed_previous: number
          work_completed_this_period: number
        }
        Insert: {
          certified_this_period?: number | null
          created_at?: string | null
          id?: string
          materials_stored?: number
          pay_app_id: string
          retainage_pct_override?: number | null
          sov_line_item_id: string
          updated_at?: string | null
          work_completed_previous?: number
          work_completed_this_period?: number
        }
        Update: {
          certified_this_period?: number | null
          created_at?: string | null
          id?: string
          materials_stored?: number
          pay_app_id?: string
          retainage_pct_override?: number | null
          sov_line_item_id?: string
          updated_at?: string | null
          work_completed_previous?: number
          work_completed_this_period?: number
        }
        Relationships: [
          {
            foreignKeyName: "pay_app_line_items_pay_app_id_fkey"
            columns: ["pay_app_id"]
            isOneToOne: false
            referencedRelation: "pay_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_app_line_items_sov_line_item_id_fkey"
            columns: ["sov_line_item_id"]
            isOneToOne: false
            referencedRelation: "sov_line_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_applications: {
        Row: {
          certified_by: string | null
          certified_date: string | null
          contract_number: string | null
          contractor_id: string | null
          contractor_name: string | null
          created_at: string | null
          id: string
          notes: string | null
          pay_app_number: number
          period_from: string
          period_to: string
          project_id: string
          status: string
          submitted_date: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          certified_by?: string | null
          certified_date?: string | null
          contract_number?: string | null
          contractor_id?: string | null
          contractor_name?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          pay_app_number: number
          period_from: string
          period_to: string
          project_id: string
          status?: string
          submitted_date?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          certified_by?: string | null
          certified_date?: string | null
          contract_number?: string | null
          contractor_id?: string | null
          contractor_name?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          pay_app_number?: number
          period_from?: string
          period_to?: string
          project_id?: string
          status?: string
          submitted_date?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_applications_certified_by_fkey"
            columns: ["certified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pay_applications_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_applications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      photo_gallery: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          project_id: string | null
          property_id: string | null
          source: string
          source_id: string | null
          source_label: string | null
          source_route: string | null
          taken_at: string
          updated_at: string | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          project_id?: string | null
          property_id?: string | null
          source?: string
          source_id?: string | null
          source_label?: string | null
          source_route?: string | null
          taken_at?: string
          updated_at?: string | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          project_id?: string | null
          property_id?: string | null
          source?: string
          source_id?: string | null
          source_label?: string | null
          source_route?: string | null
          taken_at?: string
          updated_at?: string | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_gallery_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_gallery_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          performed_by: string | null
          target_workspace_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          performed_by?: string | null
          target_workspace_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          performed_by?: string | null
          target_workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_audit_log_target_workspace_id_fkey"
            columns: ["target_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_access: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          invited_at: string
          invited_by: string
          is_active: boolean
          last_login_at: string | null
          login_count: number
          magic_link_expires_at: string | null
          magic_link_token: string | null
          name: string | null
          password_hash: string | null
          portal_id: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          invited_at?: string
          invited_by: string
          is_active?: boolean
          last_login_at?: string | null
          login_count?: number
          magic_link_expires_at?: string | null
          magic_link_token?: string | null
          name?: string | null
          password_hash?: string | null
          portal_id: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_at?: string
          invited_by?: string
          is_active?: boolean
          last_login_at?: string | null
          login_count?: number
          magic_link_expires_at?: string | null
          magic_link_token?: string | null
          name?: string | null
          password_hash?: string | null
          portal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_access_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "portal_access_portal_id_fkey"
            columns: ["portal_id"]
            isOneToOne: false
            referencedRelation: "client_portals"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_activity: {
        Row: {
          activity_type: string
          actor_email: string
          actor_name: string | null
          created_at: string
          description: string | null
          id: string
          module: string | null
          portal_id: string
          record_id: string | null
        }
        Insert: {
          activity_type: string
          actor_email: string
          actor_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          module?: string | null
          portal_id: string
          record_id?: string | null
        }
        Update: {
          activity_type?: string
          actor_email?: string
          actor_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          module?: string | null
          portal_id?: string
          record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_activity_portal_id_fkey"
            columns: ["portal_id"]
            isOneToOne: false
            referencedRelation: "client_portals"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_client_uploads: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          project_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          project_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          project_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_client_uploads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_document_requests: {
        Row: {
          created_at: string
          fulfilled_module: string | null
          fulfilled_record_id: string | null
          id: string
          message: string
          module: string | null
          portal_id: string
          request_type: string
          requested_by_email: string
          requested_by_name: string | null
          responded_at: string | null
          responded_by: string | null
          response_message: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fulfilled_module?: string | null
          fulfilled_record_id?: string | null
          id?: string
          message: string
          module?: string | null
          portal_id: string
          request_type?: string
          requested_by_email: string
          requested_by_name?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response_message?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fulfilled_module?: string | null
          fulfilled_record_id?: string | null
          id?: string
          message?: string
          module?: string | null
          portal_id?: string
          request_type?: string
          requested_by_email?: string
          requested_by_name?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response_message?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_document_requests_portal_id_fkey"
            columns: ["portal_id"]
            isOneToOne: false
            referencedRelation: "client_portals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_document_requests_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      portal_exclusions: {
        Row: {
          created_at: string
          excluded_by: string
          id: string
          module: string
          portal_id: string
          reason: string | null
          record_id: string
        }
        Insert: {
          created_at?: string
          excluded_by: string
          id?: string
          module: string
          portal_id: string
          reason?: string | null
          record_id: string
        }
        Update: {
          created_at?: string
          excluded_by?: string
          id?: string
          module?: string
          portal_id?: string
          reason?: string | null
          record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_exclusions_excluded_by_fkey"
            columns: ["excluded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "portal_exclusions_portal_id_fkey"
            columns: ["portal_id"]
            isOneToOne: false
            referencedRelation: "client_portals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auto_bcc_enabled: boolean | null
          avatar_url: string | null
          client_id: string | null
          created_at: string
          department: string | null
          email: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          full_name: string | null
          hire_date: string | null
          id: string
          is_platform_admin: boolean | null
          job_title: string | null
          last_active_at: string | null
          phone: string | null
          status: string | null
          updated_at: string
          user_id: string
          work_email: string | null
          workspace_id: string | null
        }
        Insert: {
          auto_bcc_enabled?: boolean | null
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string
          is_platform_admin?: boolean | null
          job_title?: string | null
          last_active_at?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          work_email?: string | null
          workspace_id?: string | null
        }
        Update: {
          auto_bcc_enabled?: boolean | null
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string
          is_platform_admin?: boolean | null
          job_title?: string | null
          last_active_at?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          work_email?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_action_items: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          linked_entity_id: string | null
          linked_entity_type: string | null
          priority: string
          project_id: string
          sort_order: number | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          priority?: string
          project_id: string
          sort_order?: number | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          priority?: string
          project_id?: string
          sort_order?: number | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_action_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_client_updates: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          photo_url: string | null
          project_id: string
          title: string
          update_type: string | null
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          photo_url?: string | null
          project_id: string
          title: string
          update_type?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          photo_url?: string | null
          project_id?: string
          title?: string
          update_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_client_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      project_meetings: {
        Row: {
          attendees: Json | null
          created_at: string
          created_by: string | null
          finalized_at: string | null
          finalized_by: string | null
          id: string
          location: string | null
          meeting_date: string
          meeting_time: string | null
          meeting_type: string
          polished_notes: string | null
          polished_notes_html: string | null
          project_id: string
          raw_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
          unlock_request_reason: string | null
          unlock_requested: boolean | null
          unlock_requested_at: string | null
          unlock_requested_by: string | null
          updated_at: string
        }
        Insert: {
          attendees?: Json | null
          created_at?: string
          created_by?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          location?: string | null
          meeting_date?: string
          meeting_time?: string | null
          meeting_type?: string
          polished_notes?: string | null
          polished_notes_html?: string | null
          project_id: string
          raw_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          unlock_request_reason?: string | null
          unlock_requested?: boolean | null
          unlock_requested_at?: string | null
          unlock_requested_by?: string | null
          updated_at?: string
        }
        Update: {
          attendees?: Json | null
          created_at?: string
          created_by?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          location?: string | null
          meeting_date?: string
          meeting_time?: string | null
          meeting_type?: string
          polished_notes?: string | null
          polished_notes_html?: string | null
          project_id?: string
          raw_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          unlock_request_reason?: string | null
          unlock_requested?: boolean | null
          unlock_requested_at?: string | null
          unlock_requested_by?: string | null
          updated_at?: string
        }
        Relationships: []
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
      project_progress_reports: {
        Row: {
          content_html: string | null
          created_at: string | null
          generated_by: string | null
          id: string
          project_id: string
          report_period_end: string
          report_period_start: string
          report_type: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content_html?: string | null
          created_at?: string | null
          generated_by?: string | null
          id?: string
          project_id: string
          report_period_end: string
          report_period_start: string
          report_type: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content_html?: string | null
          created_at?: string | null
          generated_by?: string | null
          id?: string
          project_id?: string
          report_period_end?: string
          report_period_start?: string
          report_type?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_progress_reports_project_id_fkey"
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
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          project_type: string
          property_id: string | null
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
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          project_type?: string
          property_id?: string | null
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
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          project_type?: string
          property_id?: string | null
          scope?: string | null
          spent?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_end_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
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
          client_id: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          daily_grounds_enabled: boolean | null
          id: string
          is_demo: boolean | null
          is_managed_property: boolean
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
          workspace_id: string | null
          year_built: number | null
          zip_code: string | null
        }
        Insert: {
          address: string
          city: string
          client_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          daily_grounds_enabled?: boolean | null
          id?: string
          is_demo?: boolean | null
          is_managed_property?: boolean
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
          workspace_id?: string | null
          year_built?: number | null
          zip_code?: string | null
        }
        Update: {
          address?: string
          city?: string
          client_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          daily_grounds_enabled?: boolean | null
          id?: string
          is_demo?: boolean | null
          is_managed_property?: boolean
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
          workspace_id?: string | null
          year_built?: number | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      property_inventory_items: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          current_quantity: number
          description: string | null
          id: string
          is_active: boolean
          minimum_quantity: number | null
          name: string
          photo_url: string | null
          preferred_vendor: string | null
          property_id: string
          sku: string | null
          storage_location: string | null
          unit_cost: number | null
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          current_quantity?: number
          description?: string | null
          id?: string
          is_active?: boolean
          minimum_quantity?: number | null
          name: string
          photo_url?: string | null
          preferred_vendor?: string | null
          property_id: string
          sku?: string | null
          storage_location?: string | null
          unit_cost?: number | null
          unit_of_measure?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          current_quantity?: number
          description?: string | null
          id?: string
          is_active?: boolean
          minimum_quantity?: number | null
          name?: string
          photo_url?: string | null
          preferred_vendor?: string | null
          property_id?: string
          sku?: string | null
          storage_location?: string | null
          unit_cost?: number | null
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_inventory_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_module_overrides: {
        Row: {
          enabled: boolean
          id: string
          module_key: string
          property_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          id?: string
          module_key: string
          property_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          id?: string
          module_key?: string
          property_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_module_overrides_property_id_fkey"
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
      property_utility_bills: {
        Row: {
          account_number: string | null
          amount: number
          amount_paid: number | null
          bill_date: string | null
          bill_period_end: string
          bill_period_start: string
          consumption_unit: string | null
          consumption_value: number | null
          created_at: string
          created_by: string | null
          document_name: string | null
          document_url: string | null
          due_date: string | null
          id: string
          is_estimated: boolean
          notes: string | null
          paid_at: string | null
          property_id: string
          provider_name: string | null
          status: string
          updated_at: string
          utility_type: string
        }
        Insert: {
          account_number?: string | null
          amount: number
          amount_paid?: number | null
          bill_date?: string | null
          bill_period_end: string
          bill_period_start: string
          consumption_unit?: string | null
          consumption_value?: number | null
          created_at?: string
          created_by?: string | null
          document_name?: string | null
          document_url?: string | null
          due_date?: string | null
          id?: string
          is_estimated?: boolean
          notes?: string | null
          paid_at?: string | null
          property_id: string
          provider_name?: string | null
          status?: string
          updated_at?: string
          utility_type: string
        }
        Update: {
          account_number?: string | null
          amount?: number
          amount_paid?: number | null
          bill_date?: string | null
          bill_period_end?: string
          bill_period_start?: string
          consumption_unit?: string | null
          consumption_value?: number | null
          created_at?: string
          created_by?: string | null
          document_name?: string | null
          document_url?: string | null
          due_date?: string | null
          id?: string
          is_estimated?: boolean
          notes?: string | null
          paid_at?: string | null
          property_id?: string
          provider_name?: string | null
          status?: string
          updated_at?: string
          utility_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_utility_bills_property_id_fkey"
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      regulatory_action_items: {
        Row: {
          acceptance_criteria: string | null
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          completion_notes: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          item_number: string | null
          linked_issue_id: string | null
          linked_permit_id: string | null
          linked_project_id: string | null
          notes: string | null
          regulatory_document_id: string | null
          required_action: string | null
          sort_order: number | null
          status: string
          title: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          acceptance_criteria?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          item_number?: string | null
          linked_issue_id?: string | null
          linked_permit_id?: string | null
          linked_project_id?: string | null
          notes?: string | null
          regulatory_document_id?: string | null
          required_action?: string | null
          sort_order?: number | null
          status?: string
          title: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          acceptance_criteria?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          item_number?: string | null
          linked_issue_id?: string | null
          linked_permit_id?: string | null
          linked_project_id?: string | null
          notes?: string | null
          regulatory_document_id?: string | null
          required_action?: string | null
          sort_order?: number | null
          status?: string
          title?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_action_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "regulatory_action_items_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "regulatory_action_items_regulatory_document_id_fkey"
            columns: ["regulatory_document_id"]
            isOneToOne: false
            referencedRelation: "regulatory_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulatory_action_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_documents: {
        Row: {
          agency: string
          agency_contact_email: string | null
          agency_contact_name: string | null
          agency_contact_phone: string | null
          assigned_to: string | null
          case_number: string | null
          created_at: string | null
          created_by: string | null
          daily_fine: number | null
          description: string | null
          doc_number: string | null
          doc_type: string
          document_url: string | null
          effective_date: string | null
          final_compliance_date: string | null
          id: string
          issued_date: string | null
          notes: string | null
          penalty_amount: number | null
          property_id: string | null
          status: string
          title: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          agency?: string
          agency_contact_email?: string | null
          agency_contact_name?: string | null
          agency_contact_phone?: string | null
          assigned_to?: string | null
          case_number?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_fine?: number | null
          description?: string | null
          doc_number?: string | null
          doc_type?: string
          document_url?: string | null
          effective_date?: string | null
          final_compliance_date?: string | null
          id?: string
          issued_date?: string | null
          notes?: string | null
          penalty_amount?: number | null
          property_id?: string | null
          status?: string
          title: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          agency?: string
          agency_contact_email?: string | null
          agency_contact_name?: string | null
          agency_contact_phone?: string | null
          assigned_to?: string | null
          case_number?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_fine?: number | null
          description?: string | null
          doc_number?: string | null
          doc_type?: string
          document_url?: string | null
          effective_date?: string | null
          final_compliance_date?: string | null
          id?: string
          issued_date?: string | null
          notes?: string | null
          penalty_amount?: number | null
          property_id?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_documents_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "regulatory_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "regulatory_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulatory_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_evidence: {
        Row: {
          action_item_id: string | null
          description: string | null
          evidence_type: string | null
          file_name: string | null
          file_url: string | null
          id: string
          title: string
          uploaded_at: string | null
          uploaded_by: string | null
          workspace_id: string | null
        }
        Insert: {
          action_item_id?: string | null
          description?: string | null
          evidence_type?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          title: string
          uploaded_at?: string | null
          uploaded_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          action_item_id?: string | null
          description?: string | null
          evidence_type?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          title?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_evidence_action_item_id_fkey"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "regulatory_action_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulatory_evidence_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "regulatory_evidence_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      report_delivery_log: {
        Row: {
          error_message: string | null
          id: string
          saved_report_id: string | null
          schedule_id: string | null
          sent_at: string | null
          sent_to: string[]
          status: string
          workspace_id: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          saved_report_id?: string | null
          schedule_id?: string | null
          sent_at?: string | null
          sent_to: string[]
          status?: string
          workspace_id: string
        }
        Update: {
          error_message?: string | null
          id?: string
          saved_report_id?: string | null
          schedule_id?: string | null
          sent_at?: string | null
          sent_to?: string[]
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_delivery_log_saved_report_id_fkey"
            columns: ["saved_report_id"]
            isOneToOne: false
            referencedRelation: "saved_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_delivery_log_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "report_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      report_emails: {
        Row: {
          archived_at: string | null
          archived_by_user_ids: string[] | null
          attachment_filename: string | null
          attachment_size: number | null
          bcc_recipients: string[] | null
          body_html: string | null
          body_text: string | null
          cc_recipients: string[] | null
          daily_inspection_id: string | null
          deleted_at: string | null
          deleted_by_user_ids: string[] | null
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
          archived_by_user_ids?: string[] | null
          attachment_filename?: string | null
          attachment_size?: number | null
          bcc_recipients?: string[] | null
          body_html?: string | null
          body_text?: string | null
          cc_recipients?: string[] | null
          daily_inspection_id?: string | null
          deleted_at?: string | null
          deleted_by_user_ids?: string[] | null
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
          archived_by_user_ids?: string[] | null
          attachment_filename?: string | null
          attachment_size?: number | null
          bcc_recipients?: string[] | null
          body_html?: string | null
          body_text?: string | null
          cc_recipients?: string[] | null
          daily_inspection_id?: string | null
          deleted_at?: string | null
          deleted_by_user_ids?: string[] | null
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
      report_schedules: {
        Row: {
          created_at: string | null
          day_of_month: number | null
          day_of_week: number | null
          frequency: string
          id: string
          is_active: boolean | null
          last_sent_at: string | null
          next_send_at: string | null
          recipient_emails: string[]
          saved_report_id: string
          subject_template: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          frequency: string
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          next_send_at?: string | null
          recipient_emails?: string[]
          saved_report_id: string
          subject_template?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          next_send_at?: string | null
          recipient_emails?: string[]
          saved_report_id?: string
          subject_template?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_schedules_saved_report_id_fkey"
            columns: ["saved_report_id"]
            isOneToOne: false
            referencedRelation: "saved_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_schedules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_actions: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completion_notes: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          risk_id: string | null
          status: string
          title: string
          workspace_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          risk_id?: string | null
          status?: string
          title: string
          workspace_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          risk_id?: string | null
          status?: string
          title?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_actions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "risk_actions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "risk_actions_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_actions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      risks: {
        Row: {
          category: string
          closed_at: string | null
          closed_by: string | null
          closure_notes: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          impact: number | null
          mitigation_strategy: string | null
          probability: number | null
          property_id: string | null
          review_date: string | null
          risk_number: number
          risk_owner: string | null
          source_id: string | null
          source_type: string | null
          status: string
          title: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          category?: string
          closed_at?: string | null
          closed_by?: string | null
          closure_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          impact?: number | null
          mitigation_strategy?: string | null
          probability?: number | null
          property_id?: string | null
          review_date?: string | null
          risk_number?: number
          risk_owner?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          title: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          category?: string
          closed_at?: string | null
          closed_by?: string | null
          closure_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          impact?: number | null
          mitigation_strategy?: string | null
          probability?: number | null
          property_id?: string | null
          review_date?: string | null
          risk_number?: number
          risk_owner?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risks_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "risks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "risks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_risk_owner_fkey"
            columns: ["risk_owner"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "risks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      safety_incident_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          incident_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          incident_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          incident_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_incident_attachments_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "safety_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_incident_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      safety_incidents: {
        Row: {
          body_part_affected: string | null
          case_number: string | null
          corrective_actions: string | null
          corrective_actions_completed: boolean | null
          corrective_actions_due: string | null
          created_at: string
          days_away_from_work: number | null
          days_employed: number | null
          days_on_job_transfer: number | null
          days_on_restriction: number | null
          facility_name: string | null
          id: string
          incident_classification: string | null
          incident_date: string
          incident_time: string | null
          injured_employee_department: string | null
          injured_employee_id: string | null
          injured_employee_job_title: string | null
          injured_employee_name: string
          injury_icon: string | null
          injury_involved: boolean | null
          injury_type: string | null
          is_osha_recordable: boolean | null
          is_privacy_case: boolean | null
          location_description: string
          medical_treatment: string | null
          photo_urls: string[] | null
          physician_name: string | null
          reported_at: string
          reported_by: string
          resulted_in_days_away: boolean | null
          resulted_in_death: boolean | null
          resulted_in_other_recordable: boolean | null
          resulted_in_transfer: boolean | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_id: string | null
          source_type: string | null
          status: string
          updated_at: string
          what_happened: string
          witness_contact: string | null
          witness_name: string | null
          workspace_id: string
        }
        Insert: {
          body_part_affected?: string | null
          case_number?: string | null
          corrective_actions?: string | null
          corrective_actions_completed?: boolean | null
          corrective_actions_due?: string | null
          created_at?: string
          days_away_from_work?: number | null
          days_employed?: number | null
          days_on_job_transfer?: number | null
          days_on_restriction?: number | null
          facility_name?: string | null
          id?: string
          incident_classification?: string | null
          incident_date: string
          incident_time?: string | null
          injured_employee_department?: string | null
          injured_employee_id?: string | null
          injured_employee_job_title?: string | null
          injured_employee_name: string
          injury_icon?: string | null
          injury_involved?: boolean | null
          injury_type?: string | null
          is_osha_recordable?: boolean | null
          is_privacy_case?: boolean | null
          location_description: string
          medical_treatment?: string | null
          photo_urls?: string[] | null
          physician_name?: string | null
          reported_at?: string
          reported_by: string
          resulted_in_days_away?: boolean | null
          resulted_in_death?: boolean | null
          resulted_in_other_recordable?: boolean | null
          resulted_in_transfer?: boolean | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
          what_happened: string
          witness_contact?: string | null
          witness_name?: string | null
          workspace_id: string
        }
        Update: {
          body_part_affected?: string | null
          case_number?: string | null
          corrective_actions?: string | null
          corrective_actions_completed?: boolean | null
          corrective_actions_due?: string | null
          created_at?: string
          days_away_from_work?: number | null
          days_employed?: number | null
          days_on_job_transfer?: number | null
          days_on_restriction?: number | null
          facility_name?: string | null
          id?: string
          incident_classification?: string | null
          incident_date?: string
          incident_time?: string | null
          injured_employee_department?: string | null
          injured_employee_id?: string | null
          injured_employee_job_title?: string | null
          injured_employee_name?: string
          injury_icon?: string | null
          injury_involved?: boolean | null
          injury_type?: string | null
          is_osha_recordable?: boolean | null
          is_privacy_case?: boolean | null
          location_description?: string
          medical_treatment?: string | null
          photo_urls?: string[] | null
          physician_name?: string | null
          reported_at?: string
          reported_by?: string
          resulted_in_days_away?: boolean | null
          resulted_in_death?: boolean | null
          resulted_in_other_recordable?: boolean | null
          resulted_in_transfer?: boolean | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
          what_happened?: string
          witness_contact?: string | null
          witness_name?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_incidents_injured_employee_id_fkey"
            columns: ["injured_employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "safety_incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "safety_incidents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          config: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_template: boolean | null
          name: string
          report_type: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          name: string
          report_type: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          name?: string
          report_type?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sov_line_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          item_number: string
          project_id: string
          retainage_pct: number
          scheduled_value: number
          sort_order: number
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          item_number: string
          project_id: string
          retainage_pct?: number
          scheduled_value?: number
          sort_order?: number
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          item_number?: string
          project_id?: string
          retainage_pct?: number
          scheduled_value?: number
          sort_order?: number
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sov_line_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sov_line_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      training_assignments: {
        Row: {
          assigned_by: string
          assigned_to: string | null
          assigned_to_role: string | null
          created_at: string
          due_date: string | null
          id: string
          is_mandatory: boolean
          lw_course_id: string
          next_due_date: string | null
          notes: string | null
          recurrence: string | null
          recurrence_interval_days: number | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_by: string
          assigned_to?: string | null
          assigned_to_role?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          is_mandatory?: boolean
          lw_course_id: string
          next_due_date?: string | null
          notes?: string | null
          recurrence?: string | null
          recurrence_interval_days?: number | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_by?: string
          assigned_to?: string | null
          assigned_to_role?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          is_mandatory?: boolean
          lw_course_id?: string
          next_due_date?: string | null
          notes?: string | null
          recurrence?: string | null
          recurrence_interval_days?: number | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "training_assignments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      training_completions: {
        Row: {
          certificate_id: string | null
          certificate_url: string | null
          completed_at: string
          created_at: string
          expires_at: string | null
          id: string
          lw_completion_id: string | null
          lw_course_id: string
          passed: boolean | null
          score: number | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          certificate_id?: string | null
          certificate_url?: string | null
          completed_at: string
          created_at?: string
          expires_at?: string | null
          id?: string
          lw_completion_id?: string | null
          lw_course_id: string
          passed?: boolean | null
          score?: number | null
          user_id: string
          workspace_id: string
        }
        Update: {
          certificate_id?: string | null
          certificate_url?: string | null
          completed_at?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          lw_completion_id?: string | null
          lw_course_id?: string
          passed?: boolean | null
          score?: number | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
          workspace_id: string | null
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
          workspace_id?: string | null
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
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_courses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      training_share_links: {
        Row: {
          access_count: number
          accessed_at: string | null
          completion_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          revoked: boolean
          token: string
        }
        Insert: {
          access_count?: number
          accessed_at?: string | null
          completion_id: string
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          revoked?: boolean
          token: string
        }
        Update: {
          access_count?: number
          accessed_at?: string | null
          completion_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          revoked?: boolean
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_share_links_completion_id_fkey"
            columns: ["completion_id"]
            isOneToOne: false
            referencedRelation: "training_completions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_share_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
          client_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          property_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
          workspace_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          client_id?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          property_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token: string
          workspace_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          client_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          property_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
          workspace_id: string | null
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
          workspace_id?: string | null
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
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_agent_config_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_agent_config_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
          closure_photos: string[] | null
          completed_at: string | null
          contractor_id: string | null
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
          requires_verification: boolean | null
          source_issue_id: string | null
          source_regulatory_action_id: string | null
          status: Database["public"]["Enums"]["work_order_status"]
          submitted_at: string | null
          title: string
          unit_id: string | null
          updated_at: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
          work_order_number: number
        }
        Insert: {
          actual_cost?: number | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closure_photos?: string[] | null
          completed_at?: string | null
          contractor_id?: string | null
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
          requires_verification?: boolean | null
          source_issue_id?: string | null
          source_regulatory_action_id?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          submitted_at?: string | null
          title: string
          unit_id?: string | null
          updated_at?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
          work_order_number?: number
        }
        Update: {
          actual_cost?: number | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closure_photos?: string[] | null
          completed_at?: string | null
          contractor_id?: string | null
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
          requires_verification?: boolean | null
          source_issue_id?: string | null
          source_regulatory_action_id?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          submitted_at?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
          work_order_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "work_orders_source_issue_id_fkey"
            columns: ["source_issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
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
      workspace_equipment_config: {
        Row: {
          active_category_slugs: string[]
          asset_limit: number
          created_at: string
          custom_category_icon: string | null
          custom_category_name: string | null
          id: string
          setup_completed: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active_category_slugs?: string[]
          asset_limit?: number
          created_at?: string
          custom_category_icon?: string | null
          custom_category_name?: string | null
          id?: string
          setup_completed?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active_category_slugs?: string[]
          asset_limit?: number
          created_at?: string
          custom_category_icon?: string | null
          custom_category_name?: string | null
          id?: string
          setup_completed?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_modules: {
        Row: {
          client_portal_enabled: boolean
          created_at: string
          credential_wallet_enabled: boolean
          email_inbox_enabled: boolean
          equipment_tracker_enabled: boolean
          id: string
          occupancy_enabled: boolean
          platform_client_portal: boolean
          platform_credential_wallet: boolean
          platform_email_inbox: boolean
          platform_equipment_tracker: boolean
          platform_occupancy: boolean
          platform_qr_scanning: boolean
          platform_safety_module: boolean
          platform_training_hub: boolean
          qr_scanning_enabled: boolean
          safety_module_enabled: boolean
          training_hub_enabled: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          client_portal_enabled?: boolean
          created_at?: string
          credential_wallet_enabled?: boolean
          email_inbox_enabled?: boolean
          equipment_tracker_enabled?: boolean
          id?: string
          occupancy_enabled?: boolean
          platform_client_portal?: boolean
          platform_credential_wallet?: boolean
          platform_email_inbox?: boolean
          platform_equipment_tracker?: boolean
          platform_occupancy?: boolean
          platform_qr_scanning?: boolean
          platform_safety_module?: boolean
          platform_training_hub?: boolean
          qr_scanning_enabled?: boolean
          safety_module_enabled?: boolean
          training_hub_enabled?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          client_portal_enabled?: boolean
          created_at?: string
          credential_wallet_enabled?: boolean
          email_inbox_enabled?: boolean
          equipment_tracker_enabled?: boolean
          id?: string
          occupancy_enabled?: boolean
          platform_client_portal?: boolean
          platform_credential_wallet?: boolean
          platform_email_inbox?: boolean
          platform_equipment_tracker?: boolean
          platform_occupancy?: boolean
          platform_qr_scanning?: boolean
          platform_safety_module?: boolean
          platform_training_hub?: boolean
          qr_scanning_enabled?: boolean
          safety_module_enabled?: boolean
          training_hub_enabled?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          billing_contact_email: string | null
          billing_cycle: string | null
          client_company: string | null
          client_contact_name: string | null
          created_at: string
          id: string
          monthly_fee: number | null
          name: string
          next_billing_date: string | null
          notes: string | null
          owner_user_id: string | null
          plan: string
          seat_limit: number | null
          seats_used: number | null
          slug: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_contact_email?: string | null
          billing_cycle?: string | null
          client_company?: string | null
          client_contact_name?: string | null
          created_at?: string
          id?: string
          monthly_fee?: number | null
          name: string
          next_billing_date?: string | null
          notes?: string | null
          owner_user_id?: string | null
          plan?: string
          seat_limit?: number | null
          seats_used?: number | null
          slug?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_contact_email?: string | null
          billing_cycle?: string | null
          client_company?: string | null
          client_contact_name?: string | null
          created_at?: string
          id?: string
          monthly_fee?: number | null
          name?: string
          next_billing_date?: string | null
          notes?: string | null
          owner_user_id?: string | null
          plan?: string
          seat_limit?: number | null
          seats_used?: number | null
          slug?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
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
      can_access_property: {
        Args: { _property_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_demo_property: { Args: { _user_id: string }; Returns: boolean }
      get_all_workspaces_for_platform_admin: { Args: never; Returns: Json[] }
      get_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          accepted_at: string | null
          client_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          property_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
          workspace_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "user_invitations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_workspace_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_project_team_member: {
        Args: { _project_id: string; _user_id: string }
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
