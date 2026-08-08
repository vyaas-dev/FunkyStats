"use client";

import { useEffect } from "react";
import { getCacheManager } from "../lib/cache";

export default function CacheManager() {
  useEffect(() => {
    try {
      const cache = getCacheManager();
      cache.init().catch((err) => {
        console.warn("Cache init failed (e.g. private browsing):", err);
      });

      const cleanupOldCache = async () => {
        try {
          const keys = await cache.getAllKeys();
          console.log(`Cache initialized with ${keys.length} entries`);
        } catch (error) {
          console.warn("Cache keys check failed:", error);
        }
      };

      cleanupOldCache();
    } catch (err) {
      console.warn("CacheManager setup failed:", err);
    }
  }, []);

  return null;
}
