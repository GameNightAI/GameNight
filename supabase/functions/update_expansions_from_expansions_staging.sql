begin transaction;

truncate expansions;

insert into expansions
  select * from expansions_staging;

commit transaction;