import SceneMount from "@/components/scene/SceneMount";
import Nav from "@/components/ui/Nav";
import Hero from "@/components/ui/Hero";
import Work from "@/components/ui/Work";
import Studio from "@/components/ui/Studio";
import Contact from "@/components/ui/Contact";
import Footer from "@/components/ui/Footer";
import ProjectPanel from "@/components/ui/ProjectPanel";
import NodeLabel from "@/components/ui/NodeLabel";

export default function Page() {
  return (
    <>
      {/* fixed cinematic layer */}
      <SceneMount />

      {/* light leaks so type never sits directly on particles */}
      <div
        aria-hidden
        className="leak-top pointer-events-none fixed inset-x-0 top-0 z-[5] h-40"
      />
      <div
        aria-hidden
        className="vignette pointer-events-none fixed inset-0 z-[4]"
      />

      <div className="relative z-10">
        <Nav />
        <main>
          <Hero />
          <Work />
          <Studio />
          <Contact />
        </main>
        <Footer />
      </div>

      <NodeLabel />
      <ProjectPanel />
    </>
  );
}
