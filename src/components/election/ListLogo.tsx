import Image from "next/image";

// A list's official logo on a plate that stays the same in both themes: white
// (brand marks are drawn for white) unless the mark is drawn for a dark ground.
export function ListLogo({
  logo,
  alt,
  height,
  maxWidth,
}: {
  logo: { src: string; plate?: "dark" };
  alt: string;
  height: number;
  maxWidth: number;
}) {
  return (
    <Image
      src={logo.src}
      alt={alt}
      width={maxWidth}
      height={height}
      unoptimized
      className="shrink-0 rounded-lg object-contain p-1.5"
      style={{ height, width: "auto", maxWidth, backgroundColor: logo.plate === "dark" ? "#1e293b" : "#fff" }}
    />
  );
}
