begin transaction;

truncate games;

insert into games
  select * from games_staging;

commit transaction;