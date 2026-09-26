CREATE TABLE players (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  -- Deux joueurs peuvent porter le même numéro : rien ne l'interdit dans un club.
  number smallint NOT NULL CHECK (number BETWEEN 0 AND 99),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE patterns (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  player_id integer NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  text text NOT NULL,
  -- Auteur de la proposition, prévenu si l'administrateur la refuse.
  submitted_by integer REFERENCES users (id) ON DELETE SET NULL,
  -- Vide tant que l'administrateur n'a pas validé : un pattern en attente ne
  -- participe à aucun tirage.
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX patterns_player_id_idx ON patterns (player_id);
CREATE INDEX patterns_pending_idx ON patterns (created_at) WHERE approved_at IS NULL;
