"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query) {
  const getInitial = (q) => {
    if (typeof window === "undefined" || !q) return false;
    try {
      return window.matchMedia(q).matches;
    } catch {
      return false;
    }
  };

  // Initialize synchronously to avoid first-render flip
  const [matches, setMatches] = useState(() => getInitial(query));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    // In case query changed, ensure we sync immediately
    setMatches(mql.matches);
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);

  return matches;
}

export const useIsMobile = () => useMediaQuery("(max-width: 768px)");
export const usePrefersReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
