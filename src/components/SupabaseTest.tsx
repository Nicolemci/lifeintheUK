import { useCallback, useEffect, useState } from "react";
import { verifySupabaseConnection } from "../lib/supabase";

type ConnectionState =
  | { status: "checking"; message: string }
  | { status: "connected"; message: string }
  | { status: "error"; message: string };

export default function SupabaseTest() {
  const [connection, setConnection] = useState<ConnectionState>({
    status: "checking",
    message: "Checking the Supabase connection…",
  });

  const checkConnection = useCallback(async (signal?: AbortSignal) => {
    setConnection({
      status: "checking",
      message: "Checking the Supabase connection…",
    });

    try {
      await verifySupabaseConnection(signal);
      setConnection({
        status: "connected",
        message: "✅ Supabase Connected",
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setConnection({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown Supabase connection error.",
      });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void checkConnection(controller.signal);

    return () => controller.abort();
  }, [checkConnection]);

  return (
    <section className="supabase-test-section" aria-labelledby="supabase-test-title">
      <div className="reader-hero card">
        <p className="british-kicker">Infrastructure check</p>
        <h1 id="supabase-test-title">Supabase connection</h1>
        <p>
          This check validates the Vite environment configuration and connects to Supabase's public
          health endpoint without authenticating users or querying application tables.
        </p>
      </div>

      <article className={`card connection-card ${connection.status}`} aria-live="polite">
        <p className="eyebrow">Connection status</p>
        <h2>{connection.status === "connected" ? connection.message : "Supabase status"}</h2>
        {connection.status !== "connected" ? <p>{connection.message}</p> : null}
        <button
          className="secondary-button"
          type="button"
          onClick={() => void checkConnection()}
          disabled={connection.status === "checking"}
        >
          {connection.status === "checking" ? "Checking…" : "Check again"}
        </button>
      </article>
    </section>
  );
}
