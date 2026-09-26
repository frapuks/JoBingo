-- Le rôle n'est pas modifiable depuis l'application : l'API le recalcule à chaque
-- démarrage à partir de ADMIN_EMAILS (voir src/admins.ts).
ALTER TABLE users ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
