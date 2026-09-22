"use client";

import { byId } from "@/lib/projects";
import { labelHost } from "@/components/scene/labelHost";
import { useScene } from "@/lib/store";
import StatusPill from "./StatusPill";

/**
 * Hover label for a constellation node. React renders the content; the
 * scene writes the transform every frame. Hidden on touch, where there is
 * no hover and the dock is the interface.
 */
export default function NodeLabel() {
  const hovered = useScene((s) => s.hovered);
  const active = useScene((s) => s.active);
  const project = byId(active ? null : hovered);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-20 hidden overflow-hidden md:block"
    >
      <div
        ref={(el) => {
          labelHost.el = el;
        }}
        className="absolute left-0 top-0 will-change-transform"
        style={{
          opacity: project ? 1 : 0,
          transition: "opacity 260ms ease",
        }}
      >
        {project && (
          <div className="glass -translate-y-3 rounded-xl px-3.5 py-2.5">
            <div className="flex items-center gap-2.5 whitespace-nowrap">
              <span
                className="size-[6px] rounded-full"
                style={{
                  background: project.color,
                  boxShadow: `0 0 12px 1px ${project.color}`,
                }}
              />
              <span className="display text-[0.9375rem] leading-none text-ice">
                {project.name}
              </span>
              <StatusPill status={project.status} />
            </div>
            <p className="mt-1.5 max-w-[22ch] whitespace-normal text-[0.6875rem] leading-snug text-dim">
              {project.oneLiner}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
