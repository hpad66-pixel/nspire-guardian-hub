
-- Regulatory Documents
create table if not exists public.regulatory_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  
  doc_number text,
  title text not null,
  description text,
  
  doc_type text not null default 'other',
  agency text not null default 'Other',
  agency_contact_name text,
  agency_contact_email text,
  agency_contact_phone text,
  
  case_number text,
  
  issued_date date,
  effective_date date,
  final_compliance_date date,
  
  status text not null default 'active',
  
  penalty_amount numeric(12,2),
  daily_fine numeric(10,2),
  
  document_url text,
  
  assigned_to uuid references public.profiles(user_id),
  created_by uuid references public.profiles(user_id),
  
  notes text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Regulatory Action Items
create table if not exists public.regulatory_action_items (
  id uuid primary key default gen_random_uuid(),
  regulatory_document_id uuid references public.regulatory_documents(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  
  item_number text,
  title text not null,
  description text,
  
  required_action text,
  acceptance_criteria text,
  
  due_date date,
  
  status text not null default 'open',
  
  assigned_to uuid references public.profiles(user_id),
  
  linked_permit_id uuid,
  linked_project_id uuid,
  linked_issue_id uuid,
  
  notes text,
  completion_notes text,
  completed_at timestamptz,
  completed_by uuid references public.profiles(user_id),
  
  sort_order integer default 0,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Evidence
create table if not exists public.regulatory_evidence (
  id uuid primary key default gen_random_uuid(),
  action_item_id uuid references public.regulatory_action_items(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  
  title text not null,
  description text,
  evidence_type text default 'document',
  file_url text,
  file_name text,
  
  uploaded_by uuid references public.profiles(user_id),
  uploaded_at timestamptz default now()
);

-- RLS
alter table public.regulatory_documents enable row level security;
alter table public.regulatory_action_items enable row level security;
alter table public.regulatory_evidence enable row level security;

create policy "workspace members can manage regulatory_documents"
on public.regulatory_documents for all
using (workspace_id = (select public.get_my_workspace_id()))
with check (workspace_id = (select public.get_my_workspace_id()));

create policy "workspace members can manage regulatory_action_items"
on public.regulatory_action_items for all
using (workspace_id = (select public.get_my_workspace_id()))
with check (workspace_id = (select public.get_my_workspace_id()));

create policy "workspace members can manage regulatory_evidence"
on public.regulatory_evidence for all
using (workspace_id = (select public.get_my_workspace_id()))
with check (workspace_id = (select public.get_my_workspace_id()));

-- Updated_at triggers
create trigger regulatory_documents_updated_at
  before update on public.regulatory_documents
  for each row execute function public.update_updated_at_column();

create trigger regulatory_action_items_updated_at
  before update on public.regulatory_action_items
  for each row execute function public.update_updated_at_column();
