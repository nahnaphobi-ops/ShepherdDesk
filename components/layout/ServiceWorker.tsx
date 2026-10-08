"use client";

import { useEffect } from "react";

// Registers the service worker in production builds (it would fight dev-server hot reloading).
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
