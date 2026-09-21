-- L'inscription ne demande plus de nom affiché : l'adresse e-mail suffit à identifier un compte.
ALTER TABLE users DROP COLUMN display_name;
