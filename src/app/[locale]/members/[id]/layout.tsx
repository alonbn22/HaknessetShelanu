import { notFound } from "next/navigation";
import { getMember } from "@/lib/queries";

// The page's own notFound() sits inside loading.tsx's Suspense boundary, and
// once the skeleton has streamed the status is already 200. Checking here,
// outside the boundary, keeps a missing member a real 404. getMember is
// cache()-wrapped, so the page reuses this lookup.
export default async function MemberLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const personId = parseInt((await params).id, 10);
  if (Number.isNaN(personId) || !getMember(personId)) notFound();
  return children;
}
