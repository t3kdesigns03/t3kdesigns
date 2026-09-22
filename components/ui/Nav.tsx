"use client";

import { EASE } from "@/lib/motion";
import { motion } from "framer-motion";
import { useScene, sceneStore } from "@/lib/store";

const links = [
  { href: "#work", label: "work" },
  { href: "#studio", label: "studio" },
  { href: "#contact", label: "contact" },
];

export default function Nav() {
  const explore = useScene((s) => s.explore);
  const failed = useScene((s) => s.webglFailed);

  return (
    <motion.header
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
      className="pointer-events-none fixed inset-x-0 top-3 z-40 flex justify-center px-3 sm:top-5"
    >
      <nav
        aria-label="Primary"
        className="glass pointer-events-auto flex items-center gap-1 rounded-full py-2 pl-4 pr-2 sm:gap-2 sm:pl-5"
      >
        <a
          href="#top"
          className="group mr-1 flex items-baseline gap-[0.3rem] rounded-full px-1 py-1 sm:mr-3"
        >
          <span className="display text-[1.0625rem] leading-none text-ice">T3K</span>
          <span className="text-[0.5625rem] font-normal uppercase leading-none tracking-[0.3em] text-lilac-dim transition-colors group-hover:text-lilac">
            designs
          </span>
        </a>

        <ul className="flex items-center">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="block rounded-full px-3 py-2 text-[0.75rem] tracking-[0.08em] text-dim transition-colors hover:text-ice sm:px-3.5"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {!failed && (
          <button
            type="button"
            onClick={() => sceneStore.toggleExplore()}
            aria-pressed={explore}
            className="ml-1 hidden items-center gap-2 rounded-full border border-[var(--stroke)] px-3.5 py-2 text-[0.6875rem] uppercase tracking-[0.16em] text-lilac-dim transition-colors hover:border-[rgba(203,182,255,0.32)] hover:text-ice sm:flex"
          >
            <span
              aria-hidden
              className="size-[5px] rounded-full transition-all duration-500"
              style={{
                background: explore ? "var(--good)" : "var(--lilac-dim)",
                boxShadow: explore ? "0 0 10px 1px rgba(110,231,183,0.8)" : "none",
              }}
            />
            explore
          </button>
        )}
      </nav>
    </motion.header>
  );
}
