
-- ===== 1. Catálogo de bebidas concretas (marcas), con rareza. Global
--    (sala_id null) o propio de una sala permanente. =====
create table if not exists public.bebidas_catalogo (
  id uuid primary key default gen_random_uuid(),
  sala_id uuid references public.salas(id) on delete cascade,
  categoria_id integer not null references public.bebidas_tipo(id),
  nombre text not null,
  rareza text not null default 'comun' check (rareza in ('comun','rara','epica','legendaria')),
  icono text,
  creado_por uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists bebidas_catalogo_nombre_unico
  on public.bebidas_catalogo (coalesce(sala_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(nombre));

alter table public.bebidas_catalogo enable row level security;

drop policy if exists bebidas_catalogo_select on public.bebidas_catalogo;
create policy bebidas_catalogo_select on public.bebidas_catalogo
  for select using (sala_id is null or es_miembro(sala_id));

-- ===== 2. registros: qué bebida concreta del catálogo fue (si la hubo) =====
alter table public.registros add column if not exists bebida_catalogo_id uuid references public.bebidas_catalogo(id);

-- ===== 3. Vista de estadísticas: exponer también la bebida concreta
--    (columna nueva al final, para no romper el orden de columnas ya
--    existente de la vista) =====
create or replace view public.registros_sala
with (security_invoker = true) as
select
  r.id,
  r.usuario_id,
  r.bebida_tipo_id,
  r.ts,
  r.anulado,
  r.noche_id,
  coalesce(r.sala_id, n.sala_id) as sala_id,
  r.bebida_catalogo_id
from registros r
left join noches n on n.id = r.noche_id;

-- ===== 4. Añadir una bebida concreta al catálogo (global si ya existe con
--    ese nombre, si no propia de la sala). Cualquier miembro puede añadir. =====
create or replace function public.crear_bebida_catalogo(
  p_sala uuid,
  p_nombre text,
  p_categoria_id integer,
  p_rareza text default 'comun'
)
 returns bebidas_catalogo
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_tipo text;
  v_nombre text;
  v_rareza text;
  v_fila public.bebidas_catalogo;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not es_miembro(p_sala) then
    raise exception 'No eres miembro de esta sala';
  end if;

  select coalesce(config->>'tipo', 'normal') into v_tipo from salas where id = p_sala;
  if v_tipo <> 'permanente' then
    raise exception 'Solo se pueden añadir bebidas concretas en una sala permanente';
  end if;

  v_nombre := trim(coalesce(p_nombre, ''));
  if v_nombre = '' then
    raise exception 'Ponle un nombre a la bebida';
  end if;

  v_rareza := coalesce(p_rareza, 'comun');
  if v_rareza not in ('comun', 'rara', 'epica', 'legendaria') then
    raise exception 'Rareza no válida';
  end if;

  if not exists (
    select 1 from bebidas_tipo where id = p_categoria_id and (sala_id is null or sala_id = p_sala)
  ) then
    raise exception 'Categoría no válida para esta sala';
  end if;

  -- si ya existe (en esta sala o globalmente), se devuelve la existente en
  -- vez de duplicar
  select * into v_fila from bebidas_catalogo
  where coalesce(sala_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = coalesce(p_sala, '00000000-0000-0000-0000-000000000000'::uuid)
    and lower(nombre) = lower(v_nombre)
  limit 1;
  if found then
    return v_fila;
  end if;

  select * into v_fila from bebidas_catalogo
  where sala_id is null and lower(nombre) = lower(v_nombre)
  limit 1;
  if found then
    return v_fila;
  end if;

  insert into bebidas_catalogo (sala_id, categoria_id, nombre, rareza, creado_por)
  values (p_sala, p_categoria_id, v_nombre, v_rareza, auth.uid())
  returning * into v_fila;

  return v_fila;
end;
$function$;
