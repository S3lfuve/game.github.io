create extension if not exists pgcrypto;

create table if not exists public.leaderboard_runs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid unique,
  user_id uuid not null,
  player_name text not null,
  score integer not null,
  survival_time integer not null,
  kills integer not null,
  wave integer not null,
  level integer not null,
  exp integer not null,
  device_type text not null default 'desktop',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leaderboard_runs add column if not exists run_id uuid;
alter table public.leaderboard_runs add column if not exists updated_at timestamptz not null default now();

create table if not exists public.leaderboard_runs_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint leaderboard_runs_tracking_status_check check (status in ('active', 'submitted', 'rejected'))
);

create table if not exists public.leaderboard_rejected_runs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid,
  user_id uuid,
  player_name text,
  reason text not null,
  reported_score integer,
  reported_time integer,
  reported_kills integer,
  reported_wave integer,
  reported_level integer,
  reported_exp integer,
  created_at timestamptz not null default now()
);

alter table public.leaderboard_runs alter column player_name type text;
alter table public.leaderboard_rejected_runs alter column player_name type text;

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.leaderboard_runs'::regclass
      and contype = 'c'
      and (
        pg_get_constraintdef(oid) ilike '%player_name%'
        or pg_get_constraintdef(oid) ilike '%char_length%'
        or pg_get_constraintdef(oid) ilike '%length%'
      )
  loop
    execute format('alter table public.leaderboard_runs drop constraint if exists %I', v_constraint.conname);
  end loop;

  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.leaderboard_rejected_runs'::regclass
      and contype = 'c'
      and (
        pg_get_constraintdef(oid) ilike '%player_name%'
        or pg_get_constraintdef(oid) ilike '%char_length%'
        or pg_get_constraintdef(oid) ilike '%length%'
      )
  loop
    execute format('alter table public.leaderboard_rejected_runs drop constraint if exists %I', v_constraint.conname);
  end loop;
end;
$$;

drop table if exists public.leaderboard_names;

create or replace function public.normalize_leaderboard_name(p_name text)
returns text
language sql
immutable
as $$
  select translate(
    trim(coalesce(p_name, '')),
    'ABCDEFGHIJKLMNOPQRSTUVWXYZАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',
    'abcdefghijklmnopqrstuvwxyzабвгдеёжзийклмнопрстуфхцчшщъыьэюя'
  )
$$;

create index if not exists leaderboard_runs_score_idx on public.leaderboard_runs (score desc, created_at desc);
create index if not exists leaderboard_runs_time_idx on public.leaderboard_runs (survival_time desc, created_at desc);
create index if not exists leaderboard_runs_kills_idx on public.leaderboard_runs (kills desc, created_at desc);
create index if not exists leaderboard_runs_user_idx on public.leaderboard_runs (user_id, created_at desc);
create index if not exists leaderboard_runs_name_normalized_idx on public.leaderboard_runs (public.normalize_leaderboard_name(player_name), created_at asc);
create unique index if not exists leaderboard_runs_run_id_idx on public.leaderboard_runs (run_id) where run_id is not null;
create index if not exists leaderboard_runs_tracking_user_idx on public.leaderboard_runs_tracking (user_id, created_at desc);
create index if not exists leaderboard_runs_tracking_status_idx on public.leaderboard_runs_tracking (status, created_at desc);
create index if not exists leaderboard_rejected_runs_user_idx on public.leaderboard_rejected_runs (user_id, created_at desc);

alter table public.leaderboard_runs enable row level security;
alter table public.leaderboard_runs_tracking enable row level security;
alter table public.leaderboard_rejected_runs enable row level security;

drop policy if exists leaderboard_runs_deny_select on public.leaderboard_runs;
drop policy if exists leaderboard_runs_deny_insert on public.leaderboard_runs;
drop policy if exists leaderboard_runs_deny_update on public.leaderboard_runs;
drop policy if exists leaderboard_runs_deny_delete on public.leaderboard_runs;
drop policy if exists leaderboard_runs_tracking_deny_select on public.leaderboard_runs_tracking;
drop policy if exists leaderboard_runs_tracking_deny_insert on public.leaderboard_runs_tracking;
drop policy if exists leaderboard_runs_tracking_deny_update on public.leaderboard_runs_tracking;
drop policy if exists leaderboard_runs_tracking_deny_delete on public.leaderboard_runs_tracking;
drop policy if exists leaderboard_rejected_runs_deny_select on public.leaderboard_rejected_runs;
drop policy if exists leaderboard_rejected_runs_deny_insert on public.leaderboard_rejected_runs;
drop policy if exists leaderboard_rejected_runs_deny_update on public.leaderboard_rejected_runs;
drop policy if exists leaderboard_rejected_runs_deny_delete on public.leaderboard_rejected_runs;

create policy leaderboard_runs_deny_select on public.leaderboard_runs for select to anon, authenticated using (false);
create policy leaderboard_runs_deny_insert on public.leaderboard_runs for insert to anon, authenticated with check (false);
create policy leaderboard_runs_deny_update on public.leaderboard_runs for update to anon, authenticated using (false) with check (false);
create policy leaderboard_runs_deny_delete on public.leaderboard_runs for delete to anon, authenticated using (false);
create policy leaderboard_runs_tracking_deny_select on public.leaderboard_runs_tracking for select to anon, authenticated using (false);
create policy leaderboard_runs_tracking_deny_insert on public.leaderboard_runs_tracking for insert to anon, authenticated with check (false);
create policy leaderboard_runs_tracking_deny_update on public.leaderboard_runs_tracking for update to anon, authenticated using (false) with check (false);
create policy leaderboard_runs_tracking_deny_delete on public.leaderboard_runs_tracking for delete to anon, authenticated using (false);
create policy leaderboard_rejected_runs_deny_select on public.leaderboard_rejected_runs for select to anon, authenticated using (false);
create policy leaderboard_rejected_runs_deny_insert on public.leaderboard_rejected_runs for insert to anon, authenticated with check (false);
create policy leaderboard_rejected_runs_deny_update on public.leaderboard_rejected_runs for update to anon, authenticated using (false) with check (false);
create policy leaderboard_rejected_runs_deny_delete on public.leaderboard_rejected_runs for delete to anon, authenticated using (false);

drop function if exists public.start_leaderboard_run();

create or replace function public.start_leaderboard_run()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_run_id uuid;
  v_recent_starts integer;
begin
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  select count(*)
  into v_recent_starts
  from public.leaderboard_runs_tracking
  where user_id = v_user_id
    and created_at > now() - interval '1 minute';

  if v_recent_starts >= 6 then
    raise exception 'start_cooldown' using errcode = 'P0001';
  end if;

  insert into public.leaderboard_runs_tracking (user_id)
  values (v_user_id)
  returning id into v_run_id;

  return v_run_id;
end;
$$;

create or replace function public.reject_leaderboard_run(
  p_run_id uuid,
  p_user_id uuid,
  p_player_name text,
  p_reason text,
  p_score integer,
  p_survival_time integer,
  p_kills integer,
  p_wave integer,
  p_level integer,
  p_exp integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.leaderboard_rejected_runs (
    run_id,
    user_id,
    player_name,
    reason,
    reported_score,
    reported_time,
    reported_kills,
    reported_wave,
    reported_level,
    reported_exp
  )
  values (
    p_run_id,
    p_user_id,
    p_player_name,
    p_reason,
    p_score,
    p_survival_time,
    p_kills,
    p_wave,
    p_level,
    p_exp
  );

  update public.leaderboard_runs_tracking
  set status = 'rejected',
      submitted_at = now()
  where id = p_run_id
    and status = 'active';

  return false;
end;
$$;

do $$
declare
  v_function record;
begin
  for v_function in
    select oid::regprocedure::text as signature
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'submit_leaderboard_run'
  loop
    execute format('drop function if exists %s', v_function.signature);
  end loop;
end;
$$;

create or replace function public.submit_leaderboard_run(
  p_run_id uuid,
  p_player_name text,
  p_score integer,
  p_survival_time integer,
  p_kills integer,
  p_wave integer,
  p_level integer,
  p_exp integer,
  p_device_type text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player_name text := trim(coalesce(p_player_name, ''));
  v_player_name_normalized text := public.normalize_leaderboard_name(p_player_name);
  v_insert_player_name text := v_player_name;
  v_owner record;
  v_recent timestamptz;
  v_tracking record;
  v_server_elapsed integer;
  v_score integer;
  v_max_score integer;
begin
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  if p_run_id is null then
    raise exception 'invalid_run_id' using errcode = 'P0001';
  end if;

  select *
  into v_tracking
  from public.leaderboard_runs_tracking
  where id = p_run_id
  for update;

  if not found or v_tracking.user_id <> v_user_id then
    raise exception 'invalid_run_id' using errcode = 'P0001';
  end if;

  if v_tracking.status = 'submitted' then
    raise exception 'run_already_submitted' using errcode = 'P0001';
  end if;

  if v_tracking.status <> 'active' then
    raise exception 'run_not_active' using errcode = 'P0001';
  end if;

  if v_player_name !~ '^[A-Za-zА-Яа-яЁё0-9_-]{3,16}$' then
    raise exception 'invalid_player_name' using errcode = 'P0001';
  end if;

  if p_score is null or p_survival_time is null or p_kills is null or p_wave is null or p_level is null or p_exp is null then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'missing_values', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp);
  end if;

  if p_score < 0 or p_survival_time < 10 or p_survival_time > 3600 or p_kills < 0 or p_wave < 1 or p_level < 1 or p_level > 100 or p_exp < 0 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'invalid_ranges', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp);
  end if;

  v_server_elapsed := greatest(0, floor(extract(epoch from now() - v_tracking.started_at))::integer);

  if p_survival_time > v_server_elapsed + 5 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'invalid_elapsed_time', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp);
  end if;

  if p_wave > floor(p_survival_time / 10.0)::integer + 5 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'invalid_wave', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp);
  end if;

  if p_kills > p_survival_time * 8 + 80 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'invalid_kills', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp);
  end if;

  if p_exp > p_survival_time * 60 + 500 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'invalid_exp', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp);
  end if;

  v_max_score := least(50000, p_survival_time * 45 + p_kills * 20 + p_wave * 120 + p_level * 80 + 500);

  if p_score > 50000 or p_score > v_max_score or abs(p_score - p_exp) > 5 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'invalid_score', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp);
  end if;

  select greatest(created_at, updated_at)
  into v_recent
  from public.leaderboard_runs
  where user_id = v_user_id
  order by greatest(created_at, updated_at) desc
  limit 1;

  if v_recent is not null and v_recent > now() - interval '15 seconds' then
    raise exception 'submit_cooldown' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_player_name_normalized)::bigint);

  select *
  into v_owner
  from public.leaderboard_runs
  where public.normalize_leaderboard_name(player_name) = v_player_name_normalized
  order by created_at asc, id asc
  limit 1;

  if found then
    if v_owner.user_id <> v_user_id or v_owner.player_name <> v_player_name then
      raise exception 'nickname_taken' using errcode = 'P0001';
    end if;
    v_insert_player_name := v_owner.player_name;
  end if;

  v_score := p_exp;

  if found then
    update public.leaderboard_runs
    set
      run_id = case
        when v_score > score or p_survival_time > survival_time or p_kills > kills or p_wave > wave or p_level > level or p_exp > exp then p_run_id
        else run_id
      end,
      score = greatest(score, v_score),
      survival_time = greatest(survival_time, p_survival_time),
      kills = greatest(kills, p_kills),
      wave = greatest(wave, p_wave),
      level = greatest(level, p_level),
      exp = greatest(exp, p_exp),
      device_type = case when p_device_type = 'mobile' then 'mobile' else 'desktop' end,
      created_at = case
        when v_score > score or p_survival_time > survival_time or p_kills > kills or p_wave > wave or p_level > level or p_exp > exp then now()
        else created_at
      end,
      updated_at = now()
    where id = v_owner.id;
  else
    insert into public.leaderboard_runs (
      run_id,
      user_id,
      player_name,
      score,
      survival_time,
      kills,
      wave,
      level,
      exp,
      device_type
    )
    values (
      p_run_id,
      v_user_id,
      v_insert_player_name,
      v_score,
      p_survival_time,
      p_kills,
      p_wave,
      p_level,
      p_exp,
      case when p_device_type = 'mobile' then 'mobile' else 'desktop' end
    );
  end if;

  update public.leaderboard_runs_tracking
  set status = 'submitted',
      submitted_at = now()
  where id = p_run_id;

  return true;
end;
$$;

create or replace function public.get_leaderboard_top(p_category text)
returns table (
  rank_position bigint,
  player_name text,
  value integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category text := case when p_category in ('score', 'time', 'kills') then p_category else 'score' end;
begin
  return query
  select
    row_number() over (order by best.value desc, best.created_at desc, best.id desc) as rank_position,
    best.player_name,
    best.value
  from (
    select named.id, named.player_name, named.value, named.created_at
    from (
      select source.*,
        row_number() over (
          partition by source.name_key
          order by source.value desc, source.created_at desc, source.id desc
        ) as name_rank
      from (
        select
          id,
          player_name,
          created_at,
          public.normalize_leaderboard_name(player_name) as name_key,
          case
            when v_category = 'time' then survival_time
            when v_category = 'kills' then kills
            else score
          end as value
        from public.leaderboard_runs
      ) source
    ) named
    where named.name_rank = 1
  ) best
  order by best.value desc, best.created_at desc, best.id desc
  limit 10;
end;
$$;

drop function if exists public.get_leaderboard_player_rank(text);
drop function if exists public.get_leaderboard_player_rank(text, uuid);

create or replace function public.get_leaderboard_player_rank(p_category text)
returns table (
  rank_position bigint,
  player_name text,
  value integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_category text := case when p_category in ('score', 'time', 'kills') then p_category else 'score' end;
begin
  if v_user_id is null then
    return;
  end if;

  return query
  select ranked.rank_position, ranked.player_name, ranked.value
  from (
    select
      row_number() over (order by best.value desc, best.created_at desc, best.id desc) as rank_position,
      best.user_id,
      best.player_name,
      best.value
    from (
      select named.id, named.user_id, named.player_name, named.value, named.created_at
      from (
        select source.*,
          row_number() over (
            partition by source.name_key
            order by source.value desc, source.created_at desc, source.id desc
          ) as name_rank
        from (
          select
            id,
            user_id,
            player_name,
            created_at,
            public.normalize_leaderboard_name(player_name) as name_key,
            case
              when v_category = 'time' then survival_time
              when v_category = 'kills' then kills
              else score
            end as value
          from public.leaderboard_runs
        ) source
      ) named
      where named.name_rank = 1
    ) best
  ) ranked
  where ranked.user_id = v_user_id
  order by ranked.rank_position
  limit 1;
end;
$$;

revoke all on public.leaderboard_runs from anon, authenticated;
revoke all on public.leaderboard_runs_tracking from anon, authenticated;
revoke all on public.leaderboard_rejected_runs from anon, authenticated;
revoke execute on function public.reject_leaderboard_run(uuid, uuid, text, text, integer, integer, integer, integer, integer, integer) from public;
revoke execute on function public.reject_leaderboard_run(uuid, uuid, text, text, integer, integer, integer, integer, integer, integer) from anon, authenticated;
grant execute on function public.start_leaderboard_run() to anon, authenticated;
grant execute on function public.submit_leaderboard_run(uuid, text, integer, integer, integer, integer, integer, integer, text) to anon, authenticated;
grant execute on function public.get_leaderboard_top(text) to anon, authenticated;
grant execute on function public.get_leaderboard_player_rank(text) to anon, authenticated;
select pg_notify('pgrst', 'reload schema');
