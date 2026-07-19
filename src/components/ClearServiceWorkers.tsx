"use client";

import { useEffect } from "react";

/** Clears leftover service workers registered by other apps on the same origin. */
export default function ClearServiceWorkers() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void (async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    })();
  }, []);

  return null;
}
