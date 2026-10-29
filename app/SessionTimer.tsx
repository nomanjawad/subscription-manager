"use client";

// Ends the session in the browser the moment the 30-minute hard limit is up
// (the server enforces it on every request too — this just avoids a stale
// screen). Navigating to /login lets proxy.ts clear the expired session.
import { useEffect } from "react";

export function SessionTimer({ expiresAt }: { expiresAt: number }) {
  useEffect(() => {
    const ms = expiresAt * 1000 - Date.now();
    const go = () => window.location.assign("/login?reason=expired");
    if (ms <= 0) {
      go();
      return;
    }
    const id = setTimeout(go, ms);
    return () => clearTimeout(id);
  }, [expiresAt]);
  return null;
}
