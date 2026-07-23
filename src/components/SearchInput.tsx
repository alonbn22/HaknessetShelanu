"use client";

import { useState } from "react";
import { useQueryFilter } from "@/lib/use-query-filter";

// Debounced free-text search box wired to a URL query param (default `q`); shared
// by the list filters. Direction inherits from the document (cross-language search).
export function SearchInput({
  placeholder,
  className = "",
  param = "q",
}: {
  placeholder: string;
  className?: string;
  param?: string;
}) {
  const { searchParams, setParamDebounced } = useQueryFilter();
  const [value, setValue] = useState(searchParams.get(param) ?? "");
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        setParamDebounced(param, e.target.value);
      }}
      placeholder={placeholder}
      aria-label={placeholder}
      className={`rounded-lg border border-black/15 bg-white px-3 py-2 text-sm ${className}`}
    />
  );
}
