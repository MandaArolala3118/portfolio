-- Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "allow_select_visits" ON visits;

-- Créer une nouvelle politique qui autorise SELECT pour tout le monde (anon + authenticated)
CREATE POLICY "allow_select_visits"
  ON visits FOR SELECT
  TO anon, authenticated
  USING (true);
