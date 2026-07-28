import { useEffect, useState } from "react";
import { Leaf } from "lucide-react";

const KEY = "morelife.age.verified.v1";

export function AgeGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "asking" | "allowed" | "denied">("checking");

  useEffect(() => {
    setStatus(window.localStorage.getItem(KEY) === "yes" ? "allowed" : "asking");
  }, []);

  if (status === "checking") return null;
  if (status === "allowed") return <>{children}</>;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <Leaf className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
        {status === "asking" ? (
          <>
            <h1 className="mt-6 text-3xl leading-none">Confirm your age</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              More Life is a members-only club. Are you 18 years or older?
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={() => {
                  window.localStorage.setItem(KEY, "yes");
                  setStatus("allowed");
                }}
                className="w-full rounded-md bg-primary px-4 py-3 label-caps text-primary-foreground transition-opacity hover:opacity-90"
              >
                Yes, I am 18 or older
              </button>
              <button
                onClick={() => setStatus("denied")}
                className="w-full rounded-md border border-border px-4 py-3 label-caps text-muted-foreground transition-colors hover:bg-secondary"
              >
                No, I&apos;m not
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-3xl leading-none">Come back when you&apos;re older</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              The content of this club can&apos;t be viewed by a younger audience.
            </p>
            <button
              onClick={() => setStatus("asking")}
              className="mt-8 label-caps text-primary underline underline-offset-4"
            >
              I entered that incorrectly
            </button>
          </>
        )}
      </div>
    </div>
  );
}
