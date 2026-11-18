
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null
);
create table criteria (
  id serial primary key,
  name text not null,
  description text,
  position int default 0
);
create table lunches (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references profiles,
  held_on date not null,
  title text,
  menu text,
  created_at timestamptz default now()
);
create table ratings (
  lunch_id uuid references lunches on delete cascade,
  user_id uuid references profiles,
  criterion_id int references criteria,
  score smallint not null check (score between 1 and 5),
  primary key (lunch_id, user_id, criterion_id)
);

create view lunch_scores with (security_invoker = true) as
select l.id, l.title, l.held_on, l.host_id, p.display_name as host_name,
       round(avg(r.score), 2) as avg_score,
       count(distinct r.user_id) as voters
from lunches l
join profiles p on p.id = l.host_id
left join ratings r on r.lunch_id = l.id
group by l.id, p.display_name;

alter table profiles enable row level security;
alter table criteria enable row level security;
alter table lunches  enable row level security;
alter table ratings  enable row level security;

create policy "leer perfiles" on profiles for select to authenticated using (true);
create policy "crear mi perfil" on profiles for insert to authenticated with check (id = auth.uid());
create policy "editar mi perfil" on profiles for update to authenticated using (id = auth.uid());

create policy "leer rúbrica" on criteria for select to authenticated using (true);

create policy "leer almuerzos" on lunches for select to authenticated using (true);
create policy "crear mis almuerzos" on lunches for insert to authenticated with check (host_id = auth.uid());
create policy "editar mis almuerzos" on lunches for update to authenticated using (host_id = auth.uid());
create policy "borrar mis almuerzos" on lunches for delete to authenticated using (host_id = auth.uid());

create policy "leer valoraciones" on ratings for select to authenticated using (true);
create policy "valorar (no tu almuerzo)" on ratings for insert to authenticated
  with check (user_id = auth.uid()
    and not exists (select 1 from lunches l where l.id = lunch_id and l.host_id = auth.uid()));
create policy "editar mi valoración" on ratings for update to authenticated using (user_id = auth.uid());

insert into criteria (name, description, position) values
  ('Comida', 'Sabor y punto de cocción', 1),
  ('Cantidad', 'Ni hambre ni empacho', 2),
  ('Presentación', 'Cómo llega al plato y a la mesa', 3),
  ('Ambiente', 'Mesa, música, conversación', 4),
  ('Postre y café', 'El cierre cuenta', 5);
