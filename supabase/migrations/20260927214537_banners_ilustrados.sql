insert into public.banners_catalogo(id,nombre,rareza,precio,exclusivo) values
 ('barra-clasica','Barra clasica','comun',30,false),
 ('azotea','Azotea al atardecer','comun',30,false),
 ('arcade','Una partida mas','comun',30,false),
 ('biblioteca-arcana','Biblioteca arcana','epica',220,false),
 ('templo-glacial','Templo glacial','epica',220,false),
 ('forja-solar','Forja solar','legendaria',500,false),
 ('viaje-estelar','Viaje estelar','legendaria',500,false),
 ('cumbre-after','Cumbre del After','exclusiva',0,true);

-- A cosmetic for future Grandmaster ascents, not a retroactive grant.
create function public.desbloquear_banner_gran_maestro() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if new.motivo='ascenso:gran-maestro' then
  insert into banners_usuario(usuario_id,banner_id)
  values(new.usuario_id,'cumbre-after') on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function public.desbloquear_banner_gran_maestro() from public,anon,authenticated;
create trigger liga_banner_gran_maestro after insert on public.liga_premios
 for each row when (new.motivo='ascenso:gran-maestro')
 execute function public.desbloquear_banner_gran_maestro();
