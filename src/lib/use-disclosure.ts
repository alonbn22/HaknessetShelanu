"use client";

import { useEffect, useRef, useState } from "react";

// A button that shows and hides a panel (the header's More menu, the mobile
// menu, the language list). Escape, a click outside and focus moving outside
// all close it. Escape also hands focus back to the trigger: the panel unmounts
// on close, and focus inside it would otherwise fall to <body>.
export function useDisclosure() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (e: Event) => !root.current?.contains(e.target as Node);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    const onAway = (e: Event) => outside(e) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onAway);
    document.addEventListener("focusin", onAway);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onAway);
      document.removeEventListener("focusin", onAway);
    };
  }, [open]);

  return { open, setOpen, root, trigger };
}
