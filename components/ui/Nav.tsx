"use client";

import { EASE } from "@/lib/motion";
import { motion } from "framer-motion";
import Link from "next/link";
import { useScene } from "@/lib/store";

const links = [
  { href: "#work", label: "work" },
  { href: "#studio", label: "studio" },
  { href: "#contact", label: "contact" },
];

export default function Nav() {
  const failed = useScene((s) => s.webglFailed);

  return (
    <motion.header
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
      className="pointer-events-none fixed inset-x-0 top-[calc(0.75rem+env(safe-area-inset-top))] z-40 flex justify-center px-3 sm:top-[calc(1.25rem+env(safe-area-inset-top))]"
    >
      <nav
        aria-label="Primary"
        className="glass pointer-events-auto flex max-w-full items-center gap-0.5 rounded-full py-1 pl-2.5 pr-1.5 sm:gap-2 sm:py-2 sm:pl-5 sm:pr-2"
      >
        <a
          href="#top"
          aria-label="T3KDesigns, back to top"
          className="nav-target group mr-0.5 flex shrink-0 gap-[0.3rem] px-1 sm:mr-3 sm:px-1.5"
        >
          <span className="display text-[1.0625rem] leading-none text-ice">T3K</span>
          {/* the wordmark tail gives way on narrow phones before any link does */}
          <span className="text-[0.5625rem] font-normal uppercase leading-none tracking-[0.3em] text-lilac-dim transition-colors group-hover:text-lilac max-[419px]:hidden">
            designs
          </span>
        </a>

        <ul className="flex items-center">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="nav-target flex px-2 text-[0.75rem] tracking-[0.06em] text-dim transition-colors hover:text-ice sm:px-3.5 sm:tracking-[0.08em]"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {!failed && (
          // no prefetch: the homepage must never download the game
          <Link
            href="/explore"
            prefetch={false}
            className="nav-target group ml-1 flex shrink-0 gap-1.5 border border-[var(--stroke)] px-2.5 text-[0.6875rem] uppercase tracking-[0.1em] text-lilac-dim transition-colors hover:border-[rgba(203,182,255,0.32)] hover:text-ice sm:gap-2 sm:px-3.5 sm:tracking-[0.16em]"
          >
            <span
              aria-hidden
              className="size-[5px] shrink-0 rounded-full bg-[var(--lilac-dim)] transition-colors duration-500 group-hover:bg-[var(--lilac)]"
            />
            explore
          </Link>
        )}
      </nav>
    </motion.header>
  );
}
