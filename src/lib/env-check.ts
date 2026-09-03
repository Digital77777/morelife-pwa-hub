// Startup verification for the Supabase environment variables.
// Runs on both server (process.env) and client (import.meta.env) so a missing
// variable shows a clear on-page message instead of a blank 500.

type EnvCheck = { name: string; value: string | undefined };

function readClientEnv(name: string): string | undefined {
  const env = import.meta.env as Record<string, string | undefined>;
  return env[name];
}

function readServerEnv(name: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  return process.env[name];
}

/** Names of required Supabase env vars that are missing, empty, or blank. */
export function missingSupabaseEnv(): string[] {
  const isServer = typeof window === "undefined";

  const checks: EnvCheck[] = isServer
    ? [
        { name: "SUPABASE_URL", value: readServerEnv("SUPABASE_URL") ?? readClientEnv("VITE_SUPABASE_URL") },
        {
          name: "SUPABASE_PUBLISHABLE_KEY",
          value:
            readServerEnv("SUPABASE_PUBLISHABLE_KEY") ?? readClientEnv("VITE_SUPABASE_PUBLISHABLE_KEY"),
        },
      ]
    : [
        { name: "VITE_SUPABASE_URL", value: readClientEnv("VITE_SUPABASE_URL") },
        { name: "VITE_SUPABASE_PUBLISHABLE_KEY", value: readClientEnv("VITE_SUPABASE_PUBLISHABLE_KEY") },
      ];

  return checks.filter((c) => !c.value || c.value.trim() === "").map((c) => c.name);
}

/** True when an error was caused by absent/invalid Supabase configuration. */
export function isSupabaseConfigError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("supabaseUrl is required") ||
    message.includes("supabaseKey is required") ||
    message.includes("Missing Supabase environment variable")
  );
}
