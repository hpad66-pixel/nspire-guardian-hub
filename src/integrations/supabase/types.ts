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
      api_clients: {
        Row: {
          client_id: string
          client_secret_hash: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          rate_limit: number
          revoked_at: string | null
          scopes: string[]
          tenant_id: string
        }
        Insert: {
          client_id: string
          client_secret_hash: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          rate_limit?: number
          revoked_at?: string | null
          scopes?: string[]
          tenant_id: string
        }
        Update: {
          client_id?: string
          client_secret_hash?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rate_limit?: number
          revoked_at?: string | null
          scopes?: string[]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      api_tokens: {
        Row: {
          access_token_hash: string
          api_client_id: string
          created_at: string
          expires_at: string
          id: string
          scopes: string[]
          tenant_id: string
        }
        Insert: {
          access_token_hash: string
          api_client_id: string
          created_at?: string
          expires_at: string
          id?: string
          scopes?: string[]
          tenant_id: string
        }
        Update: {
          access_token_hash?: string
          api_client_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          scopes?: string[]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_tokens_api_client_id_fkey"
            columns: ["api_client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_daily: {
        Row: {
          api_client_id: string | null
          date: string
          error_count: number
          id: string
          req_count: number
          tenant_id: string
        }
        Insert: {
          api_client_id?: string | null
          date: string
          error_count?: number
          id?: string
          req_count?: number
          tenant_id: string
        }
        Update: {
          api_client_id?: string | null
          date?: string
          error_count?: number
          id?: string
          req_count?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_daily_api_client_id_fkey"
            columns: ["api_client_id"]
            isOneToOne: false
            referencedRelation: "api_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_daily_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_type_definitions: {
        Row: {
          created_at: string | null
          id: string
          is_system: boolean | null
          key: string
          label: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          key: string
          label: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          key?: string
          label?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          asset_type: string
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
          asset_type: string
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
          asset_type?: string
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
      billing_invoices: {
        Row: {
          amount_due_cents: number
          amount_paid_cents: number
          created_at: string
          currency: string
          hosted_invoice_url: string | null
          id: string
          pdf_url: string | null
          period_end: string | null
          period_start: string | null
          status: string
          stripe_customer_id: string | null
          stripe_invoice_id: string | null
          tenant_id: string
        }
        Insert: {
          amount_due_cents?: number
          amount_paid_cents?: number
          created_at?: string
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          status: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          tenant_id: string
        }
        Update: {
          amount_due_cents?: number
          amount_paid_cents?: number
          created_at?: string
          currency?: string
          hosted_invoice_url?: string | null
          id?: string
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          cost_code_id: string
          created_at: string
          id: string
          original_budget: number
          project_budget_id: string
          tenant_id: string
        }
        Insert: {
          cost_code_id: string
          created_at?: string
          id?: string
          original_budget?: number
          project_budget_id: string
          tenant_id: string
        }
        Update: {
          cost_code_id?: string
          created_at?: string
          id?: string
          original_budget?: number
          project_budget_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_project_budget_id_fkey"
            columns: ["project_budget_id"]
            isOneToOne: false
            referencedRelation: "project_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_modification_lines: {
        Row: {
          amount: number
          budget_modification_id: string
          from_cost_code_id: string
          id: string
          to_cost_code_id: string
        }
        Insert: {
          amount: number
          budget_modification_id: string
          from_cost_code_id: string
          id?: string
          to_cost_code_id: string
        }
        Update: {
          amount?: number
          budget_modification_id?: string
          from_cost_code_id?: string
          id?: string
          to_cost_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_modification_lines_budget_modification_id_fkey"
            columns: ["budget_modification_id"]
            isOneToOne: false
            referencedRelation: "budget_modifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_modification_lines_from_cost_code_id_fkey"
            columns: ["from_cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_modification_lines_to_cost_code_id_fkey"
            columns: ["to_cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_modifications: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          mod_no: number
          project_budget_id: string
          status: string
          tenant_id: string
          title: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mod_no: number
          project_budget_id: string
          status?: string
          tenant_id: string
          title: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mod_no?: number
          project_budget_id?: string
          status?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_modifications_project_budget_id_fkey"
            columns: ["project_budget_id"]
            isOneToOne: false
            referencedRelation: "project_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_modifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_snapshots: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          payload: Json
          period_end: string
          project_budget_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          payload: Json
          period_end: string
          project_budget_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          payload?: Json
          period_end?: string
          project_budget_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_snapshots_project_budget_id_fkey"
            columns: ["project_budget_id"]
            isOneToOne: false
            referencedRelation: "project_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      change_event_lines: {
        Row: {
          change_event_id: string
          cost_code_id: string
          created_at: string
          description: string
          estimated_cost: number
          id: string
          pco_id: string | null
          status_bucket: string
          tenant_id: string
        }
        Insert: {
          change_event_id: string
          cost_code_id: string
          created_at?: string
          description: string
          estimated_cost?: number
          id?: string
          pco_id?: string | null
          status_bucket?: string
          tenant_id: string
        }
        Update: {
          change_event_id?: string
          cost_code_id?: string
          created_at?: string
          description?: string
          estimated_cost?: number
          id?: string
          pco_id?: string | null
          status_bucket?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_event_lines_change_event_id_fkey"
            columns: ["change_event_id"]
            isOneToOne: false
            referencedRelation: "change_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_event_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_event_lines_pco_id_fkey"
            columns: ["pco_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_event_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      change_events: {
        Row: {
          created_at: string
          description: string | null
          event_date: string
          event_no: number
          id: string
          originator_id: string | null
          project_id: string
          reason_code: string | null
          rfi_id: string | null
          rom_value: number | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date?: string
          event_no: number
          id?: string
          originator_id?: string | null
          project_id: string
          reason_code?: string | null
          rfi_id?: string | null
          rom_value?: number | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string
          event_no?: number
          id?: string
          originator_id?: string | null
          project_id?: string
          reason_code?: string | null
          rfi_id?: string | null
          rom_value?: number | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_events_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "project_rfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_line_items: {
        Row: {
          basis: string | null
          change_order_id: string
          created_at: string
          description: string
          extended_value: number
          id: string
          line_no: number
          qty: number
          tenant_id: string
          unit: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          basis?: string | null
          change_order_id: string
          created_at?: string
          description: string
          extended_value?: number
          id?: string
          line_no?: number
          qty?: number
          tenant_id: string
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          basis?: string | null
          change_order_id?: string
          created_at?: string
          description?: string
          extended_value?: number
          id?: string
          line_no?: number
          qty?: number
          tenant_id?: string
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_order_line_items_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_line_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_lines: {
        Row: {
          amount: number
          change_order_id: string
          cost_code_id: string
          description: string
          id: string
          tenant_id: string
        }
        Insert: {
          amount: number
          change_order_id: string
          cost_code_id: string
          description: string
          id?: string
          tenant_id: string
        }
        Update: {
          amount?: number
          change_order_id?: string
          cost_code_id?: string
          description?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_order_lines_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          accepted_signature_path: string | null
          accepted_signed_at: string | null
          accepted_signed_name: string | null
          amendment_history: Json
          amount: number
          approved_at: string | null
          approved_by: string | null
          client_comments: string | null
          co_no: number | null
          co_no_history: Json
          co_type: string | null
          commitment_id: string | null
          created_at: string
          days_impact: number
          description: string | null
          docx_path: string | null
          executed_date: string | null
          id: string
          locked: boolean
          parent_pco_id: string | null
          pdf_path: string | null
          peer_co_id: string | null
          prime_contract_id: string | null
          project_id: string
          reason_code: string | null
          requested_by: string | null
          sent_to_client_at: string | null
          sign_token: string | null
          signed_hardcopy_at: string | null
          signed_hardcopy_by: string | null
          signed_hardcopy_note: string | null
          signed_hardcopy_path: string | null
          spec: Json | null
          status: string
          submitted_signature_path: string | null
          submitted_signed_at: string | null
          submitted_signed_by: string | null
          tenant_id: string | null
          title: string
          updated_at: string
          voided_at: string | null
          voided_by: string | null
          workflow_instance_id: string | null
        }
        Insert: {
          accepted_signature_path?: string | null
          accepted_signed_at?: string | null
          accepted_signed_name?: string | null
          amendment_history?: Json
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          client_comments?: string | null
          co_no?: number | null
          co_no_history?: Json
          co_type?: string | null
          commitment_id?: string | null
          created_at?: string
          days_impact?: number
          description?: string | null
          docx_path?: string | null
          executed_date?: string | null
          id?: string
          locked?: boolean
          parent_pco_id?: string | null
          pdf_path?: string | null
          peer_co_id?: string | null
          prime_contract_id?: string | null
          project_id: string
          reason_code?: string | null
          requested_by?: string | null
          sent_to_client_at?: string | null
          sign_token?: string | null
          signed_hardcopy_at?: string | null
          signed_hardcopy_by?: string | null
          signed_hardcopy_note?: string | null
          signed_hardcopy_path?: string | null
          spec?: Json | null
          status?: string
          submitted_signature_path?: string | null
          submitted_signed_at?: string | null
          submitted_signed_by?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
          voided_at?: string | null
          voided_by?: string | null
          workflow_instance_id?: string | null
        }
        Update: {
          accepted_signature_path?: string | null
          accepted_signed_at?: string | null
          accepted_signed_name?: string | null
          amendment_history?: Json
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          client_comments?: string | null
          co_no?: number | null
          co_no_history?: Json
          co_type?: string | null
          commitment_id?: string | null
          created_at?: string
          days_impact?: number
          description?: string | null
          docx_path?: string | null
          executed_date?: string | null
          id?: string
          locked?: boolean
          parent_pco_id?: string | null
          pdf_path?: string | null
          peer_co_id?: string | null
          prime_contract_id?: string | null
          project_id?: string
          reason_code?: string | null
          requested_by?: string | null
          sent_to_client_at?: string | null
          sign_token?: string | null
          signed_hardcopy_at?: string | null
          signed_hardcopy_by?: string | null
          signed_hardcopy_note?: string | null
          signed_hardcopy_path?: string | null
          spec?: Json | null
          status?: string
          submitted_signature_path?: string | null
          submitted_signed_at?: string | null
          submitted_signed_by?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
          voided_at?: string | null
          voided_by?: string | null
          workflow_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitment_totals"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "change_orders_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_parent_pco_id_fkey"
            columns: ["parent_pco_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_peer_co_id_fkey"
            columns: ["peer_co_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_prime_contract_id_fkey"
            columns: ["prime_contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_totals"
            referencedColumns: ["prime_contract_id"]
          },
          {
            foreignKeyName: "change_orders_prime_contract_id_fkey"
            columns: ["prime_contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "my_court"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
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
      client_updates: {
        Row: {
          accomplishments: Json
          action_items: Json
          created_at: string
          created_by: string | null
          decisions: Json
          health: string
          id: string
          next_steps: Json
          period_label: string | null
          project_id: string
          published_at: string | null
          risks: Json
          statement_pdf_path: string | null
          status: string
          summary: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          accomplishments?: Json
          action_items?: Json
          created_at?: string
          created_by?: string | null
          decisions?: Json
          health?: string
          id?: string
          next_steps?: Json
          period_label?: string | null
          project_id: string
          published_at?: string | null
          risks?: Json
          statement_pdf_path?: string | null
          status?: string
          summary?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          accomplishments?: Json
          action_items?: Json
          created_at?: string
          created_by?: string | null
          decisions?: Json
          health?: string
          id?: string
          next_steps?: Json
          period_label?: string | null
          project_id?: string
          published_at?: string | null
          risks?: Json
          statement_pdf_path?: string | null
          status?: string
          summary?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_updates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
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
      commitment_invoice_lines: {
        Row: {
          id: string
          invoice_id: string
          materials_stored: number
          pct_complete: number | null
          sov_line_id: string
          work_this_period: number
        }
        Insert: {
          id?: string
          invoice_id: string
          materials_stored?: number
          pct_complete?: number | null
          sov_line_id: string
          work_this_period?: number
        }
        Update: {
          id?: string
          invoice_id?: string
          materials_stored?: number
          pct_complete?: number | null
          sov_line_id?: string
          work_this_period?: number
        }
        Relationships: [
          {
            foreignKeyName: "commitment_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "commitment_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_invoice_balances"
            referencedColumns: ["commitment_invoice_id"]
          },
          {
            foreignKeyName: "commitment_invoice_lines_sov_line_id_fkey"
            columns: ["sov_line_id"]
            isOneToOne: false
            referencedRelation: "commitment_sov_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      commitment_invoices: {
        Row: {
          approved_amount: number | null
          artifact_id: string | null
          commitment_id: string
          created_at: string
          created_by: string | null
          id: string
          invoice_no: string
          period_end: string
          rejection_comment: string | null
          retainage_held: number | null
          status: string
          submitted_amount: number | null
          tenant_id: string
          updated_at: string
          vendor_submission_id: string | null
          workflow_instance_id: string | null
        }
        Insert: {
          approved_amount?: number | null
          artifact_id?: string | null
          commitment_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_no: string
          period_end: string
          rejection_comment?: string | null
          retainage_held?: number | null
          status?: string
          submitted_amount?: number | null
          tenant_id: string
          updated_at?: string
          vendor_submission_id?: string | null
          workflow_instance_id?: string | null
        }
        Update: {
          approved_amount?: number | null
          artifact_id?: string | null
          commitment_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_no?: string
          period_end?: string
          rejection_comment?: string | null
          retainage_held?: number | null
          status?: string
          submitted_amount?: number | null
          tenant_id?: string
          updated_at?: string
          vendor_submission_id?: string | null
          workflow_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commitment_invoices_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "project_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_invoices_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitment_totals"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "commitment_invoices_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_invoices_vendor_submission_id_fkey"
            columns: ["vendor_submission_id"]
            isOneToOne: false
            referencedRelation: "vendor_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_invoices_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "my_court"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_invoices_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      commitment_payment_allocations: {
        Row: {
          amount: number
          change_order_id: string | null
          commitment_sov_line_id: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: string
          note: string | null
          payment_id: string
          tenant_id: string
        }
        Insert: {
          amount: number
          change_order_id?: string | null
          commitment_sov_line_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          note?: string | null
          payment_id: string
          tenant_id: string
        }
        Update: {
          amount?: number
          change_order_id?: string | null
          commitment_sov_line_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          note?: string | null
          payment_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitment_payment_allocations_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_payment_allocations_commitment_sov_line_id_fkey"
            columns: ["commitment_sov_line_id"]
            isOneToOne: false
            referencedRelation: "commitment_sov_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "commitment_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_payment_allocations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      commitment_payments: {
        Row: {
          amount: number
          artifact_id: string | null
          commitment_id: string
          commitment_invoice_id: string
          created_at: string
          created_by: string | null
          id: string
          method: string | null
          notes: string | null
          paid_date: string
          reference: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          artifact_id?: string | null
          commitment_id: string
          commitment_invoice_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          paid_date: string
          reference?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          artifact_id?: string | null
          commitment_id?: string
          commitment_invoice_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          paid_date?: string
          reference?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitment_payments_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "project_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_payments_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitment_totals"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "commitment_payments_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_payments_commitment_invoice_id_fkey"
            columns: ["commitment_invoice_id"]
            isOneToOne: false
            referencedRelation: "commitment_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_payments_commitment_invoice_id_fkey"
            columns: ["commitment_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_invoice_balances"
            referencedColumns: ["commitment_invoice_id"]
          },
          {
            foreignKeyName: "commitment_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      commitment_sov_lines: {
        Row: {
          commitment_id: string
          cost_code_id: string
          description: string
          id: string
          line_no: number
          scheduled_value: number
          tenant_id: string
        }
        Insert: {
          commitment_id: string
          cost_code_id: string
          description: string
          id?: string
          line_no: number
          scheduled_value: number
          tenant_id: string
        }
        Update: {
          commitment_id?: string
          cost_code_id?: string
          description?: string
          id?: string
          line_no?: number
          scheduled_value?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitment_sov_lines_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitment_totals"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "commitment_sov_lines_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_sov_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_sov_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      commitments: {
        Row: {
          commitment_no: string
          commitment_type: string
          created_at: string
          created_by: string | null
          executed_date: string | null
          id: string
          original_value: number
          project_id: string
          retainage_pct: number
          status: string
          tenant_id: string
          title: string
          updated_at: string
          vendor_org_id: string | null
          workflow_instance_id: string | null
        }
        Insert: {
          commitment_no: string
          commitment_type: string
          created_at?: string
          created_by?: string | null
          executed_date?: string | null
          id?: string
          original_value?: number
          project_id: string
          retainage_pct?: number
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
          vendor_org_id?: string | null
          workflow_instance_id?: string | null
        }
        Update: {
          commitment_no?: string
          commitment_type?: string
          created_at?: string
          created_by?: string | null
          executed_date?: string | null
          id?: string
          original_value?: number
          project_id?: string
          retainage_pct?: number
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          vendor_org_id?: string | null
          workflow_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commitments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_vendor_org_id_fkey"
            columns: ["vendor_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "my_court"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
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
      cost_code_libraries: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          source: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          source: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          source?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_code_libraries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_codes: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          level: number
          library_id: string
          parent_id: string | null
          sort_order: number | null
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          level: number
          library_id: string
          parent_id?: string | null
          sort_order?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          level?: number
          library_id?: string
          parent_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_codes_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "cost_code_libraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_codes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_types: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_types_tenant_id_fkey"
            columns: ["tenant_id"]
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
      daily_accidents: {
        Row: {
          brief: string | null
          daily_report_id: string
          id: string
          incident_id: string | null
          tenant_id: string
        }
        Insert: {
          brief?: string | null
          daily_report_id: string
          id?: string
          incident_id?: string | null
          tenant_id: string
        }
        Update: {
          brief?: string | null
          daily_report_id?: string
          id?: string
          incident_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_accidents_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_accidents_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_accidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_calls: {
        Row: {
          at_time: string | null
          caller: string | null
          daily_report_id: string
          id: string
          notes: string | null
          subject: string | null
          tenant_id: string
        }
        Insert: {
          at_time?: string | null
          caller?: string | null
          daily_report_id: string
          id?: string
          notes?: string | null
          subject?: string | null
          tenant_id: string
        }
        Update: {
          at_time?: string | null
          caller?: string | null
          daily_report_id?: string
          id?: string
          notes?: string | null
          subject?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_calls_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_calls_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_deliveries: {
        Row: {
          daily_report_id: string
          description: string | null
          from_vendor: string | null
          id: string
          received_by: string | null
          tenant_id: string
          time_received: string | null
        }
        Insert: {
          daily_report_id: string
          description?: string | null
          from_vendor?: string | null
          id?: string
          received_by?: string | null
          tenant_id: string
          time_received?: string | null
        }
        Update: {
          daily_report_id?: string
          description?: string | null
          from_vendor?: string | null
          id?: string
          received_by?: string | null
          tenant_id?: string
          time_received?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_deliveries_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_dumpster: {
        Row: {
          daily_report_id: string
          hauled_at: string | null
          id: string
          material: string | null
          size: string | null
          tenant_id: string
          vendor: string | null
        }
        Insert: {
          daily_report_id: string
          hauled_at?: string | null
          id?: string
          material?: string | null
          size?: string | null
          tenant_id: string
          vendor?: string | null
        }
        Update: {
          daily_report_id?: string
          hauled_at?: string | null
          id?: string
          material?: string | null
          size?: string | null
          tenant_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_dumpster_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_dumpster_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_equipment: {
        Row: {
          daily_report_id: string
          equipment_name: string | null
          hours_used: number | null
          id: string
          organization_id: string | null
          tenant_id: string
        }
        Insert: {
          daily_report_id: string
          equipment_name?: string | null
          hours_used?: number | null
          id?: string
          organization_id?: string | null
          tenant_id: string
        }
        Update: {
          daily_report_id?: string
          equipment_name?: string | null
          hours_used?: number | null
          id?: string
          organization_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_equipment_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_equipment_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_equipment_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
          status: string | null
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
          status?: string | null
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
          status?: string | null
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
      daily_manpower: {
        Row: {
          daily_report_id: string
          hours: number
          id: string
          notes: string | null
          organization_id: string | null
          tenant_id: string
          trade: string | null
          workers: number
        }
        Insert: {
          daily_report_id: string
          hours?: number
          id?: string
          notes?: string | null
          organization_id?: string | null
          tenant_id: string
          trade?: string | null
          workers?: number
        }
        Update: {
          daily_report_id?: string
          hours?: number
          id?: string
          notes?: string | null
          organization_id?: string | null
          tenant_id?: string
          trade?: string | null
          workers?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_manpower_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_manpower_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_manpower_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_notes: {
        Row: {
          body: string | null
          daily_report_id: string
          id: string
          tenant_id: string
        }
        Insert: {
          body?: string | null
          daily_report_id: string
          id?: string
          tenant_id: string
        }
        Update: {
          body?: string | null
          daily_report_id?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_notes_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_productivity: {
        Row: {
          actual_hours: number | null
          actual_qty: number | null
          cost_code_id: string | null
          daily_report_id: string
          id: string
          tenant_id: string
        }
        Insert: {
          actual_hours?: number | null
          actual_qty?: number | null
          cost_code_id?: string | null
          daily_report_id: string
          id?: string
          tenant_id: string
        }
        Update: {
          actual_hours?: number | null
          actual_qty?: number | null
          cost_code_id?: string | null
          daily_report_id?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_productivity_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_productivity_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_productivity_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_quantities: {
        Row: {
          cost_code_id: string | null
          daily_report_id: string
          id: string
          qty: number | null
          tenant_id: string
          uom: string | null
        }
        Insert: {
          cost_code_id?: string | null
          daily_report_id: string
          id?: string
          qty?: number | null
          tenant_id: string
          uom?: string | null
        }
        Update: {
          cost_code_id?: string | null
          daily_report_id?: string
          id?: string
          qty?: number | null
          tenant_id?: string
          uom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_quantities_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_quantities_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_quantities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_action_items: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          acknowledged_by_name: string | null
          body: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          daily_report_id: string
          id: string
          project_id: string
          status: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acknowledged_by_name?: string | null
          body: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          daily_report_id: string
          id?: string
          project_id: string
          status?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acknowledged_by_name?: string | null
          body?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          daily_report_id?: string
          id?: string
          project_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_action_items_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_action_items_project_id_fkey"
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
          delays: string | null
          equipment_used: string[] | null
          id: string
          issues_encountered: string | null
          materials_received: string | null
          pdf_path: string | null
          photos: string[] | null
          photos_meta: Json
          procore_data: Json | null
          project_id: string
          report_date: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_by_name: string | null
          safety_notes: string | null
          signature: string | null
          signature_date: string | null
          subcontractors: Json | null
          submitted_at: string | null
          submitted_by: string | null
          submitted_by_name: string | null
          superintendent_id: string | null
          visitor_log: Json | null
          weather: string | null
          work_performed: string | null
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
          pdf_path?: string | null
          photos?: string[] | null
          photos_meta?: Json
          procore_data?: Json | null
          project_id: string
          report_date?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          safety_notes?: string | null
          signature?: string | null
          signature_date?: string | null
          subcontractors?: Json | null
          submitted_at?: string | null
          submitted_by?: string | null
          submitted_by_name?: string | null
          superintendent_id?: string | null
          visitor_log?: Json | null
          weather?: string | null
          work_performed?: string | null
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
          pdf_path?: string | null
          photos?: string[] | null
          photos_meta?: Json
          procore_data?: Json | null
          project_id?: string
          report_date?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          safety_notes?: string | null
          signature?: string | null
          signature_date?: string | null
          subcontractors?: Json | null
          submitted_at?: string | null
          submitted_by?: string | null
          submitted_by_name?: string | null
          superintendent_id?: string | null
          visitor_log?: Json | null
          weather?: string | null
          work_performed?: string | null
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
      daily_safety_violations: {
        Row: {
          corrective_action: string | null
          daily_report_id: string
          description: string | null
          id: string
          severity: string | null
          tenant_id: string
        }
        Insert: {
          corrective_action?: string | null
          daily_report_id: string
          description?: string | null
          id?: string
          severity?: string | null
          tenant_id: string
        }
        Update: {
          corrective_action?: string | null
          daily_report_id?: string
          description?: string | null
          id?: string
          severity?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_safety_violations_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_safety_violations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_scheduled_work: {
        Row: {
          daily_report_id: string
          description: string | null
          id: string
          organization_id: string | null
          planned: boolean | null
          tenant_id: string
        }
        Insert: {
          daily_report_id: string
          description?: string | null
          id?: string
          organization_id?: string | null
          planned?: boolean | null
          tenant_id: string
        }
        Update: {
          daily_report_id?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          planned?: boolean | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_scheduled_work_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_scheduled_work_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_scheduled_work_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_visitors: {
        Row: {
          arrived_at: string | null
          company: string | null
          daily_report_id: string
          id: string
          left_at: string | null
          name: string | null
          purpose: string | null
          tenant_id: string
        }
        Insert: {
          arrived_at?: string | null
          company?: string | null
          daily_report_id: string
          id?: string
          left_at?: string | null
          name?: string | null
          purpose?: string | null
          tenant_id: string
        }
        Update: {
          arrived_at?: string | null
          company?: string | null
          daily_report_id?: string
          id?: string
          left_at?: string | null
          name?: string | null
          purpose?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_visitors_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_visitors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_weather: {
        Row: {
          conditions: string | null
          daily_report_id: string
          fetched_at: string
          high_temp_f: number | null
          low_temp_f: number | null
          precipitation_in: number | null
          source: string
          tenant_id: string
          wind_mph: number | null
        }
        Insert: {
          conditions?: string | null
          daily_report_id: string
          fetched_at?: string
          high_temp_f?: number | null
          low_temp_f?: number | null
          precipitation_in?: number | null
          source?: string
          tenant_id: string
          wind_mph?: number | null
        }
        Update: {
          conditions?: string | null
          daily_report_id?: string
          fetched_at?: string
          high_temp_f?: number | null
          low_temp_f?: number | null
          precipitation_in?: number | null
          source?: string
          tenant_id?: string
          wind_mph?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_weather_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: true
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_weather_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_layouts: {
        Row: {
          created_at: string
          hidden_widgets: string[]
          id: string
          layout: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hidden_widgets?: string[]
          id?: string
          layout?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hidden_widgets?: string[]
          id?: string
          layout?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dashboards: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string | null
          role_preset: string | null
          tenant_id: string
          tiles: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id?: string | null
          role_preset?: string | null
          tenant_id: string
          tiles?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string | null
          role_preset?: string | null
          tenant_id?: string
          tiles?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      direct_cost_lines: {
        Row: {
          amount: number
          cost_code_id: string
          direct_cost_id: string
          hours: number | null
          id: string
          rate: number | null
          tenant_id: string
        }
        Insert: {
          amount: number
          cost_code_id: string
          direct_cost_id: string
          hours?: number | null
          id?: string
          rate?: number | null
          tenant_id: string
        }
        Update: {
          amount?: number
          cost_code_id?: string
          direct_cost_id?: string
          hours?: number | null
          id?: string
          rate?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_cost_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_cost_lines_direct_cost_id_fkey"
            columns: ["direct_cost_id"]
            isOneToOne: false
            referencedRelation: "direct_costs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_cost_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_costs: {
        Row: {
          amount: number
          attachment_doc_id: string | null
          cost_date: string
          cost_type: string
          created_at: string
          created_by: string | null
          description: string | null
          employee_id: string | null
          id: string
          project_id: string
          reference_no: string | null
          status: string
          tenant_id: string
          updated_at: string
          vendor_org_id: string | null
          workflow_instance_id: string | null
        }
        Insert: {
          amount: number
          attachment_doc_id?: string | null
          cost_date: string
          cost_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id?: string | null
          id?: string
          project_id: string
          reference_no?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          vendor_org_id?: string | null
          workflow_instance_id?: string | null
        }
        Update: {
          amount?: number
          attachment_doc_id?: string | null
          cost_date?: string
          cost_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id?: string | null
          id?: string
          project_id?: string
          reference_no?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          vendor_org_id?: string | null
          workflow_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_costs_attachment_doc_id_fkey"
            columns: ["attachment_doc_id"]
            isOneToOne: false
            referencedRelation: "pl_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_costs_vendor_org_id_fkey"
            columns: ["vendor_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_costs_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "my_court"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_costs_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_list_members: {
        Row: {
          contact_id: string | null
          created_at: string
          email_override: string | null
          id: string
          list_id: string
          role_label: string | null
          user_id: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          email_override?: string | null
          id?: string
          list_id: string
          role_label?: string | null
          user_id?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          email_override?: string | null
          id?: string
          list_id?: string
          role_label?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_list_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "distribution_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_lists: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          project_id: string | null
          scope: string
          tenant_id: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          project_id?: string | null
          scope: string
          tenant_id: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          project_id?: string | null
          scope?: string
          tenant_id?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_lists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_lists_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          created_at: string | null
          id: string
          is_private: boolean
          name: string
          parent_id: string | null
          permissions: Json
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_private?: boolean
          name: string
          parent_id?: string | null
          permissions?: Json
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_private?: boolean
          name?: string
          parent_id?: string | null
          permissions?: Json
          updated_at?: string | null
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
      drawing_markups: {
        Row: {
          color: string | null
          created_at: string
          geometry: Json
          id: string
          is_published: boolean
          linked_record_id: string | null
          linked_record_type: string | null
          revision_id: string
          tenant_id: string
          text: string | null
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          geometry: Json
          id?: string
          is_published?: boolean
          linked_record_id?: string | null
          linked_record_type?: string | null
          revision_id: string
          tenant_id: string
          text?: string | null
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          geometry?: Json
          id?: string
          is_published?: boolean
          linked_record_id?: string | null
          linked_record_type?: string | null
          revision_id?: string
          tenant_id?: string
          text?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drawing_markups_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "drawing_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_markups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      drawing_revisions: {
        Row: {
          drawing_id: string
          id: string
          is_current: boolean
          pdf_path: string
          rev_number: string
          supersedes_id: string | null
          tenant_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          drawing_id: string
          id?: string
          is_current?: boolean
          pdf_path: string
          rev_number: string
          supersedes_id?: string | null
          tenant_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          drawing_id?: string
          id?: string
          is_current?: boolean
          pdf_path?: string
          rev_number?: string
          supersedes_id?: string | null
          tenant_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drawing_revisions_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_revisions_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "drawing_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_revisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      drawing_sets: {
        Row: {
          created_at: string
          discipline: string | null
          id: string
          name: string
          project_id: string
          set_date: string | null
          status: string
          tenant_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          discipline?: string | null
          id?: string
          name: string
          project_id: string
          set_date?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          discipline?: string | null
          id?: string
          name?: string
          project_id?: string
          set_date?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drawing_sets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_sets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      drawings: {
        Row: {
          created_at: string
          current_revision_id: string | null
          discipline: string | null
          id: string
          project_id: string
          set_id: string | null
          sheet_number: string
          tenant_id: string
          thumbnail_url: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          current_revision_id?: string | null
          discipline?: string | null
          id?: string
          project_id: string
          set_id?: string | null
          sheet_number: string
          tenant_id: string
          thumbnail_url?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          current_revision_id?: string | null
          discipline?: string | null
          id?: string
          project_id?: string
          set_id?: string | null
          sheet_number?: string
          tenant_id?: string
          thumbnail_url?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drawings_current_revision_fk"
            columns: ["current_revision_id"]
            isOneToOne: false
            referencedRelation: "drawing_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "drawing_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_tenant_id_fkey"
            columns: ["tenant_id"]
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
      feature_registry: {
        Row: {
          analytics_event: string | null
          created_at: string
          depends_on: string[]
          description: string | null
          display_name: string
          id: string
          kind: string
          last_verified_at: string | null
          lifecycle: string
          module: string
          opa_locka_in_use: boolean
          owner: string | null
          path: string | null
          rationale: string | null
          slug: string
          updated_at: string
          verified_by: string | null
          visibility: string
        }
        Insert: {
          analytics_event?: string | null
          created_at?: string
          depends_on?: string[]
          description?: string | null
          display_name: string
          id?: string
          kind: string
          last_verified_at?: string | null
          lifecycle: string
          module: string
          opa_locka_in_use?: boolean
          owner?: string | null
          path?: string | null
          rationale?: string | null
          slug: string
          updated_at?: string
          verified_by?: string | null
          visibility?: string
        }
        Update: {
          analytics_event?: string | null
          created_at?: string
          depends_on?: string[]
          description?: string | null
          display_name?: string
          id?: string
          kind?: string
          last_verified_at?: string | null
          lifecycle?: string
          module?: string
          opa_locka_in_use?: boolean
          owner?: string | null
          path?: string | null
          rationale?: string | null
          slug?: string
          updated_at?: string
          verified_by?: string | null
          visibility?: string
        }
        Relationships: []
      }
      feature_registry_events: {
        Row: {
          actor: string | null
          changed_field: string
          created_at: string
          feature_id: string
          id: string
          new_value: string | null
          old_value: string | null
          reason: string | null
          slug: string
        }
        Insert: {
          actor?: string | null
          changed_field: string
          created_at?: string
          feature_id: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          slug: string
        }
        Update: {
          actor?: string | null
          changed_field?: string
          created_at?: string
          feature_id?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_registry_events_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "feature_registry"
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
      incident_corrective_actions: {
        Row: {
          assignee_id: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          incident_id: string
          status: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          incident_id: string
          status?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          incident_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_corrective_actions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_persons: {
        Row: {
          body_part: string | null
          contact_id: string | null
          id: string
          incident_id: string
          injury_description: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          body_part?: string | null
          contact_id?: string | null
          id?: string
          incident_id: string
          injury_description?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          body_part?: string | null
          contact_id?: string | null
          id?: string
          incident_id?: string
          injury_description?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_persons_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_persons_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_root_causes: {
        Row: {
          category: string | null
          description: string | null
          id: string
          incident_id: string
        }
        Insert: {
          category?: string | null
          description?: string | null
          id?: string
          incident_id: string
        }
        Update: {
          category?: string | null
          description?: string | null
          id?: string
          incident_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_root_causes_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          created_at: string
          description: string | null
          id: string
          incident_type: string | null
          location_id: string | null
          occurred_at: string | null
          osha_case_number: string | null
          osha_days_away: number
          osha_recordable: boolean
          osha_restricted_days: number
          project_id: string | null
          reporter_id: string | null
          severity: string | null
          status: string
          tenant_id: string | null
          title: string | null
          updated_at: string
          witness_user_ids: string[]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          incident_type?: string | null
          location_id?: string | null
          occurred_at?: string | null
          osha_case_number?: string | null
          osha_days_away?: number
          osha_recordable?: boolean
          osha_restricted_days?: number
          project_id?: string | null
          reporter_id?: string | null
          severity?: string | null
          status?: string
          tenant_id?: string | null
          title?: string | null
          updated_at?: string
          witness_user_ids?: string[]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          incident_type?: string | null
          location_id?: string | null
          occurred_at?: string | null
          osha_case_number?: string | null
          osha_days_away?: number
          osha_recordable?: boolean
          osha_restricted_days?: number
          project_id?: string | null
          reporter_id?: string | null
          severity?: string | null
          status?: string
          tenant_id?: string | null
          title?: string | null
          updated_at?: string
          witness_user_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "incidents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "project_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
          created_at: string
          created_by: string | null
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
      lien_releases: {
        Row: {
          amount: number | null
          artifact_id: string | null
          claimant_email: string | null
          claimant_name: string | null
          claimant_signature_path: string | null
          claimant_signed_at: string | null
          claimant_signed_name: string | null
          commitment_invoice_id: string | null
          created_at: string
          created_by: string | null
          direction: string
          executed_at: string | null
          executed_by: string | null
          id: string
          locked: boolean
          notarized_path: string | null
          notarized_uploaded_at: string | null
          pay_app_id: string | null
          pdf_path: string | null
          project_id: string
          release_type: string
          sent_at: string | null
          sign_token: string | null
          spec: Json | null
          status: string
          tenant_id: string
          through_date: string | null
          title: string | null
          updated_at: string
          waiver_no: string | null
          workflow_instance_id: string | null
        }
        Insert: {
          amount?: number | null
          artifact_id?: string | null
          claimant_email?: string | null
          claimant_name?: string | null
          claimant_signature_path?: string | null
          claimant_signed_at?: string | null
          claimant_signed_name?: string | null
          commitment_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          direction: string
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          locked?: boolean
          notarized_path?: string | null
          notarized_uploaded_at?: string | null
          pay_app_id?: string | null
          pdf_path?: string | null
          project_id: string
          release_type: string
          sent_at?: string | null
          sign_token?: string | null
          spec?: Json | null
          status?: string
          tenant_id: string
          through_date?: string | null
          title?: string | null
          updated_at?: string
          waiver_no?: string | null
          workflow_instance_id?: string | null
        }
        Update: {
          amount?: number | null
          artifact_id?: string | null
          claimant_email?: string | null
          claimant_name?: string | null
          claimant_signature_path?: string | null
          claimant_signed_at?: string | null
          claimant_signed_name?: string | null
          commitment_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          direction?: string
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          locked?: boolean
          notarized_path?: string | null
          notarized_uploaded_at?: string | null
          pay_app_id?: string | null
          pdf_path?: string | null
          project_id?: string
          release_type?: string
          sent_at?: string | null
          sign_token?: string | null
          spec?: Json | null
          status?: string
          tenant_id?: string
          through_date?: string | null
          title?: string | null
          updated_at?: string
          waiver_no?: string | null
          workflow_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lien_releases_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "project_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_releases_commitment_invoice_id_fkey"
            columns: ["commitment_invoice_id"]
            isOneToOne: false
            referencedRelation: "commitment_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_releases_commitment_invoice_id_fkey"
            columns: ["commitment_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_invoice_balances"
            referencedColumns: ["commitment_invoice_id"]
          },
          {
            foreignKeyName: "lien_releases_pay_app_id_fkey"
            columns: ["pay_app_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_pay_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_releases_pay_app_id_fkey"
            columns: ["pay_app_id"]
            isOneToOne: false
            referencedRelation: "v_pay_app_balances"
            referencedColumns: ["pay_app_id"]
          },
          {
            foreignKeyName: "lien_releases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_releases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_releases_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "my_court"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lien_releases_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
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
      meeting_action_items: {
        Row: {
          agenda_item_id: string
          assignee_id: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          status: string
        }
        Insert: {
          agenda_item_id: string
          assignee_id?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          status?: string
        }
        Update: {
          agenda_item_id?: string
          assignee_id?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_action_items_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "meeting_agenda_items"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_agenda_items: {
        Row: {
          category: string | null
          decision: string | null
          discussion: string | null
          id: string
          is_carryover: boolean
          meeting_id: string
          presenter_id: string | null
          resolved_at: string | null
          sort_order: number
          title: string
        }
        Insert: {
          category?: string | null
          decision?: string | null
          discussion?: string | null
          id?: string
          is_carryover?: boolean
          meeting_id: string
          presenter_id?: string | null
          resolved_at?: string | null
          sort_order: number
          title: string
        }
        Update: {
          category?: string | null
          decision?: string | null
          discussion?: string | null
          id?: string
          is_carryover?: boolean
          meeting_id?: string
          presenter_id?: string | null
          resolved_at?: string | null
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_agenda_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "project_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendees: {
        Row: {
          attended: boolean
          contact_id: string | null
          id: string
          meeting_id: string
          sign_in_at: string | null
          user_id: string | null
        }
        Insert: {
          attended?: boolean
          contact_id?: string | null
          id?: string
          meeting_id: string
          sign_in_at?: string | null
          user_id?: string | null
        }
        Update: {
          attended?: boolean
          contact_id?: string | null
          id?: string
          meeting_id?: string
          sign_in_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "project_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_templates: {
        Row: {
          created_at: string
          default_agenda: Json
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          default_agenda?: Json
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          default_agenda?: Json
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      organization_trades: {
        Row: {
          cost_code_id: string
          organization_id: string
        }
        Insert: {
          cost_code_id: string
          organization_id: string
        }
        Update: {
          cost_code_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_trades_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_trades_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          bonding_capacity_cents: number | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          dbe_mbe_flags: Json
          email: string | null
          id: string
          insurance_expiry: string | null
          is_active: boolean
          kind: string
          legal_name: string | null
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          tax_id: string | null
          tenant_id: string
          updated_at: string
          vendor_number: string | null
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          bonding_capacity_cents?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          dbe_mbe_flags?: Json
          email?: string | null
          id?: string
          insurance_expiry?: string | null
          is_active?: boolean
          kind?: string
          legal_name?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tax_id?: string | null
          tenant_id: string
          updated_at?: string
          vendor_number?: string | null
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          bonding_capacity_cents?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          dbe_mbe_flags?: Json
          email?: string | null
          id?: string
          insurance_expiry?: string | null
          is_active?: boolean
          kind?: string
          legal_name?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tax_id?: string | null
          tenant_id?: string
          updated_at?: string
          vendor_number?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_audit_log: {
        Row: {
          action: string
          id: string
          ip: unknown
          meta: Json
          object_id: string
          object_type: string
          occurred_at: string
          tenant_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          id?: string
          ip?: unknown
          meta?: Json
          object_id: string
          object_type: string
          occurred_at?: string
          tenant_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          id?: string
          ip?: unknown
          meta?: Json
          object_id?: string
          object_type?: string
          occurred_at?: string
          tenant_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_app_line_progress: {
        Row: {
          created_at: string
          id: string
          pay_app_id: string
          pct_complete: number
          qty_this_period: number
          qty_to_date: number
          retainage: number
          sov_line_item_id: string
          tenant_id: string
          updated_at: string
          value_this_period: number
          value_to_date: number
        }
        Insert: {
          created_at?: string
          id?: string
          pay_app_id: string
          pct_complete?: number
          qty_this_period?: number
          qty_to_date?: number
          retainage?: number
          sov_line_item_id: string
          tenant_id: string
          updated_at?: string
          value_this_period?: number
          value_to_date?: number
        }
        Update: {
          created_at?: string
          id?: string
          pay_app_id?: string
          pct_complete?: number
          qty_this_period?: number
          qty_to_date?: number
          retainage?: number
          sov_line_item_id?: string
          tenant_id?: string
          updated_at?: string
          value_this_period?: number
          value_to_date?: number
        }
        Relationships: [
          {
            foreignKeyName: "pay_app_line_progress_pay_app_id_fkey"
            columns: ["pay_app_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_pay_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_app_line_progress_pay_app_id_fkey"
            columns: ["pay_app_id"]
            isOneToOne: false
            referencedRelation: "v_pay_app_balances"
            referencedColumns: ["pay_app_id"]
          },
          {
            foreignKeyName: "pay_app_line_progress_sov_line_item_id_fkey"
            columns: ["sov_line_item_id"]
            isOneToOne: false
            referencedRelation: "sov_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_app_line_progress_sov_line_item_id_fkey"
            columns: ["sov_line_item_id"]
            isOneToOne: false
            referencedRelation: "v_sov_current_progress"
            referencedColumns: ["sov_line_item_id"]
          },
          {
            foreignKeyName: "pay_app_line_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_template_grants: {
        Row: {
          action: string
          created_at: string
          id: string
          level: string
          module: string
          template_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          level: string
          module: string
          template_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          level?: string
          module?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_template_grants_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "permission_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_templates: {
        Row: {
          cloned_from: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cloned_from?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cloned_from?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_templates_cloned_from_fkey"
            columns: ["cloned_from"]
            isOneToOne: false
            referencedRelation: "permission_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_templates_tenant_id_fkey"
            columns: ["tenant_id"]
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
      photo_album_items: {
        Row: {
          album_id: string
          photo_id: string
          sort_order: number
        }
        Insert: {
          album_id: string
          photo_id: string
          sort_order?: number
        }
        Update: {
          album_id?: string
          photo_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "photo_album_items_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "photo_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_album_items_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_albums: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          project_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          project_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_albums_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_albums_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      photo_links: {
        Row: {
          linked_record_id: string
          linked_record_type: string
          photo_id: string
        }
        Insert: {
          linked_record_id: string
          linked_record_type: string
          photo_id: string
        }
        Update: {
          linked_record_id?: string
          linked_record_type?: string
          photo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_links_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_tags: {
        Row: {
          photo_id: string
          tag: string
        }
        Insert: {
          photo_id: string
          tag: string
        }
        Update: {
          photo_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_tags_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          caption: string | null
          created_at: string
          exif: Json
          id: string
          is_private: boolean
          lat: number | null
          lng: number | null
          project_id: string
          storage_path: string
          taken_at: string | null
          tenant_id: string
          thumb_path: string | null
          uploader_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          exif?: Json
          id?: string
          is_private?: boolean
          lat?: number | null
          lng?: number | null
          project_id: string
          storage_path: string
          taken_at?: string | null
          tenant_id: string
          thumb_path?: string | null
          uploader_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          exif?: Json
          id?: string
          is_private?: boolean
          lat?: number | null
          lng?: number | null
          project_id?: string
          storage_path?: string
          taken_at?: string | null
          tenant_id?: string
          thumb_path?: string | null
          uploader_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pl_document_versions: {
        Row: {
          document_id: string
          id: string
          note: string | null
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          document_id: string
          id?: string
          note?: string | null
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
          version: number
        }
        Update: {
          document_id?: string
          id?: string
          note?: string | null
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "pl_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "pl_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      pl_documents: {
        Row: {
          checked_out_by: string | null
          created_at: string
          created_by: string | null
          current_version: number
          folder_id: string | null
          id: string
          mime: string | null
          name: string
          project_id: string | null
          size_bytes: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          checked_out_by?: string | null
          created_at?: string
          created_by?: string | null
          current_version?: number
          folder_id?: string | null
          id?: string
          mime?: string | null
          name: string
          project_id?: string | null
          size_bytes?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          checked_out_by?: string | null
          created_at?: string
          created_by?: string | null
          current_version?: number
          folder_id?: string | null
          id?: string
          mime?: string | null
          name?: string
          project_id?: string | null
          size_bytes?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pl_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pl_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pl_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_interval: string
          code: string
          created_at: string
          currency: string
          features: Json
          id: string
          is_public: boolean
          name: string
          price_cents: number
          seat_limit: number | null
          sort_order: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          code: string
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          is_public?: boolean
          name: string
          price_cents?: number
          seat_limit?: number | null
          sort_order?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          code?: string
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          is_public?: boolean
          name?: string
          price_cents?: number
          seat_limit?: number | null
          sort_order?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: []
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
      portal_invitations: {
        Row: {
          accepted_at: string | null
          email: string
          expires_at: string
          id: string
          invited_at: string
          invited_by: string | null
          organization_id: string | null
          portal_kind: string
          role: string
          tenant_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          organization_id?: string | null
          portal_kind: string
          role?: string
          tenant_id: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          organization_id?: string | null
          portal_kind?: string
          role?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_memberships: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          organization_id: string | null
          portal_kind: string
          role: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id?: string | null
          portal_kind: string
          role?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id?: string | null
          portal_kind?: string
          role?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prime_contract_pay_app_lines: {
        Row: {
          id: string
          materials_stored: number
          pay_app_id: string
          pct_complete: number | null
          sov_line_id: string
          work_this_period: number
        }
        Insert: {
          id?: string
          materials_stored?: number
          pay_app_id: string
          pct_complete?: number | null
          sov_line_id: string
          work_this_period?: number
        }
        Update: {
          id?: string
          materials_stored?: number
          pay_app_id?: string
          pct_complete?: number | null
          sov_line_id?: string
          work_this_period?: number
        }
        Relationships: [
          {
            foreignKeyName: "prime_contract_pay_app_lines_pay_app_id_fkey"
            columns: ["pay_app_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_pay_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_pay_app_lines_pay_app_id_fkey"
            columns: ["pay_app_id"]
            isOneToOne: false
            referencedRelation: "v_pay_app_balances"
            referencedColumns: ["pay_app_id"]
          },
          {
            foreignKeyName: "prime_contract_pay_app_lines_sov_line_id_fkey"
            columns: ["sov_line_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_sov_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      prime_contract_pay_apps: {
        Row: {
          approved_amount: number | null
          approved_date: string | null
          artifact_id: string | null
          created_at: string
          created_by: string | null
          id: string
          invoice_no: string | null
          pay_app_data: Json | null
          pay_app_no: number
          pdf_path: string | null
          period_end: string
          prime_contract_id: string
          retainage_held: number | null
          sent_for_review_at: string | null
          sent_for_review_to: string | null
          signature_data: string | null
          signed_at: string | null
          signed_name: string | null
          status: string
          submitted_amount: number | null
          tenant_id: string
          updated_at: string
          workflow_instance_id: string | null
        }
        Insert: {
          approved_amount?: number | null
          approved_date?: string | null
          artifact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_no?: string | null
          pay_app_data?: Json | null
          pay_app_no: number
          pdf_path?: string | null
          period_end: string
          prime_contract_id: string
          retainage_held?: number | null
          sent_for_review_at?: string | null
          sent_for_review_to?: string | null
          signature_data?: string | null
          signed_at?: string | null
          signed_name?: string | null
          status?: string
          submitted_amount?: number | null
          tenant_id: string
          updated_at?: string
          workflow_instance_id?: string | null
        }
        Update: {
          approved_amount?: number | null
          approved_date?: string | null
          artifact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_no?: string | null
          pay_app_data?: Json | null
          pay_app_no?: number
          pdf_path?: string | null
          period_end?: string
          prime_contract_id?: string
          retainage_held?: number | null
          sent_for_review_at?: string | null
          sent_for_review_to?: string | null
          signature_data?: string | null
          signed_at?: string | null
          signed_name?: string | null
          status?: string
          submitted_amount?: number | null
          tenant_id?: string
          updated_at?: string
          workflow_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prime_contract_pay_apps_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "project_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_pay_apps_prime_contract_id_fkey"
            columns: ["prime_contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_totals"
            referencedColumns: ["prime_contract_id"]
          },
          {
            foreignKeyName: "prime_contract_pay_apps_prime_contract_id_fkey"
            columns: ["prime_contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_pay_apps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_pay_apps_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "my_court"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_pay_apps_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      prime_contract_payments: {
        Row: {
          amount: number
          artifact_id: string | null
          created_at: string
          created_by: string | null
          id: string
          method: string | null
          notes: string | null
          pay_app_id: string
          prime_contract_id: string
          received_date: string
          reference: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          artifact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          pay_app_id: string
          prime_contract_id: string
          received_date: string
          reference?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          artifact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          pay_app_id?: string
          prime_contract_id?: string
          received_date?: string
          reference?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prime_contract_payments_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "project_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_payments_pay_app_id_fkey"
            columns: ["pay_app_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_pay_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_payments_pay_app_id_fkey"
            columns: ["pay_app_id"]
            isOneToOne: false
            referencedRelation: "v_pay_app_balances"
            referencedColumns: ["pay_app_id"]
          },
          {
            foreignKeyName: "prime_contract_payments_prime_contract_id_fkey"
            columns: ["prime_contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_totals"
            referencedColumns: ["prime_contract_id"]
          },
          {
            foreignKeyName: "prime_contract_payments_prime_contract_id_fkey"
            columns: ["prime_contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prime_contract_sov_lines: {
        Row: {
          cost_code_id: string
          description: string
          id: string
          line_no: number
          prime_contract_id: string
          scheduled_value: number
          tenant_id: string
        }
        Insert: {
          cost_code_id: string
          description: string
          id?: string
          line_no: number
          prime_contract_id: string
          scheduled_value: number
          tenant_id: string
        }
        Update: {
          cost_code_id?: string
          description?: string
          id?: string
          line_no?: number
          prime_contract_id?: string
          scheduled_value?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prime_contract_sov_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_sov_lines_prime_contract_id_fkey"
            columns: ["prime_contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_totals"
            referencedColumns: ["prime_contract_id"]
          },
          {
            foreignKeyName: "prime_contract_sov_lines_prime_contract_id_fkey"
            columns: ["prime_contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_sov_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prime_contracts: {
        Row: {
          actual_completion_date: string | null
          architect_name: string | null
          artifact_id: string | null
          contract_date: string | null
          contract_no: string
          contractor_address: string | null
          contractor_contact: string | null
          contractor_email: string | null
          contractor_name: string | null
          created_at: string
          created_by: string | null
          docusign_envelope_id: string | null
          exclusions: string | null
          executed_date: string | null
          final_completion_date: string | null
          gc_org_id: string | null
          id: string
          inclusions: string | null
          liquidated_damages_per_day: number | null
          mobilization_advance: number | null
          original_value: number
          owner_address: string | null
          owner_contact: string | null
          owner_email: string | null
          owner_name: string | null
          owner_org_id: string | null
          payment_cycle_days: number | null
          payment_due_within_days: number | null
          project_address: string | null
          project_id: string
          retainage_pct: number
          retainage_release_final: number | null
          retainage_release_substantial: number | null
          retainage_warranty_months: number | null
          scope_description: string | null
          signed_contract_received_date: string | null
          special_conditions: string | null
          start_date: string | null
          status: string
          substantial_completion_date: string | null
          tenant_id: string
          title: string
          updated_at: string
          workflow_instance_id: string | null
        }
        Insert: {
          actual_completion_date?: string | null
          architect_name?: string | null
          artifact_id?: string | null
          contract_date?: string | null
          contract_no: string
          contractor_address?: string | null
          contractor_contact?: string | null
          contractor_email?: string | null
          contractor_name?: string | null
          created_at?: string
          created_by?: string | null
          docusign_envelope_id?: string | null
          exclusions?: string | null
          executed_date?: string | null
          final_completion_date?: string | null
          gc_org_id?: string | null
          id?: string
          inclusions?: string | null
          liquidated_damages_per_day?: number | null
          mobilization_advance?: number | null
          original_value?: number
          owner_address?: string | null
          owner_contact?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_org_id?: string | null
          payment_cycle_days?: number | null
          payment_due_within_days?: number | null
          project_address?: string | null
          project_id: string
          retainage_pct?: number
          retainage_release_final?: number | null
          retainage_release_substantial?: number | null
          retainage_warranty_months?: number | null
          scope_description?: string | null
          signed_contract_received_date?: string | null
          special_conditions?: string | null
          start_date?: string | null
          status?: string
          substantial_completion_date?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          workflow_instance_id?: string | null
        }
        Update: {
          actual_completion_date?: string | null
          architect_name?: string | null
          artifact_id?: string | null
          contract_date?: string | null
          contract_no?: string
          contractor_address?: string | null
          contractor_contact?: string | null
          contractor_email?: string | null
          contractor_name?: string | null
          created_at?: string
          created_by?: string | null
          docusign_envelope_id?: string | null
          exclusions?: string | null
          executed_date?: string | null
          final_completion_date?: string | null
          gc_org_id?: string | null
          id?: string
          inclusions?: string | null
          liquidated_damages_per_day?: number | null
          mobilization_advance?: number | null
          original_value?: number
          owner_address?: string | null
          owner_contact?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_org_id?: string | null
          payment_cycle_days?: number | null
          payment_due_within_days?: number | null
          project_address?: string | null
          project_id?: string
          retainage_pct?: number
          retainage_release_final?: number | null
          retainage_release_substantial?: number | null
          retainage_warranty_months?: number | null
          scope_description?: string | null
          signed_contract_received_date?: string | null
          special_conditions?: string | null
          start_date?: string | null
          status?: string
          substantial_completion_date?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          workflow_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prime_contracts_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "project_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contracts_gc_org_id_fkey"
            columns: ["gc_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contracts_owner_org_id_fkey"
            columns: ["owner_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contracts_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "my_court"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contracts_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      prime_payment_allocations: {
        Row: {
          amount: number
          change_order_id: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: string
          note: string | null
          payment_id: string
          sov_line_item_id: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          change_order_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          note?: string | null
          payment_id: string
          sov_line_item_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          change_order_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          note?: string | null
          payment_id?: string
          sov_line_item_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prime_payment_allocations_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_payment_allocations_sov_line_item_id_fkey"
            columns: ["sov_line_item_id"]
            isOneToOne: false
            referencedRelation: "sov_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_payment_allocations_sov_line_item_id_fkey"
            columns: ["sov_line_item_id"]
            isOneToOne: false
            referencedRelation: "v_sov_current_progress"
            referencedColumns: ["sov_line_item_id"]
          },
          {
            foreignKeyName: "prime_payment_allocations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      project_artifacts: {
        Row: {
          amount: number | null
          artifact_type: Database["public"]["Enums"]["artifact_type"]
          created_at: string
          created_by: string | null
          description: string | null
          extracted_text: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          linked_entity_id: string | null
          linked_entity_type: string | null
          mime_type: string | null
          period_date: string | null
          project_id: string
          reference_no: string | null
          source_system: Database["public"]["Enums"]["artifact_source"]
          tags: string[]
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          artifact_type?: Database["public"]["Enums"]["artifact_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          extracted_text?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          mime_type?: string | null
          period_date?: string | null
          project_id: string
          reference_no?: string | null
          source_system?: Database["public"]["Enums"]["artifact_source"]
          tags?: string[]
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          artifact_type?: Database["public"]["Enums"]["artifact_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          extracted_text?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          mime_type?: string | null
          period_date?: string | null
          project_id?: string
          reference_no?: string | null
          source_system?: Database["public"]["Enums"]["artifact_source"]
          tags?: string[]
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_artifacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_artifacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_budgets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          project_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          project_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          project_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      project_cost_code_overrides: {
        Row: {
          alias: string | null
          cost_code_id: string
          is_enabled: boolean
          project_id: string
        }
        Insert: {
          alias?: string | null
          cost_code_id: string
          is_enabled?: boolean
          project_id: string
        }
        Update: {
          alias?: string | null
          cost_code_id?: string
          is_enabled?: boolean
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_cost_code_overrides_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cost_code_overrides_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_directory_entries: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          is_key_contact: boolean
          organization_id: string | null
          permission_template_id: string | null
          project_id: string
          role_label: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          is_key_contact?: boolean
          organization_id?: string | null
          permission_template_id?: string | null
          project_id: string
          role_label?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          is_key_contact?: boolean
          organization_id?: string | null
          permission_template_id?: string | null
          project_id?: string
          role_label?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_directory_entries_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_directory_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_directory_entries_permission_template_id_fkey"
            columns: ["permission_template_id"]
            isOneToOne: false
            referencedRelation: "permission_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_directory_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_directory_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      project_intake: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          intake_email: string
          intake_token_hash: string
          project_id: string
          revoked_at: string | null
          storage_prefix: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          intake_email: string
          intake_token_hash: string
          project_id: string
          revoked_at?: string | null
          storage_prefix: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          intake_email?: string
          intake_token_hash?: string
          project_id?: string
          revoked_at?: string | null
          storage_prefix?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_intake_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_intake_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_issues: {
        Row: {
          category: string
          created_at: string
          description: string | null
          estimated_cost: number | null
          id: string
          linked_co_id: string | null
          linked_pco_id: string | null
          location: string | null
          photo_urls: string[] | null
          project_id: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          linked_co_id?: string | null
          linked_pco_id?: string | null
          location?: string | null
          photo_urls?: string[] | null
          project_id: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          linked_co_id?: string | null
          linked_pco_id?: string | null
          location?: string | null
          photo_urls?: string[] | null
          project_id?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_issues_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      project_locations: {
        Row: {
          created_at: string
          id: string
          level: number
          name: string
          parent_id: string | null
          project_id: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: number
          name: string
          parent_id?: string | null
          project_id: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          name?: string
          parent_id?: string | null
          project_id?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "project_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_meetings: {
        Row: {
          attendees: Json | null
          created_at: string
          created_by: string | null
          distribution_list_id: string | null
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
          series_id: string | null
          status: string
          template_id: string | null
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
          distribution_list_id?: string | null
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
          series_id?: string | null
          status?: string
          template_id?: string | null
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
          distribution_list_id?: string | null
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
          series_id?: string | null
          status?: string
          template_id?: string | null
          title?: string
          unlock_request_reason?: string | null
          unlock_requested?: boolean | null
          unlock_requested_at?: string | null
          unlock_requested_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_meetings_distribution_list_id_fkey"
            columns: ["distribution_list_id"]
            isOneToOne: false
            referencedRelation: "distribution_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_meetings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "meeting_templates"
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
          cost_code_id: string | null
          cost_impact_cents: number
          created_at: string
          created_by: string | null
          date_initiated: string | null
          drawing_number: string | null
          due_date: string | null
          id: string
          location_path: string | null
          project_id: string
          question: string
          received_from: string | null
          reference: string | null
          responded_at: string | null
          responded_by: string | null
          response: string | null
          responsible_contractor_org_id: string | null
          rfi_manager_id: string | null
          rfi_number: number
          schedule_impact_days: number
          specification_section_id: string | null
          stage: string
          status: Database["public"]["Enums"]["rfi_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          cost_code_id?: string | null
          cost_impact_cents?: number
          created_at?: string
          created_by?: string | null
          date_initiated?: string | null
          drawing_number?: string | null
          due_date?: string | null
          id?: string
          location_path?: string | null
          project_id: string
          question: string
          received_from?: string | null
          reference?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          responsible_contractor_org_id?: string | null
          rfi_manager_id?: string | null
          rfi_number?: number
          schedule_impact_days?: number
          specification_section_id?: string | null
          stage?: string
          status?: Database["public"]["Enums"]["rfi_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          cost_code_id?: string | null
          cost_impact_cents?: number
          created_at?: string
          created_by?: string | null
          date_initiated?: string | null
          drawing_number?: string | null
          due_date?: string | null
          id?: string
          location_path?: string | null
          project_id?: string
          question?: string
          received_from?: string | null
          reference?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          responsible_contractor_org_id?: string | null
          rfi_manager_id?: string | null
          rfi_number?: number
          schedule_impact_days?: number
          specification_section_id?: string | null
          stage?: string
          status?: Database["public"]["Enums"]["rfi_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_rfis_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_rfis_responsible_contractor_org_id_fkey"
            columns: ["responsible_contractor_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_rfis_specification_section_id_fkey"
            columns: ["specification_section_id"]
            isOneToOne: false
            referencedRelation: "specification_sections"
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
          actual_delivery_date: string | null
          anticipated_delivery_date: string | null
          confirmed_delivery_date: string | null
          cost_code_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          file_urls: string[] | null
          final_due_date: string | null
          id: string
          is_private: boolean
          package_id: string | null
          project_id: string
          responsible_contractor_org_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision: number | null
          specification_section_id: string | null
          status: Database["public"]["Enums"]["submittal_status"]
          submittal_manager_id: string | null
          submittal_number: number
          submittal_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_delivery_date?: string | null
          anticipated_delivery_date?: string | null
          confirmed_delivery_date?: string | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          file_urls?: string[] | null
          final_due_date?: string | null
          id?: string
          is_private?: boolean
          package_id?: string | null
          project_id: string
          responsible_contractor_org_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision?: number | null
          specification_section_id?: string | null
          status?: Database["public"]["Enums"]["submittal_status"]
          submittal_manager_id?: string | null
          submittal_number?: number
          submittal_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_delivery_date?: string | null
          anticipated_delivery_date?: string | null
          confirmed_delivery_date?: string | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          file_urls?: string[] | null
          final_due_date?: string | null
          id?: string
          is_private?: boolean
          package_id?: string | null
          project_id?: string
          responsible_contractor_org_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision?: number | null
          specification_section_id?: string | null
          status?: Database["public"]["Enums"]["submittal_status"]
          submittal_manager_id?: string | null
          submittal_number?: number
          submittal_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_submittals_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_submittals_responsible_contractor_org_id_fkey"
            columns: ["responsible_contractor_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_submittals_specification_section_id_fkey"
            columns: ["specification_section_id"]
            isOneToOne: false
            referencedRelation: "specification_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_package_fk"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "submittal_packages"
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
            foreignKeyName: "properties_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      proposal_lines: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          line_no: number
          markup_pct: number
          proposal_id: string
          quantity: number
          tenant_id: string
          unit: string
          unit_cost: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          id?: string
          line_no?: number
          markup_pct?: number
          proposal_id: string
          quantity?: number
          tenant_id: string
          unit?: string
          unit_cost?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          line_no?: number
          markup_pct?: number
          proposal_id?: string
          quantity?: number
          tenant_id?: string
          unit?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_lines_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      proposals: {
        Row: {
          client_email: string | null
          client_name: string | null
          created_at: string
          id: string
          markup_pct: number
          notes: string | null
          project_id: string
          proposal_no: string
          source_issue_id: string | null
          status: string
          tenant_id: string
          terms: string | null
          title: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          markup_pct?: number
          notes?: string | null
          project_id: string
          proposal_no: string
          source_issue_id?: string | null
          status?: string
          tenant_id: string
          terms?: string | null
          title: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          markup_pct?: number
          notes?: string | null
          project_id?: string
          proposal_no?: string
          source_issue_id?: string | null
          status?: string
          tenant_id?: string
          terms?: string | null
          title?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_source_issue_id_fkey"
            columns: ["source_issue_id"]
            isOneToOne: false
            referencedRelation: "project_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_item_responses: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          photos: string[]
          punch_item_id: string
          responded_at: string
          responder_email: string | null
          responder_name: string | null
          sub_status: string
          tenant_id: string
          transmittal_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          photos?: string[]
          punch_item_id: string
          responded_at?: string
          responder_email?: string | null
          responder_name?: string | null
          sub_status: string
          tenant_id: string
          transmittal_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          photos?: string[]
          punch_item_id?: string
          responded_at?: string
          responder_email?: string | null
          responder_name?: string | null
          sub_status?: string
          tenant_id?: string
          transmittal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "punch_item_responses_punch_item_id_fkey"
            columns: ["punch_item_id"]
            isOneToOne: false
            referencedRelation: "punch_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_item_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_item_responses_transmittal_id_fkey"
            columns: ["transmittal_id"]
            isOneToOne: false
            referencedRelation: "punch_transmittals"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_item_types: {
        Row: {
          default_priority: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          default_priority?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          default_priority?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "punch_item_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_items: {
        Row: {
          after_photos: string[] | null
          assigned_to: string | null
          assignee_id: string | null
          before_photos: string[] | null
          closed_at: string | null
          closed_by: string | null
          commitment_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string
          drawing_markup_id: string | null
          due_date: string | null
          evidence_required: boolean
          final_approver_id: string | null
          id: string
          item_type_id: string | null
          location: string
          location_id: string | null
          priority: string | null
          project_id: string
          status: Database["public"]["Enums"]["punch_status"]
          sub_responded_at: string | null
          sub_status: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          after_photos?: string[] | null
          assigned_to?: string | null
          assignee_id?: string | null
          before_photos?: string[] | null
          closed_at?: string | null
          closed_by?: string | null
          commitment_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          drawing_markup_id?: string | null
          due_date?: string | null
          evidence_required?: boolean
          final_approver_id?: string | null
          id?: string
          item_type_id?: string | null
          location: string
          location_id?: string | null
          priority?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["punch_status"]
          sub_responded_at?: string | null
          sub_status?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          after_photos?: string[] | null
          assigned_to?: string | null
          assignee_id?: string | null
          before_photos?: string[] | null
          closed_at?: string | null
          closed_by?: string | null
          commitment_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          drawing_markup_id?: string | null
          due_date?: string | null
          evidence_required?: boolean
          final_approver_id?: string | null
          id?: string
          item_type_id?: string | null
          location?: string
          location_id?: string | null
          priority?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["punch_status"]
          sub_responded_at?: string | null
          sub_status?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "punch_items_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitment_totals"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "punch_items_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_items_drawing_markup_id_fkey"
            columns: ["drawing_markup_id"]
            isOneToOne: false
            referencedRelation: "drawing_markups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_items_item_type_id_fkey"
            columns: ["item_type_id"]
            isOneToOne: false
            referencedRelation: "punch_item_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "project_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_transmittal_items: {
        Row: {
          created_at: string
          id: string
          punch_item_id: string
          tenant_id: string
          transmittal_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          punch_item_id: string
          tenant_id: string
          transmittal_id: string
        }
        Update: {
          created_at?: string
          id?: string
          punch_item_id?: string
          tenant_id?: string
          transmittal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "punch_transmittal_items_punch_item_id_fkey"
            columns: ["punch_item_id"]
            isOneToOne: false
            referencedRelation: "punch_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_transmittal_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_transmittal_items_transmittal_id_fkey"
            columns: ["transmittal_id"]
            isOneToOne: false
            referencedRelation: "punch_transmittals"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_transmittals: {
        Row: {
          commitment_id: string | null
          created_at: string
          id: string
          item_count: number
          message: string | null
          project_id: string
          recipient_email: string
          recipient_name: string | null
          respond_token: string
          responded_at: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          subject: string | null
          tenant_id: string
          viewed_at: string | null
        }
        Insert: {
          commitment_id?: string | null
          created_at?: string
          id?: string
          item_count?: number
          message?: string | null
          project_id: string
          recipient_email: string
          recipient_name?: string | null
          respond_token?: string
          responded_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string | null
          tenant_id: string
          viewed_at?: string | null
        }
        Update: {
          commitment_id?: string | null
          created_at?: string
          id?: string
          item_count?: number
          message?: string | null
          project_id?: string
          recipient_email?: string
          recipient_name?: string | null
          respond_token?: string
          responded_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string | null
          tenant_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "punch_transmittals_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitment_totals"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "punch_transmittals_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_transmittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_transmittals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      report_schedules: {
        Row: {
          created_at: string
          cron: string
          format: string
          id: string
          is_active: boolean
          last_run_at: string | null
          next_run_at: string | null
          recipients: Json
          report_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          cron: string
          format: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          recipients: Json
          report_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          cron?: string
          format?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          recipients?: Json
          report_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_schedules_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          config: Json
          created_at: string
          data_source: string
          description: string | null
          id: string
          name: string
          owner_user_id: string
          project_id: string | null
          scope: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          config: Json
          created_at?: string
          data_source: string
          description?: string | null
          id?: string
          name: string
          owner_user_id: string
          project_id?: string | null
          scope?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          data_source?: string
          description?: string | null
          id?: string
          name?: string
          owner_user_id?: string
          project_id?: string | null
          scope?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_attachments: {
        Row: {
          created_at: string
          document_id: string | null
          drawing_markup_id: string | null
          id: string
          photo_id: string | null
          rfi_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          drawing_markup_id?: string | null
          id?: string
          photo_id?: string | null
          rfi_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          drawing_markup_id?: string | null
          id?: string
          photo_id?: string | null
          rfi_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfi_attachments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "pl_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_attachments_drawing_markup_id_fkey"
            columns: ["drawing_markup_id"]
            isOneToOne: false
            referencedRelation: "drawing_markups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_attachments_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_attachments_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "project_rfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_responses: {
        Row: {
          body: string
          created_at: string
          id: string
          is_official: boolean
          responder_id: string | null
          rfi_id: string
          tenant_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_official?: boolean
          responder_id?: string | null
          rfi_id: string
          tenant_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_official?: boolean
          responder_id?: string | null
          rfi_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfi_responses_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "project_rfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_responses_tenant_id_fkey"
            columns: ["tenant_id"]
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
      schedule_baselines: {
        Row: {
          captured_at: string
          captured_by: string | null
          id: string
          name: string | null
          schedule_id: string
          tasks_snapshot: Json
        }
        Insert: {
          captured_at?: string
          captured_by?: string | null
          id?: string
          name?: string | null
          schedule_id: string
          tasks_snapshot: Json
        }
        Update: {
          captured_at?: string
          captured_by?: string | null
          id?: string
          name?: string | null
          schedule_id?: string
          tasks_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "schedule_baselines_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_predecessors: {
        Row: {
          lag_days: number
          predecessor_task_id: string
          relation: string
          task_id: string
        }
        Insert: {
          lag_days?: number
          predecessor_task_id: string
          relation: string
          task_id: string
        }
        Update: {
          lag_days?: number
          predecessor_task_id?: string
          relation?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_predecessors_predecessor_task_id_fkey"
            columns: ["predecessor_task_id"]
            isOneToOne: false
            referencedRelation: "schedule_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_predecessors_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "schedule_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_tasks: {
        Row: {
          created_at: string
          duration_days: number | null
          finish_date: string | null
          id: string
          is_critical: boolean
          is_milestone: boolean
          name: string
          parent_task_id: string | null
          pct_complete: number
          schedule_id: string
          start_date: string | null
          task_code: string | null
          wbs_path: string | null
        }
        Insert: {
          created_at?: string
          duration_days?: number | null
          finish_date?: string | null
          id?: string
          is_critical?: boolean
          is_milestone?: boolean
          name: string
          parent_task_id?: string | null
          pct_complete?: number
          schedule_id: string
          start_date?: string | null
          task_code?: string | null
          wbs_path?: string | null
        }
        Update: {
          created_at?: string
          duration_days?: number | null
          finish_date?: string | null
          id?: string
          is_critical?: boolean
          is_milestone?: boolean
          name?: string
          parent_task_id?: string | null
          pct_complete?: number
          schedule_id?: string
          start_date?: string | null
          task_code?: string | null
          wbs_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "schedule_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_tasks_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          created_at: string
          id: string
          imported_at: string | null
          is_current: boolean
          name: string
          project_id: string
          source: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          imported_at?: string | null
          is_current?: boolean
          name: string
          project_id: string
          source?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          imported_at?: string | null
          is_current?: boolean
          name?: string
          project_id?: string
          source?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      scim_external_groups: {
        Row: {
          created_at: string
          display_name: string
          external_id: string
          id: string
          mapped_template_id: string | null
          raw: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          external_id: string
          id?: string
          mapped_template_id?: string | null
          raw?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          external_id?: string
          id?: string
          mapped_template_id?: string | null
          raw?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scim_external_groups_mapped_template_id_fkey"
            columns: ["mapped_template_id"]
            isOneToOne: false
            referencedRelation: "permission_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scim_external_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      scim_external_users: {
        Row: {
          active: boolean
          created_at: string
          display_name: string | null
          email: string
          external_id: string
          family_name: string | null
          given_name: string | null
          id: string
          raw: Json
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name?: string | null
          email: string
          external_id: string
          family_name?: string | null
          given_name?: string | null
          id?: string
          raw?: Json
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string | null
          email?: string
          external_id?: string
          family_name?: string | null
          given_name?: string | null
          id?: string
          raw?: Json
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scim_external_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      scim_group_members: {
        Row: {
          group_id: string
          user_id: string
        }
        Insert: {
          group_id: string
          user_id: string
        }
        Update: {
          group_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scim_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "scim_external_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scim_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "scim_external_users"
            referencedColumns: ["id"]
          },
        ]
      }
      sov_line_items: {
        Row: {
          budget_code: string | null
          change_order_id: string | null
          cost_code_id: string | null
          created_at: string
          description: string
          id: string
          item_no: string
          kind: string
          prime_contract_id: string
          project_id: string
          retainage_pct: number | null
          scheduled_qty: number
          scheduled_value: number
          sort_order: number
          tenant_id: string
          unit: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          budget_code?: string | null
          change_order_id?: string | null
          cost_code_id?: string | null
          created_at?: string
          description: string
          id?: string
          item_no: string
          kind?: string
          prime_contract_id: string
          project_id: string
          retainage_pct?: number | null
          scheduled_qty?: number
          scheduled_value?: number
          sort_order?: number
          tenant_id: string
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          budget_code?: string | null
          change_order_id?: string | null
          cost_code_id?: string | null
          created_at?: string
          description?: string
          id?: string
          item_no?: string
          kind?: string
          prime_contract_id?: string
          project_id?: string
          retainage_pct?: number | null
          scheduled_qty?: number
          scheduled_value?: number
          sort_order?: number
          tenant_id?: string
          unit?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sov_line_items_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sov_line_items_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sov_line_items_prime_contract_id_fkey"
            columns: ["prime_contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_totals"
            referencedColumns: ["prime_contract_id"]
          },
          {
            foreignKeyName: "sov_line_items_prime_contract_id_fkey"
            columns: ["prime_contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sov_line_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sov_line_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      spec_submittal_requirements: {
        Row: {
          id: string
          is_generated: boolean
          requirement_text: string
          section_id: string
          submittal_type: string | null
        }
        Insert: {
          id?: string
          is_generated?: boolean
          requirement_text: string
          section_id: string
          submittal_type?: string | null
        }
        Update: {
          id?: string
          is_generated?: boolean
          requirement_text?: string
          section_id?: string
          submittal_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spec_submittal_requirements_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "specification_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      specification_sections: {
        Row: {
          cost_code_id: string | null
          created_at: string
          division: string
          id: string
          pdf_page_end: number | null
          pdf_page_start: number | null
          revision: string
          section_number: string
          set_id: string
          tenant_id: string
          title: string
        }
        Insert: {
          cost_code_id?: string | null
          created_at?: string
          division: string
          id?: string
          pdf_page_end?: number | null
          pdf_page_start?: number | null
          revision?: string
          section_number: string
          set_id: string
          tenant_id: string
          title: string
        }
        Update: {
          cost_code_id?: string | null
          created_at?: string
          division?: string
          id?: string
          pdf_page_end?: number | null
          pdf_page_start?: number | null
          revision?: string
          section_number?: string
          set_id?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "specification_sections_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specification_sections_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "specification_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specification_sections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      specification_sets: {
        Row: {
          created_at: string
          id: string
          name: string
          pdf_path: string | null
          project_id: string
          set_date: string | null
          status: string
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          pdf_path?: string | null
          project_id: string
          set_date?: string | null
          status?: string
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          pdf_path?: string | null
          project_id?: string
          set_date?: string | null
          status?: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "specification_sets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specification_sets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_login_events: {
        Row: {
          assertion_id: string | null
          error: string | null
          id: string
          ip: unknown
          occurred_at: string
          provider: string | null
          success: boolean
          tenant_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          assertion_id?: string | null
          error?: string | null
          id?: string
          ip?: unknown
          occurred_at?: string
          provider?: string | null
          success: boolean
          tenant_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          assertion_id?: string | null
          error?: string | null
          id?: string
          ip?: unknown
          occurred_at?: string
          provider?: string | null
          success?: boolean
          tenant_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sso_login_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          event_type: string
          id: string
          payload: Json
          processed_at: string
        }
        Insert: {
          event_type: string
          id: string
          payload: Json
          processed_at?: string
        }
        Update: {
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string
        }
        Relationships: []
      }
      submittal_packages: {
        Row: {
          created_at: string
          id: string
          number: string
          project_id: string
          status: string
          tenant_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          number: string
          project_id: string
          status?: string
          tenant_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          number?: string
          project_id?: string
          status?: string
          tenant_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submittal_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_register_items: {
        Row: {
          id: string
          project_id: string
          required_type: string | null
          specification_section_id: string | null
          status: string
          submittal_id: string | null
          tenant_id: string
        }
        Insert: {
          id?: string
          project_id: string
          required_type?: string | null
          specification_section_id?: string | null
          status?: string
          submittal_id?: string | null
          tenant_id: string
        }
        Update: {
          id?: string
          project_id?: string
          required_type?: string | null
          specification_section_id?: string | null
          status?: string
          submittal_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submittal_register_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_register_items_specification_section_id_fkey"
            columns: ["specification_section_id"]
            isOneToOne: false
            referencedRelation: "specification_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_register_items_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "project_submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_register_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_workflow_steps: {
        Row: {
          approver_id: string
          comment: string | null
          due_date: string | null
          id: string
          responded_at: string | null
          response: string | null
          sequence: number
          submittal_id: string
        }
        Insert: {
          approver_id: string
          comment?: string | null
          due_date?: string | null
          id?: string
          responded_at?: string | null
          response?: string | null
          sequence: number
          submittal_id: string
        }
        Update: {
          approver_id?: string
          comment?: string | null
          due_date?: string | null
          id?: string
          responded_at?: string | null
          response?: string | null
          sequence?: number
          submittal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submittal_workflow_steps_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "project_submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          hashed_key: string
          id: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hashed_key: string
          id?: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[]
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hashed_key?: string
          id?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_scim_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          hashed_token: string
          id: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          tenant_id: string
          token_prefix: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hashed_token: string
          id?: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          tenant_id: string
          token_prefix: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hashed_token?: string
          id?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          tenant_id?: string
          token_prefix?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_scim_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          id: string
          key: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_sso_configs: {
        Row: {
          acs_url: string
          attribute_mapping: Json
          created_at: string
          default_template_id: string | null
          id: string
          idp_certificate: string | null
          idp_entity_id: string | null
          idp_metadata_xml: string | null
          idp_sso_url: string | null
          is_enforced: boolean
          oidc_client_id: string | null
          oidc_client_secret_enc: string | null
          oidc_discovery_url: string | null
          provider: string
          sp_entity_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          acs_url: string
          attribute_mapping?: Json
          created_at?: string
          default_template_id?: string | null
          id?: string
          idp_certificate?: string | null
          idp_entity_id?: string | null
          idp_metadata_xml?: string | null
          idp_sso_url?: string | null
          is_enforced?: boolean
          oidc_client_id?: string | null
          oidc_client_secret_enc?: string | null
          oidc_discovery_url?: string | null
          provider: string
          sp_entity_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          acs_url?: string
          attribute_mapping?: Json
          created_at?: string
          default_template_id?: string | null
          id?: string
          idp_certificate?: string | null
          idp_entity_id?: string | null
          idp_metadata_xml?: string | null
          idp_sso_url?: string | null
          is_enforced?: boolean
          oidc_client_id?: string | null
          oidc_client_secret_enc?: string | null
          oidc_discovery_url?: string | null
          provider?: string
          sp_entity_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_sso_configs_default_template_id_fkey"
            columns: ["default_template_id"]
            isOneToOne: false
            referencedRelation: "permission_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_sso_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          seats: number
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          trial_end: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          seats?: number
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          trial_end?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          seats?: number
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          trial_end?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
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
      transmittal_items: {
        Row: {
          document_id: string
          transmittal_id: string
          version: number
        }
        Insert: {
          document_id: string
          transmittal_id: string
          version: number
        }
        Update: {
          document_id?: string
          transmittal_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "transmittal_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "pl_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transmittal_items_transmittal_id_fkey"
            columns: ["transmittal_id"]
            isOneToOne: false
            referencedRelation: "transmittals"
            referencedColumns: ["id"]
          },
        ]
      }
      transmittals: {
        Row: {
          body: string | null
          created_at: string
          distribution_list_id: string | null
          from_user_id: string | null
          id: string
          number: string
          project_id: string
          sent_at: string | null
          subject: string
          tenant_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          distribution_list_id?: string | null
          from_user_id?: string | null
          id?: string
          number: string
          project_id: string
          sent_at?: string | null
          subject: string
          tenant_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          distribution_list_id?: string | null
          from_user_id?: string | null
          id?: string
          number?: string
          project_id?: string
          sent_at?: string | null
          subject?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transmittals_distribution_list_id_fkey"
            columns: ["distribution_list_id"]
            isOneToOne: false
            referencedRelation: "distribution_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transmittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transmittals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
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
      usage_events: {
        Row: {
          id: string
          meta: Json | null
          metric: string
          occurred_at: string
          quantity: number
          tenant_id: string
        }
        Insert: {
          id?: string
          meta?: Json | null
          metric: string
          occurred_at?: string
          quantity: number
          tenant_id: string
        }
        Update: {
          id?: string
          meta?: Json | null
          metric?: string
          occurred_at?: string
          quantity?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      user_template_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          project_id: string | null
          template_id: string
          tenant_id: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string | null
          template_id: string
          tenant_id: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string | null
          template_id?: string
          tenant_id?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_template_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_template_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "permission_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_template_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_template_assignments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_submissions: {
        Row: {
          artifact_id: string | null
          commitment_id: string | null
          created_at: string
          created_commitment_invoice_id: string | null
          created_lien_release_id: string | null
          doc_type: string
          error: string | null
          from_email: string | null
          id: string
          parsed: Json | null
          project_id: string
          received_at: string
          source: string
          status: string
          subject: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          artifact_id?: string | null
          commitment_id?: string | null
          created_at?: string
          created_commitment_invoice_id?: string | null
          created_lien_release_id?: string | null
          doc_type?: string
          error?: string | null
          from_email?: string | null
          id?: string
          parsed?: Json | null
          project_id: string
          received_at?: string
          source: string
          status?: string
          subject?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          artifact_id?: string | null
          commitment_id?: string | null
          created_at?: string
          created_commitment_invoice_id?: string | null
          created_lien_release_id?: string | null
          doc_type?: string
          error?: string | null
          from_email?: string | null
          id?: string
          parsed?: Json | null
          project_id?: string
          received_at?: string
          source?: string
          status?: string
          subject?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_submissions_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "project_artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_submissions_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitment_totals"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "vendor_submissions_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_submissions_created_commitment_invoice_id_fkey"
            columns: ["created_commitment_invoice_id"]
            isOneToOne: false
            referencedRelation: "commitment_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_submissions_created_commitment_invoice_id_fkey"
            columns: ["created_commitment_invoice_id"]
            isOneToOne: false
            referencedRelation: "v_commitment_invoice_balances"
            referencedColumns: ["commitment_invoice_id"]
          },
          {
            foreignKeyName: "vendor_submissions_created_lien_release_id_fkey"
            columns: ["created_lien_release_id"]
            isOneToOne: false
            referencedRelation: "lien_releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_submissions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      webhook_deliveries: {
        Row: {
          attempt_no: number
          created_at: string
          delivered_at: string | null
          event_type: string
          id: string
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          response_status: number | null
          tenant_id: string
          webhook_subscription_id: string
        }
        Insert: {
          attempt_no?: number
          created_at?: string
          delivered_at?: string | null
          event_type: string
          id?: string
          next_retry_at?: string | null
          payload: Json
          response_body?: string | null
          response_status?: number | null
          tenant_id: string
          webhook_subscription_id: string
        }
        Update: {
          attempt_no?: number
          created_at?: string
          delivered_at?: string | null
          event_type?: string
          id?: string
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          tenant_id?: string
          webhook_subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_webhook_subscription_id_fkey"
            columns: ["webhook_subscription_id"]
            isOneToOne: false
            referencedRelation: "webhook_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_subscriptions: {
        Row: {
          created_at: string
          created_by: string | null
          events: string[]
          id: string
          is_active: boolean
          name: string | null
          secret: string
          secret_hash: string | null
          tenant_id: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          name?: string | null
          secret: string
          secret_hash?: string | null
          tenant_id: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          name?: string | null
          secret?: string
          secret_hash?: string | null
          tenant_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
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
      workflow_definitions: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          module: string
          name: string
          tenant_id: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          module: string
          name: string
          tenant_id: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          module?: string
          name?: string
          tenant_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_definitions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_distributions: {
        Row: {
          created_at: string
          delivered_at: string | null
          email: string | null
          id: string
          list_id: string | null
          reason: string | null
          record_id: string
          record_type: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          email?: string | null
          id?: string
          list_id?: string | null
          reason?: string | null
          record_id: string
          record_type: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          email?: string | null
          id?: string
          list_id?: string | null
          reason?: string | null
          record_id?: string
          record_type?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_distributions_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "distribution_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_distributions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_events: {
        Row: {
          action: string
          actor_id: string | null
          comment: string | null
          from_step: number | null
          id: string
          instance_id: string
          occurred_at: string
          to_step: number | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          comment?: string | null
          from_step?: number | null
          id?: string
          instance_id: string
          occurred_at?: string
          to_step?: number | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          comment?: string | null
          from_step?: number | null
          id?: string
          instance_id?: string
          occurred_at?: string
          to_step?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_events_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "my_court"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_events_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_instances: {
        Row: {
          closed_at: string | null
          created_at: string
          current_assignee_id: string | null
          current_step: number
          definition_id: string
          due_at: string | null
          id: string
          project_id: string | null
          record_id: string
          record_type: string
          state: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          current_assignee_id?: string | null
          current_step: number
          definition_id: string
          due_at?: string | null
          id?: string
          project_id?: string | null
          record_id: string
          record_type: string
          state: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          current_assignee_id?: string | null
          current_step?: number
          definition_id?: string
          due_at?: string | null
          id?: string
          project_id?: string | null
          record_id?: string
          record_type?: string
          state?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_instances_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          assignee_rule: string
          auto_actions: Json
          definition_id: string
          due_offset_days: number | null
          id: string
          sequence: number
          state_name: string
        }
        Insert: {
          assignee_rule: string
          auto_actions?: Json
          definition_id: string
          due_offset_days?: number | null
          id?: string
          sequence: number
          state_name: string
        }
        Update: {
          assignee_rule?: string
          auto_actions?: Json
          definition_id?: string
          due_offset_days?: number | null
          id?: string
          sequence?: number
          state_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_co_settings: {
        Row: {
          company_address: string | null
          company_city: string | null
          company_contact: string | null
          company_email: string | null
          company_name: string | null
          company_title: string | null
          created_at: string
          default_overhead_pct: number
          default_profit_pct: number
          email_from_name: string | null
          footer: string | null
          updated_at: string
          wordmark: string | null
          workspace_id: string
        }
        Insert: {
          company_address?: string | null
          company_city?: string | null
          company_contact?: string | null
          company_email?: string | null
          company_name?: string | null
          company_title?: string | null
          created_at?: string
          default_overhead_pct?: number
          default_profit_pct?: number
          email_from_name?: string | null
          footer?: string | null
          updated_at?: string
          wordmark?: string | null
          workspace_id: string
        }
        Update: {
          company_address?: string | null
          company_city?: string | null
          company_contact?: string | null
          company_email?: string | null
          company_name?: string | null
          company_title?: string | null
          created_at?: string
          default_overhead_pct?: number
          default_profit_pct?: number
          email_from_name?: string | null
          footer?: string | null
          updated_at?: string
          wordmark?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_co_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
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
          created_at: string
          id: string
          name: string
          owner_user_id: string | null
          plan: string
          slug: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id?: string | null
          plan?: string
          slug?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string | null
          plan?: string
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
      budget_matrix: {
        Row: {
          approved_budget_mods: number | null
          committed_cost: number | null
          cost_code: string | null
          cost_code_desc: string | null
          cost_code_id: string | null
          direct_cost: number | null
          executed_cco: number | null
          forecast_to_complete: number | null
          original_budget: number | null
          pending_exposure: number | null
          project_budget_id: string | null
          revised_budget: number | null
          variance: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_project_budget_id_fkey"
            columns: ["project_budget_id"]
            isOneToOne: false
            referencedRelation: "project_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      commitment_totals: {
        Row: {
          billed_to_date: number | null
          commitment_id: string | null
          executed_cco_value: number | null
          original_value: number | null
          revised_commitment_value: number | null
        }
        Relationships: []
      }
      my_court: {
        Row: {
          created_at: string | null
          current_state_name: string | null
          current_step: number | null
          due_at: string | null
          id: string | null
          module: string | null
          project_id: string | null
          record_id: string | null
          record_type: string | null
          state: string | null
          tenant_id: string | null
          workflow_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_instances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      my_subscription: {
        Row: {
          cancel_at_period_end: boolean | null
          current_period_end: string | null
          features: Json | null
          id: string | null
          plan_code: string | null
          plan_id: string | null
          plan_name: string | null
          price_cents: number | null
          seat_limit: number | null
          seats: number | null
          status: string | null
          tenant_id: string | null
          trial_end: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      my_tenant_context: {
        Row: {
          is_super_admin: boolean | null
          tenant_id: string | null
          workspace_ids: string[] | null
        }
        Relationships: []
      }
      prime_contract_totals: {
        Row: {
          billed_to_date: number | null
          executed_co_value: number | null
          original_value: number | null
          prime_contract_id: string | null
          revised_contract_value: number | null
        }
        Relationships: []
      }
      v_commitment_invoice_balances: {
        Row: {
          balance_due: number | null
          billed_amount: number | null
          commitment_id: string | null
          commitment_invoice_id: string | null
          invoice_no: string | null
          lien_satisfied: boolean | null
          paid_to_date: number | null
          payment_count: number | null
          project_id: string | null
          retainage_held: number | null
          status: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commitment_invoices_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitment_totals"
            referencedColumns: ["commitment_id"]
          },
          {
            foreignKeyName: "commitment_invoices_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitment_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_pay_app_balances: {
        Row: {
          balance_due: number | null
          billed_amount: number | null
          pay_app_id: string | null
          pay_app_no: number | null
          payment_count: number | null
          prime_contract_id: string | null
          project_id: string | null
          received_to_date: number | null
          retainage_held: number | null
          status: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prime_contract_pay_apps_prime_contract_id_fkey"
            columns: ["prime_contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_totals"
            referencedColumns: ["prime_contract_id"]
          },
          {
            foreignKeyName: "prime_contract_pay_apps_prime_contract_id_fkey"
            columns: ["prime_contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contract_pay_apps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_project_financial_ledger: {
        Row: {
          amount: number | null
          artifact_id: string | null
          cost_code_id: string | null
          created_at: string | null
          description: string | null
          direction: string | null
          entry_date: string | null
          entry_type: string | null
          ledger_id: string | null
          party_name: string | null
          project_id: string | null
          reference: string | null
          status: string | null
          tenant_id: string | null
        }
        Relationships: []
      }
      v_project_financial_summary: {
        Row: {
          ap_outstanding: number | null
          ap_retainage_held: number | null
          approved_co_value: number | null
          ar_outstanding: number | null
          ar_retainage_held: number | null
          billed_to_date: number | null
          commitment_invoiced: number | null
          committed_total: number | null
          net_cash_position: number | null
          original_contract: number | null
          paid_to_subs: number | null
          project_id: string | null
          received_to_date: number | null
          revised_contract: number | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prime_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prime_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      v_sov_current_progress: {
        Row: {
          budget_code: string | null
          change_order_id: string | null
          cost_code_id: string | null
          description: string | null
          item_no: string | null
          kind: string | null
          latest_pay_app_no: number | null
          pct_complete: number | null
          prime_contract_id: string | null
          project_id: string | null
          qty_remaining: number | null
          qty_to_date: number | null
          retainage: number | null
          scheduled_qty: number | null
          scheduled_value: number | null
          sort_order: number | null
          sov_line_item_id: string | null
          tenant_id: string | null
          unit: string | null
          unit_price: number | null
          value_remaining: number | null
          value_to_date: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sov_line_items_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sov_line_items_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sov_line_items_prime_contract_id_fkey"
            columns: ["prime_contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contract_totals"
            referencedColumns: ["prime_contract_id"]
          },
          {
            foreignKeyName: "sov_line_items_prime_contract_id_fkey"
            columns: ["prime_contract_id"]
            isOneToOne: false
            referencedRelation: "prime_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sov_line_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sov_line_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      advance_workflow: {
        Args: {
          p_action: string
          p_comment?: string
          p_explicit_next_assignee?: string
          p_instance_id: string
        }
        Returns: {
          closed_at: string | null
          created_at: string
          current_assignee_id: string | null
          current_step: number
          definition_id: string
          due_at: string | null
          id: string
          project_id: string | null
          record_id: string
          record_type: string
          state: string
          tenant_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "workflow_instances"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      bump_api_usage: {
        Args: { p_client_id: string; p_is_error?: boolean; p_tenant_id: string }
        Returns: undefined
      }
      calculate_nspire_deadline: {
        Args: { p_severity: Database["public"]["Enums"]["severity_level"] }
        Returns: string
      }
      can: {
        Args: {
          p_action: string
          p_min_level?: string
          p_module: string
          p_user: string
        }
        Returns: boolean
      }
      can_access_property: {
        Args: { _property_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_unit: {
        Args: { _unit_id: string; _user_id: string }
        Returns: boolean
      }
      can_add_seat: { Args: { p_current_seats?: number }; Returns: boolean }
      can_assign_role: {
        Args: {
          _target_role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      can_use_feature: { Args: { p_feature: string }; Returns: boolean }
      create_workflow_instance: {
        Args: {
          p_explicit_assignee?: string
          p_module: string
          p_project_id?: string
          p_record_id: string
          p_record_type: string
        }
        Returns: string
      }
      current_portal_kind: { Args: never; Returns: string }
      current_tenant_id: { Args: never; Returns: string }
      current_user_orgs: { Args: never; Returns: string[] }
      current_workspace_ids: { Args: never; Returns: string[] }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      emit_webhook_event: {
        Args: { p_event_type: string; p_payload: Json; p_tenant_id: string }
        Returns: undefined
      }
      enqueue_notification: {
        Args: {
          p_entity: string
          p_entity_id: string
          p_message: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
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
      is_super_admin: { Args: never; Returns: boolean }
      next_rfi_number: { Args: { p_project_id: string }; Returns: string }
      next_transmittal_number: {
        Args: { p_project_id: string }
        Returns: string
      }
      owner_approve_oco: {
        Args: { p_co_id: string; p_signature_path?: string }
        Returns: {
          accepted_signature_path: string | null
          accepted_signed_at: string | null
          accepted_signed_name: string | null
          amendment_history: Json
          amount: number
          approved_at: string | null
          approved_by: string | null
          client_comments: string | null
          co_no: number | null
          co_no_history: Json
          co_type: string | null
          commitment_id: string | null
          created_at: string
          days_impact: number
          description: string | null
          docx_path: string | null
          executed_date: string | null
          id: string
          locked: boolean
          parent_pco_id: string | null
          pdf_path: string | null
          peer_co_id: string | null
          prime_contract_id: string | null
          project_id: string
          reason_code: string | null
          requested_by: string | null
          sent_to_client_at: string | null
          sign_token: string | null
          signed_hardcopy_at: string | null
          signed_hardcopy_by: string | null
          signed_hardcopy_note: string | null
          signed_hardcopy_path: string | null
          spec: Json | null
          status: string
          submitted_signature_path: string | null
          submitted_signed_at: string | null
          submitted_signed_by: string | null
          tenant_id: string | null
          title: string
          updated_at: string
          voided_at: string | null
          voided_by: string | null
          workflow_instance_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "change_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      owner_reject_oco: {
        Args: { p_co_id: string; p_reason: string }
        Returns: {
          accepted_signature_path: string | null
          accepted_signed_at: string | null
          accepted_signed_name: string | null
          amendment_history: Json
          amount: number
          approved_at: string | null
          approved_by: string | null
          client_comments: string | null
          co_no: number | null
          co_no_history: Json
          co_type: string | null
          commitment_id: string | null
          created_at: string
          days_impact: number
          description: string | null
          docx_path: string | null
          executed_date: string | null
          id: string
          locked: boolean
          parent_pco_id: string | null
          pdf_path: string | null
          peer_co_id: string | null
          prime_contract_id: string | null
          project_id: string
          reason_code: string | null
          requested_by: string | null
          sent_to_client_at: string | null
          sign_token: string | null
          signed_hardcopy_at: string | null
          signed_hardcopy_by: string | null
          signed_hardcopy_note: string | null
          signed_hardcopy_path: string | null
          spec: Json | null
          status: string
          submitted_signature_path: string | null
          submitted_signed_at: string | null
          submitted_signed_by: string | null
          tenant_id: string | null
          title: string
          updated_at: string
          voided_at: string | null
          voided_by: string | null
          workflow_instance_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "change_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      permission_level: {
        Args: { p_action: string; p_module: string; p_user: string }
        Returns: string
      }
      resolve_distribution: {
        Args: {
          p_extra_emails?: string[]
          p_list_ids?: string[]
          p_user_ids?: string[]
        }
        Returns: {
          contact_id: string
          email: string
          role_label: string
          user_id: string
        }[]
      }
      role_priority: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: number
      }
      seed_phase2_demo: { Args: { p_project_id: string }; Returns: Json }
      user_max_role_priority: { Args: { _user_id: string }; Returns: number }
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
      artifact_source: "procore" | "builtos" | "manual"
      artifact_type:
        | "prime_contract"
        | "invoice"
        | "change_order"
        | "drawing"
        | "permit"
        | "inspection_record"
        | "photo"
        | "specification"
        | "correspondence"
        | "other"
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
      deliverable_status:
        | "pending"
        | "submitted"
        | "approved"
        | "rejected"
        | "overdue"
      inspection_area: "outside" | "inside" | "unit"
      inspection_item_status: "ok" | "needs_attention" | "defect_found"
      issue_source: "core" | "nspire" | "projects" | "permits" | "voice_agent"
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
      artifact_source: ["procore", "builtos", "manual"],
      artifact_type: [
        "prime_contract",
        "invoice",
        "change_order",
        "drawing",
        "permit",
        "inspection_record",
        "photo",
        "specification",
        "correspondence",
        "other",
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
      deliverable_status: [
        "pending",
        "submitted",
        "approved",
        "rejected",
        "overdue",
      ],
      inspection_area: ["outside", "inside", "unit"],
      inspection_item_status: ["ok", "needs_attention", "defect_found"],
      issue_source: ["core", "nspire", "projects", "permits", "voice_agent"],
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
