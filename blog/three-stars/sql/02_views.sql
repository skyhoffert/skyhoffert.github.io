-- ### PLAYER WEEK POINTS ###

-- Regular season only. One row per player per week they played.
create or replace view player_week_points as
with stats as (
  select g.season, week_of(g.game_date) as week, s.player_id,
    count(*) as games,
    sum(s.goals) as goals,
    sum(s.assists) as assists,
    sum(s.goals + s.assists) as points,
    sum(s.plus_minus) as plus_minus
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
  coalesce(t.star_points, 0) as star_points
from stats s
left join stars t on t.week = s.week and t.player_id = s.player_id;



-- ### ROSTER WEEK POINTS ###

-- One row per rostered player per league week, with bonuses.
-- Bonus leaders are among players rostered in that league that week; leader stat must be > 0.
create or replace view roster_week_points as
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
    coalesce(pw.star_points, 0) as star_points
  from roster_weeks rw
  join players p on p.id = rw.player_id
  left join player_week_points pw on pw.week = rw.week and pw.player_id = rw.player_id
),
leaders as (
  select league_id, week,
    max(goals) as max_goals,
    max(points) as max_points,
    max(plus_minus) filter (where position <> 'G') as max_pm
  from r
  group by 1, 2
),
flagged as (
  select r.*,
    (l.max_goals > 0 and r.goals = l.max_goals) as goals_leader,
    (l.max_points > 0 and r.points = l.max_points) as points_leader,
    (r.position <> 'G' and l.max_pm > 0 and r.plus_minus = l.max_pm) as pm_leader
  from r
  join leaders l on l.league_id = r.league_id and l.week = r.week
)
select f.*,
  5 * (f.goals_leader::int + f.points_leader::int + f.pm_leader::int) as bonus_points,
  f.star_points + 5 * (f.goals_leader::int + f.points_leader::int + f.pm_leader::int) as total_points
from flagged f;



-- ### TEAM WEEK SCORES ###

create or replace view team_week_scores as
select rp.league_id, rp.week, rp.team_id,
  sum(rp.total_points)::int as total_points,
  sum(rp.star_points)::int as star_points,
  sum(rp.bonus_points)::int as bonus_points,
  sum(rp.firsts)::int as firsts,
  sum(rp.seconds)::int as seconds,
  sum(rp.thirds)::int as thirds,
  rp.week >= l.first_scoring_week as is_scoring,
  rp.week < current_week() as is_final,
  rank() over (partition by rp.league_id, rp.week order by sum(rp.total_points) desc)::int as week_rank
from roster_week_points rp
join leagues l on l.id = rp.league_id
group by rp.league_id, rp.week, rp.team_id, l.first_scoring_week;



-- ### WINNERS & STANDINGS ###

-- W awarded for completed scoring weeks. Ties at the top all get a W. Zero-point weeks award nothing.
create or replace view week_winners as
select league_id, week, team_id, total_points
from team_week_scores
where is_scoring and is_final and week_rank = 1 and total_points > 0;

create or replace view season_standings as
with agg as (
  select t.league_id, t.id as team_id,
    (select count(*) from week_winners w where w.team_id = t.id)::int as wins,
    coalesce((select sum(s.total_points) from team_week_scores s where s.team_id = t.id and s.is_scoring), 0)::int as total_points
  from teams t
)
select agg.*,
  rank() over (partition by league_id order by wins desc, total_points desc)::int as standing
from agg;
