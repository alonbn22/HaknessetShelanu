"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

// Shared search/filter URL-param logic for the list pages. Centralizes the
// debounce, the reset-to-page-1 rule, and the unmount cleanup a pending setTimeout
// needs (else router.replace can fire after unmount).
export const SEARCH_DEBOUNCE_MS = 300;

export function useQueryFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (debounce.current) clearTimeout(debounce.current);
    },
    [],
  );

  // Update one param (preserving the others) and return to page 1.
  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Same, but debounced — for free-text search inputs.
  const setParamDebounced = (key: string, value: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setParam(key, value), SEARCH_DEBOUNCE_MS);
  };

  return { searchParams, setParam, setParamDebounced };
}
