"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";
import SceneBoundary from "@/components/scene/SceneBoundary";
import { hasWebGL } from "@/components/scene/perf";
import { useMedia, useReducedMotion } from "@/lib/motion";
import Fallback from "./Fallback";
import HUD from "./HUD";

const ExploreCanvas = dynamic(() => import("./ExploreCanvas"), {
  ssr: false,
  loading: () => null,
});

const noop = () => () => {};

/**
 * Three states, not two: on the server and during hydration we do not know
 * whether WebGL exists, and guessing "no" would flash the fallback list
 * before the galaxy arrives. Until the client answers, it is just the void.
 */
export default function ExploreMount() {
  const support = useSyncExternalStore(
    noop,
    () => (hasWebGL() ? "yes" : "no"),
    () => "unknown",
  );
  const [failed, setFailed] = useState(false);
  const reduced = useReducedMotion();
  const coarse = useMedia("(pointer: coarse)");

  if (support === "no" || failed) return <Fallback />;

  return (
    <div
      className="fixed inset-0 select-none overflow-hidden bg-void"
      style={{ touchAction: "none", overscrollBehavior: "none" }}
    >
      {support === "yes" && (
        <div aria-hidden className="absolute inset-0">
          <SceneBoundary onFail={() => setFailed(true)}>
            <ExploreCanvas reduced={reduced} coarse={coarse} />
          </SceneBoundary>
        </div>
      )}
      {support === "yes" && <HUD reduced={reduced} coarse={coarse} />}
    </div>
  );
}
