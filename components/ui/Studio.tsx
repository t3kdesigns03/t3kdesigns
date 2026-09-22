"use client";

import { EASE } from "@/lib/motion";
import { motion } from "framer-motion";
import { SITE } from "@/lib/theme";

const points = ["Design the object", "Build the engine", "Ship it dark and quiet"];

export default function Studio() {
  return (
    <section
      id="studio"
      className="pointer-events-none relative flex min-h-[85svh] items-center overflow-x-clip py-24 sm:py-28"
    >
      <div className="shell relative w-full">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1, ease: EASE }}
          className="pointer-events-auto relative mx-auto max-w-[44rem] text-center"
        >
          <div
            aria-hidden
            className="copy-veil pointer-events-none absolute -inset-x-6 -inset-y-14 sm:-inset-x-16 sm:-inset-y-20"
          />
          <div className="relative">
          <p className="eyebrow">Studio</p>

          <h2 className="display mt-6 text-[clamp(2rem,5.4vw,3.75rem)] text-ice">
            The interface <span className="accent">disappears.</span>
          </h2>

          <p className="mx-auto mt-7 max-w-[38ch] text-[0.9375rem] leading-relaxed text-dim sm:text-base">
            What remains is the thing you asked for — clear, fast, and a little bit
            impossible. Tell us what you need. We make it real.
          </p>

          <p className="verbatim mt-11 text-[clamp(1.125rem,2.4vw,1.75rem)] text-lilac">
            {SITE.sentence}
          </p>

          <ul className="mx-auto mt-14 flex max-w-[34rem] flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-6">
            {points.map((p) => (
              <li
                key={p}
                className="text-[0.6875rem] uppercase tracking-[0.2em] text-[rgba(232,228,255,0.4)]"
              >
                {p}
              </li>
            ))}
          </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
