-- =====================================================================
-- Couvertures par thème (demande de Karl, 03/11) : un voyage sans photo de couverture montre une photo
-- d'ambiance (ville, plage, montagne…), servie par l'app (public/couvertures). Vide : thème deviné
-- d'après la première étape ; la photo de couverture choisie dans le voyage passe toujours devant.
-- =====================================================================

alter table public.trips
  add column cover_theme text check (cover_theme in ('ville', 'plage', 'montagne', 'neige', 'nature', 'desert', 'campagne', 'lac'));
