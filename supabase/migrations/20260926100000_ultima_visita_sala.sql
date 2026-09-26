-- Para ordenar "Tus salas" por la última vez que se entró (en vez del
-- orden de cuándo te uniste), sala_miembros gana una marca de tiempo que
-- se actualiza cada vez que se abre /sala/[id].
alter table public.sala_miembros add column if not exists visitado_at timestamptz not null default now();

create or replace function public.marcar_visita_sala(p_sala uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  update sala_miembros
  set visitado_at = now()
  where sala_id = p_sala and usuario_id = auth.uid();
end;
$function$;

revoke all on function public.marcar_visita_sala(uuid) from public, anon;
grant execute on function public.marcar_visita_sala(uuid) to authenticated;
