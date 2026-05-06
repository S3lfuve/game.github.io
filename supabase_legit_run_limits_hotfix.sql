drop function if exists public.submit_leaderboard_checkpoint(uuid, integer, integer, integer, integer, integer, integer, jsonb);

create or replace function public.submit_leaderboard_checkpoint(
  p_run_id uuid,
  p_score integer,
  p_survival_time integer,
  p_kills integer,
  p_wave integer,
  p_level integer,
  p_exp integer,
  p_build jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tracking record;
  v_previous record;
  v_server_elapsed integer;
  v_delta_time integer;
begin
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  select *
  into v_tracking
  from public.leaderboard_runs_tracking
  where id = p_run_id
  for update;

  if not found or v_tracking.user_id <> v_user_id or v_tracking.status <> 'active' then
    return false;
  end if;

  if p_score is null or p_survival_time is null or p_kills is null or p_wave is null or p_level is null or p_exp is null then
    return public.reject_leaderboard_run(p_run_id, v_user_id, null, 'invalid_payload', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if p_score < 0 or p_survival_time < 10 or p_survival_time > 3600 or p_kills < 0 or p_wave < 1 or p_level < 1 or p_level > 100 or p_exp < 0 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, null, 'invalid_payload', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  v_server_elapsed := greatest(0, floor(extract(epoch from now() - v_tracking.started_at))::integer);

  if p_survival_time > v_server_elapsed + 5 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, null, 'time_exceeds_server_elapsed', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if p_wave > floor(p_survival_time / 10.0)::integer + 5 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, null, 'wave_too_high', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if p_kills > p_survival_time * 13 + 320 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, null, 'kills_too_high', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if p_exp > p_survival_time * 180 + 5000 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, null, 'exp_too_high', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if p_level > floor(p_survival_time / 10.0)::integer + 8 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, null, 'level_too_high', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if p_exp < public.leaderboard_min_total_exp_for_level(p_level) - 37
    or p_exp >= public.leaderboard_min_total_exp_for_level(p_level + 1) + 173 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, null, 'exp_level_mismatch', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if p_score > 150000 or p_score > p_survival_time * 225 + 3000 or abs(p_score - p_exp) > 5 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, null, 'score_too_high', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if not public.validate_leaderboard_build(p_build, p_level) then
    return public.reject_leaderboard_run(p_run_id, v_user_id, null, 'invalid_build', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  select *
  into v_previous
  from public.leaderboard_run_checkpoints
  where run_id = p_run_id
  order by survival_time desc, created_at desc
  limit 1;

  if found then
    if p_survival_time <= v_previous.survival_time or p_kills < v_previous.kills or p_exp < v_previous.exp or p_score < v_previous.score or p_wave < v_previous.wave or p_level < v_previous.level then
      return false;
    end if;

    v_delta_time := greatest(1, p_survival_time - v_previous.survival_time);

    if p_kills - v_previous.kills > v_delta_time * 16 + 240
      or p_exp - v_previous.exp > v_delta_time * 600 + 8000
      or p_score - v_previous.score > v_delta_time * 600 + 8000
      or p_level - v_previous.level > ceil(v_delta_time / 10.0)::integer + 8
      or p_wave - v_previous.wave > floor(v_delta_time / 10.0)::integer + 4
    then
      return public.reject_leaderboard_run(p_run_id, v_user_id, null, 'checkpoint_jump_too_large', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
    end if;
  end if;

  insert into public.leaderboard_run_checkpoints (
    run_id,
    user_id,
    survival_time,
    score,
    kills,
    wave,
    level,
    exp,
    build_state
  )
  values (
    p_run_id,
    v_user_id,
    p_survival_time,
    p_score,
    p_kills,
    p_wave,
    p_level,
    p_exp,
    coalesce(p_build, '{}'::jsonb)
  );

  return true;
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
  p_device_type text,
  p_build jsonb
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
  v_last_checkpoint record;
  v_server_elapsed integer;
  v_score integer;
  v_delta_time integer;
begin
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  if p_run_id is null then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'missing_run_id', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  select *
  into v_tracking
  from public.leaderboard_runs_tracking
  where id = p_run_id
  for update;

  if not found then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'run_not_found', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if v_tracking.user_id <> v_user_id then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'run_wrong_user', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if v_tracking.status = 'submitted' then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'run_already_submitted', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if v_tracking.status <> 'active' then
    return true;
  end if;

  if v_player_name !~ '^[A-Za-zА-Яа-яЁё0-9_-]{3,16}$' then
    return public.reject_leaderboard_run(p_run_id, v_user_id, null, 'invalid_player_name', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if p_score is null or p_survival_time is null or p_kills is null or p_wave is null or p_level is null or p_exp is null then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'invalid_payload', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if p_score < 0 or p_survival_time < 10 or p_kills < 0 or p_wave < 1 or p_level < 1 or p_exp < 0 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'time_too_low', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if p_survival_time > 3600 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'time_too_high', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if p_level > 100 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'level_too_high', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  v_server_elapsed := greatest(0, floor(extract(epoch from now() - v_tracking.started_at))::integer);

  if p_survival_time > v_server_elapsed + 5 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'time_exceeds_server_elapsed', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if p_wave > floor(p_survival_time / 10.0)::integer + 5 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'wave_too_high', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if p_kills > p_survival_time * 13 + 320 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'kills_too_high', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if p_exp > p_survival_time * 180 + 5000 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'exp_too_high', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if p_level > floor(p_survival_time / 10.0)::integer + 8 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'level_too_high', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if p_exp < public.leaderboard_min_total_exp_for_level(p_level) - 37
    or p_exp >= public.leaderboard_min_total_exp_for_level(p_level + 1) + 173 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'exp_level_mismatch', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if p_score > 150000 or p_score > p_survival_time * 225 + 3000 or abs(p_score - p_exp) > 5 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'score_too_high', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if not public.validate_leaderboard_build(p_build, p_level) then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'invalid_build', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  select *
  into v_last_checkpoint
  from public.leaderboard_run_checkpoints
  where run_id = p_run_id
  order by survival_time desc, created_at desc
  limit 1;

  if not found and p_survival_time >= 75 then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'missing_checkpoints', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
  end if;

  if found then
    if p_survival_time < v_last_checkpoint.survival_time or p_kills < v_last_checkpoint.kills or p_exp < v_last_checkpoint.exp or p_score < v_last_checkpoint.score or p_wave < v_last_checkpoint.wave or p_level < v_last_checkpoint.level then
      return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'checkpoint_jump_too_large', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
    end if;

    v_delta_time := greatest(1, p_survival_time - v_last_checkpoint.survival_time);

    if p_kills - v_last_checkpoint.kills > v_delta_time * 16 + 240
      or p_exp - v_last_checkpoint.exp > v_delta_time * 600 + 8000
      or p_score - v_last_checkpoint.score > v_delta_time * 600 + 8000
      or p_level - v_last_checkpoint.level > ceil(v_delta_time / 10.0)::integer + 8
      or p_wave - v_last_checkpoint.wave > floor(v_delta_time / 10.0)::integer + 4
    then
      return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'checkpoint_jump_too_large', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
    end if;
  end if;

  select greatest(created_at, updated_at)
  into v_recent
  from public.leaderboard_runs
  where user_id = v_user_id
  order by greatest(created_at, updated_at) desc
  limit 1;

  if v_recent is not null and v_recent > now() - interval '15 seconds' then
    return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'cooldown', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
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
      return public.reject_leaderboard_run(p_run_id, v_user_id, v_player_name, 'nickname_taken', p_score, p_survival_time, p_kills, p_wave, p_level, p_exp, p_build);
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
      build_state = p_build,
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
      device_type,
      build_state
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
      case when p_device_type = 'mobile' then 'mobile' else 'desktop' end,
      coalesce(p_build, '{}'::jsonb)
    );
  end if;

  update public.leaderboard_runs_tracking
  set status = 'submitted',
      submitted_at = now()
  where id = p_run_id;

  return true;
end;
$$;


notify pgrst, 'reload schema';

