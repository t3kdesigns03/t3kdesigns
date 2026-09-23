import type { Metadata } from "next";
import ExploreMount from "@/components/explore/ExploreMount";
import { SITE } from "@/lib/theme";

export const metadata: Metadata = {
  title: `Explore · ${SITE.name}`,
  description: "Fly between the fifteen worlds of the T3KDesigns galaxy.",
  alternates: { canonical: "/explore" },
};

/**
 * Thin shell. Everything interactive is client-only and dynamically
 * imported, so visiting / never downloads any of it.
 */
export default function ExplorePage() {
  return (
    <main>
      <h1 className="sr-only">Explore the T3KDesigns galaxy</h1>
      <ExploreMount />
    </main>
  );
}
