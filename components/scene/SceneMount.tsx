"use client";

import dynamic from "next/dynamic";
import { useEffect, useSyncExternalStore } from "react";
import SceneBoundary from "./SceneBoundary";
import { hasWebGL } from "./perf";
import { sceneStore, useScene } from "@/lib/store";

const noop = () => () => {};

const SceneCanvas = dynamic(() => import("./SceneCanvas"), {
  ssr: false,
  loading: () => null,
});

/**
 * The CSS galaxy is always underneath: it covers the first paint, the
 * dynamic-import gap, and the case where WebGL never arrives at all.
 */
export default function SceneMount() {
  // the server renders the CSS galaxy; the client knows the truth on first paint
  const webgl = useSyncExternalStore(noop, hasWebGL, () => false);
  const failed = useScene((s) => s.webglFailed);

  // probe after mount, not during hydration: the hydration pass always
  // reports the server value, which would otherwise latch the fallback on
  useEffect(() => {
    if (!hasWebGL()) sceneStore.failWebgl();
  }, []);

  return (
    <div aria-hidden className="fixed inset-0 z-0 overflow-hidden">
      <div className="css-galaxy" />
      {webgl && !failed && (
        <SceneBoundary onFail={() => sceneStore.failWebgl()}>
          <SceneCanvas />
        </SceneBoundary>
      )}
    </div>
  );
}
