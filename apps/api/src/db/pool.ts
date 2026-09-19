import pg from 'pg';

// Connexion lue dans PGHOST, PGUSER, PGPASSWORD, PGDATABASE (voir docker-compose.yml).
export const pool = new pg.Pool({ max: 5 });

// Sans écouteur, une connexion inactive coupée par Postgres ferait planter le processus.
pool.on('error', (err) => {
  console.error('Connexion PostgreSQL inactive perdue :', err.message);
});

export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
