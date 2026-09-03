export function ConfigError({ missing }: { missing?: string[] }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
        <p className="label-caps text-primary">Configuration required</p>
        <h1 className="mt-3 text-2xl leading-tight">This app isn&apos;t connected to its backend</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The Supabase environment variables are missing on this deployment, so the catalogue,
          membership and orders can&apos;t load.
        </p>

        {missing && missing.length > 0 ? (
          <ul className="mt-4 space-y-1 rounded-md border border-border bg-background p-3 text-xs">
            {missing.map((name) => (
              <li key={name} className="font-mono text-muted-foreground">
                {name} — not set
              </li>
            ))}
          </ul>
        ) : null}

        <p className="mt-4 text-xs text-muted-foreground">
          Add the Supabase URL and publishable key (both the <span className="font-mono">VITE_</span>
          and server-side names) to this deployment&apos;s environment variables, then redeploy.
        </p>
      </div>
    </div>
  );
}
