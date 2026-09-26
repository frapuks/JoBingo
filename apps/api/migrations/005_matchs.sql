CREATE TYPE match_status AS ENUM ('PENDING', 'FIRST_HALF', 'HALF_TIME', 'SECOND_HALF', 'FINISHED');

CREATE TABLE matches (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  -- Le créateur gère le déroulé du match. Son compte supprimé, le match reste consultable.
  created_by integer REFERENCES users (id) ON DELETE SET NULL,
  status match_status NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

-- Un match oublié après le coup d'envoi est considéré comme terminé, sans tâche de fond.
CREATE FUNCTION effective_match_status(status match_status, started_at timestamptz)
RETURNS match_status
LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN status <> 'FINISHED' AND started_at < now() - interval '4 hours' THEN 'FINISHED'::match_status
    ELSE status
  END
$$;

CREATE TABLE match_players (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  match_id integer NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
  player_id integer REFERENCES players (id) ON DELETE SET NULL,
  -- Copies figées : modifier ou supprimer un joueur ou un pattern ne change aucun match passé.
  player_name text NOT NULL,
  player_number smallint NOT NULL,
  pattern_id integer REFERENCES patterns (id) ON DELETE SET NULL,
  -- Rempli au lancement, quand le tirage a lieu.
  pattern_text text,
  UNIQUE (match_id, player_id)
);

CREATE TABLE match_participants (
  match_id integer NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, user_id)
);

CREATE TABLE match_checks (
  match_player_id integer NOT NULL REFERENCES match_players (id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- Départage les égalités : à score égal, le premier à l'avoir atteint passe devant.
  checked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_player_id, user_id)
);

CREATE INDEX match_players_match_id_idx ON match_players (match_id);
CREATE INDEX match_checks_user_id_idx ON match_checks (user_id);
