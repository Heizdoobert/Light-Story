import { err, json } from '../utils/supabase-client';
import { Client } from 'pg';

export async function handleHyperdriveRequest(
  request: Request,
  env: Env,
  token: string | null,
  strippedPath: string,
): Promise<Response> {
  if (request.method !== 'GET') {
    return err('METHOD_NOT_ALLOWED', 'Only GET is supported', 405);
  }

  // Ensure Hyperdrive binding is configured
  if (!env.HYPERDRIVE) {
    return err(
      'HYPERDRIVE_UNCONFIGURED',
      'Hyperdrive binding missing. Ensure you updated wrangler.jsonc with the Hyperdrive ID.',
      500,
    );
  }

  try {
    // 1. Initialize Postgres Client via Hyperdrive connection string
    const client = new Client({
      connectionString: env.HYPERDRIVE.connectionString,
    });

    // 2. Connect to the pool
    await client.connect();

    // 3. Execute a simple query
    const result = await client.query('SELECT current_timestamp, version();');

    // 4. Close the connection
    await client.end();

    // Return the response
    return json({
      message: 'Successfully connected to Supabase Postgres via Cloudflare Hyperdrive!',
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Hyperdrive Error:', error);
    return err(
      'HYPERDRIVE_ERROR',
      error.message || 'Failed to query database',
      500,
    );
  }
}
