
-- Compliance Events table
create table if not exists public.compliance_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  
  title text not null,
  description text,
  
  source_type text not null default 'manual',
  source_id uuid,
  
  category text not null default 'other',
  agency text,
  
  due_date date not null,
  reminder_days integer[] default '{90,60,30,14,7}',
  
  status text not null default 'upcoming',
  priority text not null default 'medium',
  
  assigned_to uuid references public.profiles(user_id) on delete set null,
  created_by uuid references public.profiles(user_id),
  
  notes text,
  completion_notes text,
  completed_at timestamptz,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Unique constraint for upsert on sync
create unique index if not exists compliance_events_source_unique 
  on public.compliance_events (source_type, source_id) 
  where source_id is not null;

-- Enable RLS
alter table public.compliance_events enable row level security;

-- Policies
create policy "workspace members can view compliance events"
on public.compliance_events for select
using (workspace_id = (select public.get_my_workspace_id()));

create policy "workspace members can insert compliance events"
on public.compliance_events for insert
with check (workspace_id = (select public.get_my_workspace_id()));

create policy "workspace members can update compliance events"
on public.compliance_events for update
using (workspace_id = (select public.get_my_workspace_id()));

create policy "workspace members can delete compliance events"
on public.compliance_events for delete
using (workspace_id = (select public.get_my_workspace_id()));

-- Updated_at trigger
create trigger compliance_events_updated_at
  before update on public.compliance_events
  for each row execute function public.update_updated_at_column();
