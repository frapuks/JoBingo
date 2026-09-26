-- Nom facultatif : partout où l'on affiche un supporter, l'adresse e-mail sert de repli.
ALTER TABLE users ADD COLUMN display_name text CHECK (display_name <> '');
