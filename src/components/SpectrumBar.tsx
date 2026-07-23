"use client";

import { useTranslations } from "next-intl";
import type { Spectrum } from "@/lib/content";

// Marker position on a left→right axis (kept LTR in every locale so political
// left/right isn't confused with text direction).
const POSITION: Record<Spectrum, number> = {
  left: 8,
  "center-left": 29,
  center: 50,
  "center-right": 67,
  right: 84,
  "far-right": 95,
};

export function SpectrumBar({ spectrum }: { spectrum: Spectrum }) {
  const t = useTranslations("spectrum");
  const pos = POSITION[spectrum];
  return (
    <div className="pt-5" dir="ltr">
      {/* Classification label floats above the marker. */}
      <div className="relative h-5">
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-2 py-0.5 text-xs font-semibold text-background"
          style={{ left: `${pos}%` }}
        >
          {t(spectrum)}
        </span>
      </div>
      <div
        className="relative h-2.5 rounded-full"
        style={{
          // Left = blue, right = red.
          background:
            "linear-gradient(to right, #16355c 0%, #2e6da4 30%, #d6c84a 50%, #e67e22 65%, #c0392b 100%)",
        }}
      >
        <span
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white bg-foreground shadow"
          style={{ left: `${pos}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs text-muted">
        <span>{t("leftPole")}</span>
        <span>{t("rightPole")}</span>
      </div>
    </div>
  );
}
