import * as jose from "jsr:@panva/jose@6";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const jwtIssuer = Deno.env.get("SB_JWT_ISSUER") ?? `${supabaseUrl}/auth/v1`;
const jwtKeys = jose.createRemoteJWKSet(
  new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
);

export type VerifiedSupabaseJwt = {
  userId: string;
  email: string | null;
};

export async function verifySupabaseBearerToken(
  request: Request,
): Promise<VerifiedSupabaseJwt> {
  const authHeader = request.headers.get("Authorization") ?? "";

  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Missing bearer token");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    throw new Error("Invalid bearer token");
  }

  const { payload } = await jose.jwtVerify(token, jwtKeys, {
    issuer: jwtIssuer,
  });

  const userId = String(payload.sub ?? "");
  if (!userId) {
    throw new Error("Invalid JWT payload");
  }

  return {
    userId,
    email: typeof payload.email === "string" ? payload.email : null,
  };
}