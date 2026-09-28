-- Rewards are server-owned. Existing ranks establish a baseline, never a payout.
create table public.banners_catalogo (
  id text primary key,
  nombre text not null,
  rareza text not null check (rareza in ('comun','rara','epica','legendaria','exclusiva')),
  precio integer not null check (precio >= 0),
  exclusivo boolean not null default false
);
insert into public.banners_catalogo values
 ('carbon','Carbon', 'comun',0,false), ('jade','Jade', 'comun',0,false), ('carmesi','Carmesi','comun',0,false),
 ('circuito','Circuito nocturno','rara',90,false), ('art-deco','Salon dorado','rara',90,false), ('damero','Ultima vuelta','rara',90,false),
 ('aurora','Aurora polar','epica',220,false), ('ascuas','Ascuas del After','epica',220,false), ('tormenta','Pulso electrico','epica',220,false),
 ('dragon','Guardian de jade','legendaria',500,false), ('observatorio','Observatorio astral','legendaria',500,false),
 ('campeon','Campeon de temporada','exclusiva',0,true);

create table public.banners_usuario (
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  banner_id text not null references public.banners_catalogo(id),
  obtenido_en timestamptz not null default now(),
  primary key (usuario_id,banner_id)
);
create table public.banner_equipado (
  usuario_id uuid primary key references public.perfiles(id) on delete cascade,
  banner_id text not null references public.banners_catalogo(id)
);
create table public.liga_progreso (
  temporada_id uuid not null references public.temporadas(id) on delete cascade,
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  max_pl integer not null default 0,
  primary key (temporada_id,usuario_id)
);
create table public.liga_premios (
  temporada_id uuid not null references public.temporadas(id) on delete cascade,
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  motivo text not null,
  cofre text check(cofre in ('comun','epico','legendario')),
  chapas integer not null default 0,
  entregado_en timestamptz not null default now(),
  primary key (temporada_id,usuario_id,motivo)
);
create index liga_premios_usuario on public.liga_premios(usuario_id,entregado_en desc);
create table public.liga_historial (
  temporada_id uuid not null references public.temporadas(id) on delete cascade,
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  sala_id uuid not null references public.salas(id) on delete cascade,
  sala_nombre text not null,
  temporada_nombre text not null,
  posicion integer not null,
  pl integer not null,
  max_pl integer not null,
  noches integer not null,
  competitivo boolean not null,
  cerrado_en timestamptz not null default now(),
  primary key (temporada_id,usuario_id)
);
create index liga_historial_usuario on public.liga_historial(usuario_id,cerrado_en desc);
create table public.titulos_liga (
 usuario_id uuid not null references public.perfiles(id) on delete cascade,
 titulo text not null,
 primary key(usuario_id,titulo)
);
alter table public.titulos_liga enable row level security;
revoke all on public.titulos_liga from public,anon,authenticated;
grant select on public.titulos_liga to authenticated;
create policy titulos_propios on public.titulos_liga for select to authenticated using(usuario_id=(select auth.uid()));

alter table public.banners_catalogo enable row level security;
alter table public.banners_usuario enable row level security;
alter table public.banner_equipado enable row level security;
alter table public.liga_progreso enable row level security;
alter table public.liga_premios enable row level security;
alter table public.liga_historial enable row level security;
revoke all on public.banners_catalogo,public.banners_usuario,public.banner_equipado,
 public.liga_progreso,public.liga_premios,public.liga_historial from public,anon,authenticated;
grant select on public.banners_catalogo,public.banners_usuario,public.banner_equipado,
 public.liga_progreso,public.liga_premios,public.liga_historial to authenticated;
create policy catalogo_visible on public.banners_catalogo for select to authenticated using(true);
create policy banners_propios on public.banners_usuario for select to authenticated using(usuario_id=(select auth.uid()));
create policy banner_visible on public.banner_equipado for select to authenticated using(true);
create policy progreso_propio on public.liga_progreso for select to authenticated using(usuario_id=(select auth.uid()));
create policy premios_propios on public.liga_premios for select to authenticated using(usuario_id=(select auth.uid()));
create policy historial_visible on public.liga_historial for select to authenticated
 using(usuario_id=(select auth.uid()) or public.es_miembro(sala_id));

create function public.elegir_banner(p_banner text) returns void
language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_item banners_catalogo; v_p perfiles; v_pl bigint; v_saldo bigint;
begin
 if v_uid is null then raise exception 'No autenticado'; end if;
 select * into v_item from banners_catalogo where id=p_banner;
 if not found then raise exception 'Banner no encontrado'; end if;
 select * into v_p from perfiles where id=v_uid for update;
 if not found then raise exception 'Perfil no encontrado'; end if;
 if not exists(select 1 from banners_usuario where usuario_id=v_uid and banner_id=p_banner) then
   if v_item.exclusivo then raise exception 'Este banner se gana al terminar una temporada competitiva'; end if;
   select coalesce(sum(pl_ganados),0) into v_pl from noche_jugadores where usuario_id=v_uid;
   v_saldo:=floor(v_p.xp/50.0)+floor(v_pl/10.0)
      +coalesce((v_p.avatar_config#>>'{tienda,bonus}')::int,0)
      -coalesce((v_p.avatar_config#>>'{tienda,gastadas}')::int,0);
   if v_item.precio>greatest(0,v_saldo) then raise exception 'No tienes suficientes chapas'; end if;
   if v_item.precio>0 then
     update perfiles set avatar_config=jsonb_set(coalesce(avatar_config,'{}') ||
       jsonb_build_object('tienda',coalesce(avatar_config->'tienda','{}')),
       '{tienda,gastadas}',to_jsonb(coalesce((avatar_config#>>'{tienda,gastadas}')::int,0)+v_item.precio)) where id=v_uid;
   end if;
   insert into banners_usuario(usuario_id,banner_id) values(v_uid,p_banner);
 end if;
 insert into banner_equipado values(v_uid,p_banner)
 on conflict(usuario_id) do update set banner_id=excluded.banner_id;
end $$;
revoke all on function public.elegir_banner(text) from public,anon;
grant execute on function public.elegir_banner(text) to authenticated;

-- Internal helpers have no callable client grant.
create function public.entregar_premio_liga(p_temporada uuid,p_usuario uuid,p_motivo text,p_cofre text,p_chapas int)
returns void language plpgsql security definer set search_path=public as $$
begin
 insert into liga_premios(temporada_id,usuario_id,motivo,cofre,chapas)
 values(p_temporada,p_usuario,p_motivo,p_cofre,p_chapas) on conflict do nothing;
 if not found then return; end if;
 if p_cofre is not null then
   update perfiles set avatar_config=jsonb_set(coalesce(avatar_config,'{}') ||
    jsonb_build_object('inventario',coalesce(avatar_config->'inventario','{}') ||
     jsonb_build_object('cofres',coalesce(avatar_config#>'{inventario,cofres}','{}'))),
    array['inventario','cofres',p_cofre],
    to_jsonb(coalesce((avatar_config#>>array['inventario','cofres',p_cofre])::int,0)+1)) where id=p_usuario;
 end if;
 if p_chapas>0 then
   update perfiles set avatar_config=jsonb_set(coalesce(avatar_config,'{}') ||
    jsonb_build_object('tienda',coalesce(avatar_config->'tienda','{}')),
    '{tienda,bonus}',to_jsonb(coalesce((avatar_config#>>'{tienda,bonus}')::int,0)+p_chapas)) where id=p_usuario;
 end if;
end $$;
revoke all on function public.entregar_premio_liga(uuid,uuid,text,text,int) from public,anon,authenticated;

insert into public.liga_progreso select temporada_id,usuario_id,greatest(0,pl) from public.liga;

create function public.registrar_ascenso_liga() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_anterior int; v_hito record;
begin
 if not exists(select 1 from temporadas where id=new.temporada_id and estado='activa') then return new; end if;
 insert into liga_progreso values(new.temporada_id,new.usuario_id,0) on conflict do nothing;
 select max_pl into v_anterior from liga_progreso
 where temporada_id=new.temporada_id and usuario_id=new.usuario_id for update;
 if new.pl<=v_anterior then return new; end if;
 update liga_progreso set max_pl=new.pl where temporada_id=new.temporada_id and usuario_id=new.usuario_id;
 for v_hito in select * from (values
   (50,'plata','comun',0),(125,'oro','comun',30),(170,'platino','epico',0),
   (230,'diamante','epico',60),(320,'maestro','legendario',0),(450,'gran-maestro','legendario',100)
 ) as h(pl,id,cofre,chapas) where pl>v_anterior and pl<=new.pl loop
   perform entregar_premio_liga(new.temporada_id,new.usuario_id,'ascenso:'||v_hito.id,v_hito.cofre,v_hito.chapas);
   if v_hito.id='gran-maestro' then
    insert into titulos_liga values(new.usuario_id,'Leyenda del After') on conflict do nothing;
   end if;
 end loop;
 return new;
end $$;
revoke all on function public.registrar_ascenso_liga() from public,anon,authenticated;
create trigger liga_registrar_ascenso after insert or update of pl on public.liga
 for each row execute function public.registrar_ascenso_liga();

create function public.premiar_cierre_liga() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_jugador record; v_competitiva boolean; v_noches int; v_participantes int; v_nombre text; v_cofre text;
begin
 if old.estado<>'activa' or new.estado<>'cerrada' then return new; end if;
 select nombre into v_nombre from salas where id=new.sala_id;
 select count(distinct (n.inicio at time zone 'Europe/Madrid')::date),count(distinct nj.usuario_id)
 into v_noches,v_participantes from noches n join noche_jugadores nj on nj.noche_id=n.id
 where n.temporada_id=new.id and n.estado='cerrada';
 v_competitiva:=v_noches>=4 and v_participantes>=3 and new.fin-new.inicio>=interval '7 days';
 for v_jugador in
  select l.usuario_id,l.pl,rank() over(order by l.pl desc)::int as posicion,
    greatest(l.pl,coalesce(lp.max_pl,0)) as max_pl,
    (select count(distinct n.id)::int from noche_jugadores nj join noches n on n.id=nj.noche_id
      where nj.usuario_id=l.usuario_id and n.temporada_id=new.id and n.estado='cerrada') as noches
  from liga l left join liga_progreso lp using(temporada_id,usuario_id)
  where l.temporada_id=new.id order by l.usuario_id
 loop
  insert into liga_historial(temporada_id,usuario_id,sala_id,sala_nombre,temporada_nombre,posicion,pl,max_pl,noches,competitivo)
   values(new.id,v_jugador.usuario_id,new.sala_id,v_nombre,new.nombre,v_jugador.posicion,v_jugador.pl,v_jugador.max_pl,v_jugador.noches,v_competitiva)
   on conflict do nothing;
  if not found or v_jugador.noches=0 then continue; end if;
  -- At least four distinct play dates before any end-season payout, even outside a competitive room.
  if v_noches<4 or new.fin-new.inicio<interval '7 days' then continue; end if;
  v_cofre:=case when v_jugador.max_pl>=320 then 'legendario' when v_jugador.max_pl>=170 then 'epico' else 'comun' end;
  perform entregar_premio_liga(new.id,v_jugador.usuario_id,'cierre:division',v_cofre,0);
  if v_competitiva and v_jugador.posicion<=3 and v_jugador.noches>=2 then
   perform entregar_premio_liga(new.id,v_jugador.usuario_id,'cierre:podio',
     case when v_jugador.posicion=1 then 'legendario' else 'epico' end,
     case when v_jugador.posicion=1 then 150 when v_jugador.posicion=2 then 75 else 40 end);
   -- Tied leaders share podium rewards, but there is no unique champion cosmetic.
   if v_jugador.posicion=1 and (select count(*) from liga where temporada_id=new.id and pl=v_jugador.pl)=1 then
    insert into banners_usuario(usuario_id,banner_id) values(v_jugador.usuario_id,'campeon') on conflict do nothing;
   end if;
  end if;
 end loop;
 return new;
end $$;
revoke all on function public.premiar_cierre_liga() from public,anon,authenticated;
create trigger temporada_premiar_cierre after update of estado on public.temporadas
 for each row execute function public.premiar_cierre_liga();
