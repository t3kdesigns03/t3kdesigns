"use client";

import { AnimatePresence, motion } from "framer-motion";
import { EASE } from "@/lib/motion";
import { useEffect, useRef } from "react";
import { byId } from "@/lib/projects";
import { sceneStore, useScene } from "@/lib/store";
import StatusPill from "./StatusPill";

export default function ProjectPanel() {
  const activeId = useScene((s) => s.active);
  const project = byId(activeId);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!activeId) return;
    restoreRef.current = document.activeElement;
    const t = window.setTimeout(() => closeRef.current?.focus(), 60);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") sceneStore.setActive(null);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      const el = restoreRef.current;
      if (el instanceof HTMLElement) el.focus({ preventScroll: true });
    };
  }, [activeId]);

  return (
    <AnimatePresence>
      {project && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={() => sceneStore.setActive(null)}
            className="fixed inset-0 z-40 bg-[rgba(3,2,8,0.6)]"
          />

          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label={`${project.name} — project detail`}
            initial={{ x: "100%", opacity: 0.4 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.2 }}
            transition={{ duration: 0.55, ease: EASE }}
            className="glass fixed inset-y-0 right-0 z-50 flex w-full max-w-[26.5rem] flex-col overflow-y-auto overscroll-contain border-l px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(1.75rem+env(safe-area-inset-top))] sm:px-8"
          >
            <div className="flex items-start justify-between gap-4">
              <span
                aria-hidden
                className="mt-2 size-[9px] shrink-0 rounded-full"
                style={{
                  background: project.color,
                  boxShadow: `0 0 22px 3px ${project.color}`,
                }}
              />
              <button
                ref={closeRef}
                type="button"
                onClick={() => sceneStore.setActive(null)}
                className="-mr-2 -mt-1 flex min-h-[44px] items-center rounded-full px-3 text-[0.6875rem] uppercase tracking-[0.2em] text-lilac-dim transition-colors hover:text-ice"
              >
                close
              </button>
            </div>

            <h3 className="display mt-6 text-[clamp(1.75rem,4.5vw,2.375rem)] text-ice">
              {project.name}
            </h3>

            <p className="mt-3 text-[0.9375rem] leading-relaxed text-lilac">
              {project.oneLiner}
            </p>

            <div className="hairline my-7" />

            <p className="text-[0.9375rem] leading-[1.75] text-dim">{project.blurb}</p>

            <div className="mt-8 flex flex-wrap items-center gap-2">
              <StatusPill status={project.status} size="md" />
              {project.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-[var(--stroke)] px-2.5 py-1 text-[0.625rem] uppercase tracking-[0.14em] text-[rgba(232,228,255,0.45)]"
                >
                  {t}
                </span>
              ))}
            </div>

            <div className="mt-auto pt-12">
              {project.href ? (
                <a
                  href={project.href}
                  target={project.href.startsWith("#") ? undefined : "_blank"}
                  rel={
                    project.href.startsWith("#") ? undefined : "noreferrer noopener"
                  }
                  onClick={() => {
                    if (project.href?.startsWith("#")) sceneStore.setActive(null);
                  }}
                  className="pill pill-primary w-full"
                >
                  Enter system →
                </a>
              ) : (
                <p className="text-center text-[0.6875rem] uppercase tracking-[0.2em] text-[rgba(232,228,255,0.3)]">
                  No public entrance
                </p>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
