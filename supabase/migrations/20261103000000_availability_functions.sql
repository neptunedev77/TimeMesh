-- Both functions run as the caller, so Row Level Security still decides what they can change.
-- They exist so a replacement is all-or-nothing: a failed save can't leave a week half deleted.

create function public.replace_week_availability(
  p_member_id uuid,
  p_week_start date,
  p_from timestamptz,
  p_to timestamptz,
  p_entries jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.project_members as member
    join public.projects as project on project.id = member.project_id
    where member.id = p_member_id and member.removed_at is null and project.status = 'active'
  ) then
    raise exception 'member cannot edit this project';
  end if;

  delete from public.availability_entries
  where member_id = p_member_id and starts_at >= p_from and starts_at < p_to;

  insert into public.availability_entries (member_id, starts_at, ends_at, kind, source)
  select p_member_id, entry.starts_at, entry.ends_at, entry.kind, entry.source
  from jsonb_to_recordset(p_entries) as entry (
    starts_at timestamptz,
    ends_at timestamptz,
    kind public.availability_kind,
    source public.entry_source
  );

  insert into public.member_weeks (member_id, week_start, confirmed_at)
  values (p_member_id, p_week_start, now())
  on conflict (member_id, week_start) do update set confirmed_at = now();
end;
$$;

create function public.replace_availability_rules(
  p_user_id uuid,
  p_member_id uuid,
  p_rules jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.availability_rules
  where user_id is not distinct from p_user_id and member_id is not distinct from p_member_id;

  insert into public.availability_rules (user_id, member_id, weekday, start_time, end_time, kind)
  select p_user_id, p_member_id, rule.weekday, rule.start_time, rule.end_time, 'available'
  from jsonb_to_recordset(p_rules) as rule (weekday smallint, start_time time, end_time time);
end;
$$;

revoke all on function public.replace_week_availability(uuid, date, timestamptz, timestamptz, jsonb) from public, anon;
revoke all on function public.replace_availability_rules(uuid, uuid, jsonb) from public, anon;
grant execute on function public.replace_week_availability(uuid, date, timestamptz, timestamptz, jsonb) to authenticated, service_role;
grant execute on function public.replace_availability_rules(uuid, uuid, jsonb) to authenticated, service_role;
