"use client";

import { EASE } from "@/lib/motion";
import { motion } from "framer-motion";
import { projects } from "@/lib/projects";
import { sceneStore, useScene } from "@/lib/store";
import StatusPill from "./StatusPill";

export default function Work() {
  const hovered = useScene((s) => s.hovered);
  const active = useScene((s) => s.active);
  const failed = useScene((s) => s.webglFailed);

  return (
    <section
      id="work"
      className="pointer-events-none relative flex min-h-[100svh] flex-col justify-end pb-16 pt-28 sm:pb-20"
    >
      <div className="shell w-full">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="pointer-events-auto max-w-[34rem]"
        >
          <p className="eyebrow">The constellation</p>
          <h2 className="display mt-5 text-[clamp(1.75rem,3.9vw,2.875rem)] text-ice">
            Everything <span className="accent">connects.</span>
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-dim">
            {failed
              ? "Eight systems, one studio. Pick one."
              : "Eight systems orbiting one studio. Touch a light out there, or read them straight."}
          </p>
        </motion.div>

        {/* mission dock */}
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 1, delay: 0.1, ease: EASE }}
          className="glass pointer-events-auto mt-10 overflow-hidden rounded-[1.375rem]"
        >
          <div className="flex items-center justify-between px-5 py-3 sm:px-6">
            <span className="eyebrow">Mission dock</span>
            <span className="text-[0.625rem] uppercase tracking-[0.2em] text-[rgba(232,228,255,0.28)]">
              {projects.length} systems
            </span>
          </div>
          <div className="hairline" />

          <ul className="divide-y divide-[rgba(203,182,255,0.08)]">
            {projects.map((p) => {
              const lit = hovered === p.id || active === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => sceneStore.setActive(p.id)}
                    onMouseEnter={() => sceneStore.setHovered(p.id)}
                    onMouseLeave={() => sceneStore.setHovered(null)}
                    onFocus={() => sceneStore.setHovered(p.id)}
                    onBlur={() => sceneStore.setHovered(null)}
                    aria-haspopup="dialog"
                    className="group grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-4 px-5 py-3.5 text-left transition-colors sm:px-6"
                    style={{
                      background: lit ? "rgba(203,182,255,0.05)" : "transparent",
                    }}
                  >
                    <span
                      aria-hidden
                      className="size-[7px] rounded-full transition-all duration-500"
                      style={{
                        background: p.color,
                        boxShadow: lit
                          ? `0 0 16px 2px ${p.color}`
                          : `0 0 7px 0 ${p.color}66`,
                        transform: lit ? "scale(1.25)" : "scale(1)",
                      }}
                    />

                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span
                          className="display text-[1.0625rem] tracking-[-0.02em] transition-colors sm:text-[1.1875rem]"
                          style={{ color: lit ? "#fff" : "var(--ice)" }}
                        >
                          {p.name}
                        </span>
                        <StatusPill status={p.status} />
                      </span>
                      <span className="mt-1 block truncate text-[0.8125rem] text-dim">
                        {p.oneLiner}
                      </span>
                    </span>

                    <span
                      aria-hidden
                      className="text-lilac-dim transition-all duration-500 group-hover:text-lilac"
                      style={{
                        transform: lit ? "translateX(3px)" : "translateX(0)",
                        opacity: lit ? 1 : 0.5,
                      }}
                    >
                      →
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
