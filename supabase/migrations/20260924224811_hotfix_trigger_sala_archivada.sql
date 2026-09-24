-- HOTFIX urgente: rechazar_escritura_sala_archivada (de la migración
-- perfil_estadisticas_y_borrado_salas / archivar_salas, PR #21) rompía
-- crear una sala y crear una noche en TODA la producción, desde que se
-- fusionó ese PR.
--
-- La función se usa como trigger BEFORE INSERT en cuatro tablas (noches,
-- registros, sojas_registros, sala_miembros) y referenciaba `new.noche_id`
-- sin condicionar el acceso a la tabla. `noche_id` no existe en `noches` ni
-- en `sala_miembros` (solo en `registros` y `sojas_registros`), así que
-- cada vez que este trigger se compilaba para esas dos tablas fallaba con
-- "record new has no field noche_id" — no es un error de RLS ni de datos,
-- es un fallo de compilación de PL/pgSQL: el cuerpo entero de la función se
-- tipa de una vez, así que ni siquiera importa que esa rama nunca se
-- ejecute para esas tablas.
--
-- Arreglo: acceder a `noche_id` vía `to_jsonb(new) ->> 'noche_id'` en vez
-- de `new.noche_id`. El acceso a un jsonb no exige que el campo exista en
-- el tipo de fila en tiempo de compilación (falla a null si no está), así
-- que la misma función sirve para las cuatro tablas sin más cambios. No
-- toca el resto de la lógica (comprobar sala archivada por sala_id directo,
-- o resuelto desde la noche cuando el registro es de una noche).
create or replace function public.rechazar_escritura_sala_archivada()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_sala uuid := new.sala_id;
  v_noche_id uuid;
  v_archivada timestamptz;
begin
  if v_sala is null and tg_table_name = 'registros' then
    v_noche_id := (to_jsonb(new) ->> 'noche_id')::uuid;
    if v_noche_id is not null then
      select sala_id into v_sala from public.noches where id = v_noche_id;
    end if;
  end if;
  if v_sala is null then return new; end if;
  select archivada_at into v_archivada from public.salas where id = v_sala for share;
  if v_archivada is not null then
    raise exception 'Esta sala está archivada';
  end if;
  return new;
end;
$function$;
