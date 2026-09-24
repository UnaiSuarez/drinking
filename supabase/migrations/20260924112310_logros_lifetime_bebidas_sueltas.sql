
-- ===== 1. Nuevos logros de variedad, ligados al catálogo de bebidas
--    concretas (solo alcanzables registrando bebidas sueltas en una sala
--    permanente, que es donde existe el catálogo). =====
insert into logros (slug, nombre, icono, descripcion, rareza, pl, repetible, secreto)
select * from (values
  ('sumiller_1', 'Sumiller I', '🍺', 'Probar 10 cervezas distintas del catálogo de por vida.', 'rara', 0, false, false),
  ('sumiller_2', 'Sumiller II', '🍺', 'Probar 25 cervezas distintas del catálogo de por vida.', 'epica', 0, false, false),
  ('coleccionista_raras', 'Coleccionista', '💎', 'Probar 3 bebidas concretas de rareza rara o superior.', 'rara', 0, false, false),
  ('coleccionista_legendaria', 'Leyenda Viva', '👑', 'Probar una bebida concreta de rareza legendaria.', 'epica', 0, false, false)
) as v(slug, nombre, icono, descripcion, rareza, pl, repetible, secreto)
where not exists (select 1 from logros where logros.slug = v.slug);

-- ===== 2. Motor de logros "de por vida": el mismo cálculo que ya hacía
--    finalizar_noche (cervecero/centurion/coctelero/oceano/monumento/
--    enciclopedia) pero invocable para un usuario suelto, sin necesitar que
--    se cierre ninguna noche. Se llama desde registrar_bebida_suelta.
--    Como siempre inserta con noche_id = null, finalizar_noche nunca las
--    contará dos veces ni les sumará PL de liga (esto es solo XP/chapas de
--    nivel general, igual que el resto de bebidas sueltas). =====
create or replace function public.otorgar_logros_lifetime(p_usuario uuid, p_sala uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_cervezas int; v_chupitos int; v_cubatas int; v_total int; v_tipos int;
  v_cervezas_cat int; v_raras_mas int; v_legendarias int;
  v_nuevos jsonb := '[]'::jsonb;
  r record;
  v_logro logros%rowtype;
  v_xp int;
  v_chapas int;
  v_ya boolean;
begin
  select
    count(*) filter (where bt.nombre in ('Cerveza','Pinta')),
    count(*) filter (where bt.nombre in ('Chupito','Shot especial')),
    count(*) filter (where bt.nombre = 'Cubata'),
    count(*),
    count(distinct r.bebida_tipo_id)
  into v_cervezas, v_chupitos, v_cubatas, v_total, v_tipos
  from registros r
  join bebidas_tipo bt on bt.id = r.bebida_tipo_id
  where r.usuario_id = p_usuario and r.anulado = false;

  select count(distinct r.bebida_catalogo_id)
  into v_cervezas_cat
  from registros r
  join bebidas_catalogo bc on bc.id = r.bebida_catalogo_id
  join bebidas_tipo bt on bt.id = bc.categoria_id
  where r.usuario_id = p_usuario and r.anulado = false and bt.nombre = 'Cerveza';

  select
    count(distinct r.bebida_catalogo_id) filter (where bc.rareza in ('rara','epica','legendaria')),
    count(distinct r.bebida_catalogo_id) filter (where bc.rareza = 'legendaria')
  into v_raras_mas, v_legendarias
  from registros r
  join bebidas_catalogo bc on bc.id = r.bebida_catalogo_id
  where r.usuario_id = p_usuario and r.anulado = false;

  for r in
    select * from (values
      ('cervecero_1', v_cervezas >= 50), ('cervecero_2', v_cervezas >= 250),
      ('cervecero_3', v_cervezas >= 1000), ('cervecero_4', v_cervezas >= 5000),
      ('centurion_1', v_chupitos >= 25), ('centurion_2', v_chupitos >= 100),
      ('centurion_3', v_chupitos >= 500), ('centurion_4', v_chupitos >= 1000),
      ('coctelero_1', v_cubatas >= 25), ('coctelero_2', v_cubatas >= 100),
      ('coctelero_3', v_cubatas >= 500), ('coctelero_4', v_cubatas >= 1000),
      ('oceano', v_total >= 1000), ('monumento', v_total >= 5000),
      ('enciclopedia', v_tipos >= 8),
      ('sumiller_1', v_cervezas_cat >= 10), ('sumiller_2', v_cervezas_cat >= 25),
      ('coleccionista_raras', v_raras_mas >= 3),
      ('coleccionista_legendaria', v_legendarias >= 1)
    ) as t(slug, cumple)
    where cumple
  loop
    select exists (
      select 1 from logros_usuario lu join logros l on l.id = lu.logro_id
      where lu.usuario_id = p_usuario and l.slug = r.slug
    ) into v_ya;
    if v_ya then
      continue;
    end if;

    select * into v_logro from logros where slug = r.slug;
    if not found then
      continue;
    end if;

    insert into logros_usuario (usuario_id, logro_id, noche_id, sala_id)
    values (p_usuario, v_logro.id, null, p_sala);

    v_xp := case v_logro.rareza
      when 'comun' then 25 when 'rara' then 75 when 'epica' then 200 else 500 end;
    v_chapas := case v_logro.rareza
      when 'comun' then 8 when 'rara' then 20 when 'epica' then 50 else 150 end;

    update perfiles p
    set xp = p.xp + v_xp,
        avatar_config = jsonb_set(
          coalesce(p.avatar_config, '{}'::jsonb)
            || jsonb_build_object('tienda', coalesce(p.avatar_config->'tienda', '{}'::jsonb)),
          '{tienda,bonus}',
          to_jsonb(coalesce((p.avatar_config->'tienda'->>'bonus')::int, 0) + v_chapas)
        )
    where p.id = p_usuario;

    v_nuevos := v_nuevos || jsonb_build_object(
      'slug', v_logro.slug, 'nombre', v_logro.nombre,
      'icono', v_logro.icono, 'rareza', v_logro.rareza
    );
  end loop;

  return v_nuevos;
end;
$function$;

-- ===== 3. registrar_bebida_suelta: ahora admite elegir una bebida concreta
--    del catálogo (con bonus de XP la primera vez que se prueba, según su
--    rareza), y devuelve también los logros de por vida que se hayan
--    desbloqueado con este registro. =====
create or replace function public.registrar_bebida_suelta(
  p_sala uuid,
  p_bebida_tipo_id integer,
  p_bebida_catalogo_id uuid default null,
  p_comentario text default null
)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_tipo text;
  v_tipo_id integer;
  v_rareza text;
  v_es_primera boolean := false;
  v_bonus_rareza int := 0;
  v_xp int;
  v_registro public.registros;
  v_logros_nuevos jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not es_miembro(p_sala) then
    raise exception 'No eres miembro de esta sala';
  end if;

  select coalesce(config->>'tipo', 'normal') into v_tipo from salas where id = p_sala;
  if v_tipo <> 'permanente' then
    raise exception 'Solo se pueden registrar bebidas sueltas en una sala permanente';
  end if;

  v_tipo_id := p_bebida_tipo_id;

  if p_bebida_catalogo_id is not null then
    select categoria_id, rareza into v_tipo_id, v_rareza
    from bebidas_catalogo
    where id = p_bebida_catalogo_id and (sala_id is null or sala_id = p_sala);
    if not found then
      raise exception 'Bebida del catálogo no válida para esta sala';
    end if;

    v_es_primera := not exists (
      select 1 from registros
      where usuario_id = auth.uid() and bebida_catalogo_id = p_bebida_catalogo_id
    );
    if v_es_primera then
      v_bonus_rareza := case v_rareza
        when 'rara' then 5 when 'epica' then 15 when 'legendaria' then 30 else 0
      end;
    end if;
  end if;

  if not exists (
    select 1 from bebidas_tipo where id = v_tipo_id and (sala_id is null or sala_id = p_sala)
  ) then
    raise exception 'Tipo de bebida no válido para esta sala';
  end if;

  insert into registros (sala_id, usuario_id, bebida_tipo_id, bebida_catalogo_id, comentario)
  values (p_sala, auth.uid(), v_tipo_id, p_bebida_catalogo_id, nullif(trim(coalesce(p_comentario, '')), ''))
  returning * into v_registro;

  v_xp := 5 + v_bonus_rareza;
  update perfiles set xp = xp + v_xp where id = auth.uid();

  v_logros_nuevos := otorgar_logros_lifetime(auth.uid(), p_sala);

  return jsonb_build_object(
    'registro', to_jsonb(v_registro),
    'xp_ganada', v_xp,
    'descubierta', v_es_primera and v_bonus_rareza > 0,
    'logros_nuevos', coalesce(v_logros_nuevos, '[]'::jsonb)
  );
end;
$function$;

-- ===== 4. anular_bebida_suelta: si se deshace la única vez que se probó
--    esa bebida concreta del catálogo, también se revierte su bonus. Los
--    logros de por vida NO se revierten al deshacer (igual de intencionado
--    que el resto del motor de logros, que tampoco se revierte registro a
--    registro). =====
create or replace function public.anular_bebida_suelta(p_registro_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_ts timestamptz;
  v_usuario uuid;
  v_catalogo uuid;
  v_rareza text;
  v_xp int := 5;
  v_era_unica boolean;
begin
  select ts, usuario_id, bebida_catalogo_id into v_ts, v_usuario, v_catalogo
  from registros
  where id = p_registro_id and usuario_id = auth.uid() and sala_id is not null;

  if not found then
    raise exception 'Registro no encontrado';
  end if;
  if v_ts <= now() - interval '30 seconds' then
    raise exception 'Ya no se puede deshacer esta bebida';
  end if;

  if v_catalogo is not null then
    select count(*) = 1 into v_era_unica from registros
    where usuario_id = v_usuario and bebida_catalogo_id = v_catalogo;
    if v_era_unica then
      select rareza into v_rareza from bebidas_catalogo where id = v_catalogo;
      v_xp := v_xp + case v_rareza
        when 'rara' then 5 when 'epica' then 15 when 'legendaria' then 30 else 0
      end;
    end if;
  end if;

  delete from registros where id = p_registro_id;
  update perfiles set xp = greatest(0, xp - v_xp) where id = v_usuario;
end;
$function$;
