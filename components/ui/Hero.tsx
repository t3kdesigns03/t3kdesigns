"use client";

import { EASE } from "@/lib/motion";
import { motion } from "framer-motion";
import { useScene } from "@/lib/store";
import { SITE } from "@/lib/theme";

const rise = {
  hidden: { opacity: 0, y: 26 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 1.05, delay: 0.25 + i * 0.13, ease: EASE },
  }),
};

export default function Hero() {
  const explore = useScene((s) => s.explore);

  return (
    <section
      id="top"
      className="pointer-events-none relative flex min-h-[100svh] items-center"
    >
      <div
        aria-hidden
        className="hero-scrim pointer-events-none absolute inset-0"
      />
      <div className="shell relative grid w-full grid-cols-12 pt-28 pb-32 sm:pt-24">
        <div className="col-span-12 max-w-[42rem] lg:col-span-7 xl:col-span-6">
          <motion.p
            custom={0}
            variants={rise}
            initial="hidden"
            animate="show"
            className="eyebrow pointer-events-auto"
          >
            T3KDesigns
          </motion.p>

          <motion.h1
            custom={1}
            variants={rise}
            initial="hidden"
            animate="show"
            className="display pointer-events-auto mt-6 text-[clamp(2.75rem,7.2vw,6rem)] text-ice"
          >
            A studio in the <span className="accent">dark.</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={rise}
            initial="hidden"
            animate="show"
            className="pointer-events-auto mt-7 max-w-[30ch] text-[0.9375rem] leading-relaxed text-dim sm:text-base"
          >
            Sites. Apps. Brands. Strange little tools. Built to feel inevitable.
          </motion.p>

          <motion.p
            custom={3}
            variants={rise}
            initial="hidden"
            animate="show"
            className="verbatim pointer-events-auto mt-12 text-[clamp(1.375rem,3.05vw,2.35rem)]"
          >
            We design <span className="accent">whatever</span> you want.
          </motion.p>

          <motion.div
            custom={4}
            variants={rise}
            initial="hidden"
            animate="show"
            className="mt-11 flex flex-wrap items-center gap-3"
          >
            <a href="#work" className="pill pill-primary pointer-events-auto">
              See the work
            </a>
            <a href="#contact" className="pill pill-ghost pointer-events-auto">
              Start a project
            </a>
          </motion.div>
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, delay: 1.5 }}
        className="absolute inset-x-0 bottom-7 text-center text-[0.625rem] uppercase tracking-[0.3em] text-[rgba(232,228,255,0.3)]"
      >
        {explore ? "drag to drift" : `scroll to enter the system`}
      </motion.p>

      <span className="sr-only">{SITE.sentence}</span>
    </section>
  );
}
