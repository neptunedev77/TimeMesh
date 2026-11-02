-- Types

create type public.project_type as enum ('project', 'event', 'meeting', 'work_session', 'activity', 'other');
create type public.planning_mode as enum ('weekly', 'multi_week');
create type public.project_status as enum ('active', 'closed', 'archived');
create type public.member_role as enum ('host', 'participant');
create type public.availability_kind as enum ('available', 'unavailable');
create type public.entry_source as enum ('manual', 'exception');
create type public.session_status as enum ('proposed', 'confirmed', 'cancelled');
create type public.session_response as enum ('pending', 'accepted', 'declined');

-- Tables

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  usual_start_time time not null default '09:00',
  usual_end_time time not null default '23:00',
  presets jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text check (char_length(description) <= 2000),
  type public.project_type not null default 'project',
  time_zone text not null default 'Europe/Lisbon',
  start_date date not null,
  end_date date not null,
  planning_mode public.planning_mode not null default 'weekly',
  slot_minutes smallint not null default 30 check (slot_minutes in (15, 30)),
  min_participants smallint not null default 2 check (min_participants >= 1),
  min_session_minutes integer check (min_session_minutes > 0),
  preferred_session_minutes integer check (preferred_session_minutes > 0),
  max_session_minutes integer check (max_session_minutes > 0),
  allow_guests boolean not null default true,
  show_individual_availability boolean not null default true,
  members_can_invite boolean not null default false,
  status public.project_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (max_session_minutes is null or min_session_minutes is null or max_session_minutes >= min_session_minutes)
);

create index projects_host_id_idx on public.projects (host_id);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  guest_token_hash text unique,
  display_name text not null check (char_length(display_name) between 1 and 80),
  role public.member_role not null default 'participant',
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, project_id),
  check ((user_id is null) <> (guest_token_hash is null)),
  check (role = 'participant' or user_id is not null)
);

create unique index project_members_project_user_idx on public.project_members (project_id, user_id)
  where user_id is not null;
create index project_members_user_id_idx on public.project_members (user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(32), 'hex'),
  created_by uuid not null references public.profiles (id) on delete cascade,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index invitations_project_id_idx on public.invitations (project_id);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  member_id uuid references public.project_members (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  kind public.availability_kind not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((user_id is null) <> (member_id is null))
);

create index availability_rules_user_id_idx on public.availability_rules (user_id);
create index availability_rules_member_id_idx on public.availability_rules (member_id);

create table public.availability_entries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.project_members (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  kind public.availability_kind not null default 'available',
  source public.entry_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index availability_entries_member_start_idx on public.availability_entries (member_id, starts_at);

create table public.member_weeks (
  member_id uuid not null references public.project_members (id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  confirmed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (member_id, week_start)
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 2000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.session_status not null default 'proposed',
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, project_id),
  check (ends_at > starts_at)
);

create index sessions_project_start_idx on public.sessions (project_id, starts_at);

-- The shared project_id stops a session from including a member of another project.
create table public.session_participants (
  session_id uuid not null,
  member_id uuid not null,
  project_id uuid not null,
  response public.session_response not null default 'pending',
  responded_at timestamptz,
  primary key (session_id, member_id),
  foreign key (session_id, project_id) references public.sessions (id, project_id) on delete cascade,
  foreign key (member_id, project_id) references public.project_members (id, project_id) on delete cascade
);

create index session_participants_member_id_idx on public.session_participants (member_id);

-- Triggers

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.project_members
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.availability_rules
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.availability_entries
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.member_weeks
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.sessions
  for each row execute function public.set_updated_at();

create schema private;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

create function private.add_host_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.project_members (project_id, user_id, display_name, role)
  select new.id, profile.id, profile.display_name, 'host'
  from public.profiles as profile
  where profile.id = new.host_id;
  return new;
end;
$$;

create trigger on_project_created after insert on public.projects
  for each row execute function private.add_host_member();

-- Access helpers. They run as definer so policies don't recurse through project_members.

create function private.is_host(target_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.projects
    where id = target_project and host_id = auth.uid()
  );
$$;

create function private.is_member(target_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members
    where project_id = target_project and user_id = auth.uid() and removed_at is null
  );
$$;

create function private.is_own_member(target_member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members
    where id = target_member and user_id = auth.uid() and removed_at is null
  );
$$;

create function private.shares_project_with_member(target_member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members as target
    where target.id = target_member and private.is_member(target.project_id)
  );
$$;

create function private.can_view_availability(target_member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members as target
    join public.projects as project on project.id = target.project_id
    where target.id = target_member
      and (
        project.host_id = auth.uid()
        or (target.user_id = auth.uid() and target.removed_at is null)
        or (project.show_individual_availability and private.is_member(project.id))
      )
  );
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke all on all functions in schema private from public;
grant execute on function private.is_host(uuid) to authenticated;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.is_own_member(uuid) to authenticated;
grant execute on function private.shares_project_with_member(uuid) to authenticated;
grant execute on function private.can_view_availability(uuid) to authenticated;

-- Privileges. Visitors without a session get nothing; guests go through trusted server code.

revoke all on all tables in schema public from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.invitations to authenticated;
grant select, insert, update, delete on public.availability_rules to authenticated;
grant select, insert, update, delete on public.availability_entries to authenticated;
grant select, insert, update, delete on public.member_weeks to authenticated;
grant select, insert, update, delete on public.sessions to authenticated;
grant select, insert, delete on public.session_participants to authenticated;
grant update (response, responded_at) on public.session_participants to authenticated;

-- Guest token hashes stay out of reach, and memberships are created by trusted server code.
grant select (id, project_id, user_id, display_name, role, removed_at, created_at, updated_at)
  on public.project_members to authenticated;
grant update (display_name, removed_at) on public.project_members to authenticated;

-- Row Level Security

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.invitations enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_entries enable row level security;
alter table public.member_weeks enable row level security;
alter table public.sessions enable row level security;
alter table public.session_participants enable row level security;

create policy "Users read their own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "Users update their own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Members read their projects" on public.projects
  for select to authenticated using (host_id = (select auth.uid()) or private.is_member(id));
create policy "Users create their own projects" on public.projects
  for insert to authenticated with check (host_id = (select auth.uid()));
create policy "Hosts update their projects" on public.projects
  for update to authenticated using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));
create policy "Hosts delete their projects" on public.projects
  for delete to authenticated using (host_id = (select auth.uid()));

create policy "Members read fellow members" on public.project_members
  for select to authenticated using (private.is_host(project_id) or private.is_member(project_id));
create policy "Hosts update members" on public.project_members
  for update to authenticated
  using (private.is_host(project_id) and role = 'participant')
  with check (private.is_host(project_id) and role = 'participant');

create policy "Hosts manage invitations" on public.invitations
  for all to authenticated
  using (private.is_host(project_id))
  with check (private.is_host(project_id) and created_by = (select auth.uid()));

create policy "Users manage their own rules" on public.availability_rules
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Members read visible availability" on public.availability_entries
  for select to authenticated using (private.can_view_availability(member_id));
create policy "Members add their own availability" on public.availability_entries
  for insert to authenticated with check (private.is_own_member(member_id));
create policy "Members update their own availability" on public.availability_entries
  for update to authenticated
  using (private.is_own_member(member_id))
  with check (private.is_own_member(member_id));
create policy "Members delete their own availability" on public.availability_entries
  for delete to authenticated using (private.is_own_member(member_id));

create policy "Members read week status" on public.member_weeks
  for select to authenticated using (private.shares_project_with_member(member_id));
create policy "Members add their own week status" on public.member_weeks
  for insert to authenticated with check (private.is_own_member(member_id));
create policy "Members update their own week status" on public.member_weeks
  for update to authenticated
  using (private.is_own_member(member_id))
  with check (private.is_own_member(member_id));
create policy "Members delete their own week status" on public.member_weeks
  for delete to authenticated using (private.is_own_member(member_id));

create policy "Members read sessions" on public.sessions
  for select to authenticated using (private.is_host(project_id) or private.is_member(project_id));
create policy "Hosts add sessions" on public.sessions
  for insert to authenticated
  with check (private.is_host(project_id) and created_by = (select auth.uid()));
create policy "Hosts update sessions" on public.sessions
  for update to authenticated
  using (private.is_host(project_id))
  with check (private.is_host(project_id));
create policy "Hosts delete sessions" on public.sessions
  for delete to authenticated using (private.is_host(project_id));

create policy "Members read session participants" on public.session_participants
  for select to authenticated using (private.is_host(project_id) or private.is_member(project_id));
create policy "Hosts add session participants" on public.session_participants
  for insert to authenticated with check (private.is_host(project_id));
create policy "Hosts remove session participants" on public.session_participants
  for delete to authenticated using (private.is_host(project_id));
create policy "Members answer their own sessions" on public.session_participants
  for update to authenticated
  using (private.is_own_member(member_id))
  with check (private.is_own_member(member_id));
