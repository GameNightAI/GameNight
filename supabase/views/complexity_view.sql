create view complexity_view as
  select
    max_tiers.id,
    coalesce(min_tiers.max_complexity, 0.99) as min_complexity,
    max_tiers.max_complexity,
    max_tiers.description,
    max_tiers.created_at
  from
    complexity_tiers as max_tiers
    left join complexity_tiers as min_tiers
      on max_tiers.id = min_tiers.id + 1
  order by
    max_tiers.id