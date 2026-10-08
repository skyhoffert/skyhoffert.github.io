-- ### PLAYER WEEK POINTS ###

-- Regular season only. One row per player per week they played.
create or replace view player_week_points as
with stats as (
  select g.season, week_of(g.game_date) as week, s.player_id,
    count(*) as games,
    sum(s.goals) as goals,
    sum(s.assists) as assists,
    sum(s.goals + s.assists) as points,
    sum(s.plus_minus) as plus_minus,
    sum(s.saves) as saves,
    sum(s.shots_against) as shots_against,
    sum(s.pim) as pim,
    sum(s.fights) as fights
  from player_game_stats s
  join games g on g.id = s.game_id
  where g.game_type = 2
  group by 1, 2, 3
),
stars as (
  select week_of(g.game_date) as week, st.player_id,
    count(*) filter (where st.star = 1) as firsts,
    count(*) filter (where st.star = 2) as seconds,
    count(*) filter (where st.star = 3) as thirds,
    sum(case st.star when 1 then 30 when 2 then 20 else 10 end) as star_points
  from game_stars st
  join games g on g.id = st.game_id
  where g.game_type = 2
  group by 1, 2
)
select s.season, s.week, s.player_id, s.games, s.goals, s.assists, s.points, s.plus_minus,
  coalesce(t.firsts, 0) as firsts,
  coalesce(t.seconds, 0) as seconds,
  coalesce(t.thirds, 0) as thirds,
  coalesce(t.star_points, 0) as star_points,
  s.saves, s.shots_against, s.pim, s.fights
from stats s
left join stars t on t.week = s.week and t.player_id = s.player_id;



-- ### ROSTER WEEK POINTS ###

-- One row per rostered player per league week, with bonuses.
-- Bonus leaders are among players rostered in that league that week; leader stat must be > 0.
-- Columns changed (saves added mid-row); create or replace can't reorder, so rebuild everything downstream.
drop view if exists season_standings, week_winners, team_week_scores, roster_week_points cascade;

create view roster_week_points as
with r as (
  select rw.league_id, rw.week, rw.team_id, rw.player_id, rw.slot, p.position,
    coalesce(pw.games, 0) as games,
    coalesce(pw.goals, 0) as goals,
    coalesce(pw.assists, 0) as assists,
    coalesce(pw.points, 0) as points,
    pw.plus_minus,
    coalesce(pw.firsts, 0) as firsts,
    coalesce(pw.seconds, 0) as seconds,
    coalesce(pw.thirds, 0) as thirds,
    coalesce(pw.star_points, 0) as star_points,
    pw.saves,
    pw.shots_against,
    coalesce(pw.pim, 0) as pim,
    coalesce(pw.fights, 0) as fights,
    -- SV% only counts with 25+ shots against, so a mop-up 5/5 can't take it
    case when pw.shots_against >= 25 then pw.saves::numeric / pw.shots_against end as sv_pct
  from roster_weeks rw
  join players p on p.id = rw.player_id
  left join player_week_points pw on pw.week = rw.week and pw.player_id = rw.player_id
),
leaders as (
  select league_id, week,
    max(goals) as max_goals,
    max(points) as max_points,
    max(plus_minus) filter (where position <> 'G') as max_pm,
    max(pim) as max_pim,
    max(fights) as max_fights,
    max(sv_pct) filter (where position = 'G') as max_sv
  from r
  group by 1, 2
),
flagged as (
  select r.*,
    (l.max_goals > 0 and r.goals = l.max_goals) as goals_leader,
    (l.max_points > 0 and r.points = l.max_points) as points_leader,
    -- coalesce: plus_minus stays null (shown as –) for no games, which would null the totals
    coalesce(r.position <> 'G' and l.max_pm > 0 and r.plus_minus = l.max_pm, false) as pm_leader,
    (l.max_pim > 0 and r.pim = l.max_pim) as pim_leader,
    (l.max_fights > 0 and r.fights = l.max_fights) as fights_leader,
    coalesce(r.position = 'G' and r.sv_pct = l.max_sv, false) as sv_leader
  from r
  join leaders l on l.league_id = r.league_id and l.week = r.week
),
bonus as (
  select f.*,
    5 * (f.goals_leader::int + f.points_leader::int + f.pm_leader::int
       + f.pim_leader::int + f.fights_leader::int + f.sv_leader::int) as bonus_points
  from flagged f
)
select b.*, b.star_points + b.bonus_points as total_points
from bonus b;



-- ### TEAM WEEK SCORES ###

-- week_rank is unique: score, star count, goals, skater +/-, then a stable hash coin flip.
-- sp: 1st 30, 2nd 20, 3rd 10 for scoring weeks with points > 0. Provisional until is_final.
create view team_week_scores as
with agg as (
  select rp.league_id, rp.week, rp.team_id,
    sum(rp.total_points)::int as total_points,
    sum(rp.star_points)::int as star_points,
    sum(rp.bonus_points)::int as bonus_points,
    sum(rp.firsts)::int as firsts,
    sum(rp.seconds)::int as seconds,
    sum(rp.thirds)::int as thirds,
    sum(rp.goals)::int as goals,
    coalesce(sum(rp.plus_minus) filter (where rp.position <> 'G'), 0)::int as plus_minus,
    rp.week >= l.first_scoring_week as is_scoring,
    rp.week < current_week() as is_final
  from roster_week_points rp
  join leagues l on l.id = rp.league_id
  group by rp.league_id, rp.week, rp.team_id, l.first_scoring_week
),
ranked as (
  select agg.*,
    row_number() over (partition by league_id, week
      order by total_points desc, firsts + seconds + thirds desc, goals desc, plus_minus desc,
        md5(week::text || ':' || team_id::text))::int as week_rank
  from agg
)
select ranked.*,
  case when is_scoring and total_points > 0 then
    case week_rank when 1 then 30 when 2 then 20 when 3 then 10 else 0 end
  else 0 end as sp
from ranked;



-- ### STANDINGS ###

-- Final weeks only. place1-3 = weeks finished 1st/2nd/3rd with SP.
create view season_standings as
with agg as (
  select t.league_id, t.id as team_id,
    coalesce(sum(s.sp) filter (where s.is_final), 0)::int as sp,
    count(*) filter (where s.is_final and s.sp = 30)::int as place1,
    count(*) filter (where s.is_final and s.sp = 20)::int as place2,
    count(*) filter (where s.is_final and s.sp = 10)::int as place3,
    coalesce(sum(s.total_points) filter (where s.is_scoring), 0)::int as total_points
  from teams t
  left join team_week_scores s on s.team_id = t.id
  group by t.league_id, t.id
)
select agg.*,
  rank() over (partition by league_id order by sp desc, place1 desc, place2 desc, place3 desc, total_points desc)::int as standing
from agg;
