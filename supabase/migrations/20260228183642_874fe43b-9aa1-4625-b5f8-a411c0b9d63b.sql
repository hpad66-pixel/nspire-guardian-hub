
-- Risk Register
create table if not exists public.risks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  
  risk_number serial,
  title text not null,
  description text,
  
  category text not null default 'operational',
  
  probability integer default 3,
  impact integer default 3,
  
  status text not null default 'open',
  
  risk_owner uuid references public.profiles(user_id) on delete set null,
  review_date date,
  
  source_type text,
  source_id uuid,
  
  mitigation_strategy text,
  
  closed_at timestamptz,
  closure_notes text,
  closed_by uuid references public.profiles(user_id),
  
  created_by uuid references public.profiles(user_id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.risk_actions (
  id uuid primary key default gen_random_uuid(),
  risk_id uuid references public.risks(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  
  title text not null,
  description text,
  assigned_to uuid references public.profiles(user_id) on delete set null,
  due_date date,
  
  status text not null default 'open',
  completed_at timestamptz,
  completion_notes text,
  
  created_by uuid references public.profiles(user_id),
  created_at timestamptz default now()
);

-- RLS
alter table public.risks enable row level security;
alter table public.risk_actions enable row level security;

create policy "workspace members can manage risks"
on public.risks for all
using (workspace_id = (select public.get_my_workspace_id()))
with check (workspace_id = (select public.get_my_workspace_id()));

create policy "workspace members can manage risk_actions"
on public.risk_actions for all
using (workspace_id = (select public.get_my_workspace_id()))
with check (workspace_id = (select public.get_my_workspace_id()));

-- Updated_at triggers
create trigger risks_updated_at
  before update on public.risks
  for each row execute function public.update_updated_at_column();
