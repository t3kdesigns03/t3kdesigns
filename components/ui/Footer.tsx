import { SITE } from "@/lib/theme";

export default function Footer() {
  return (
    <footer className="pointer-events-none relative pb-10 pt-4">
      <div className="shell">
        <div className="hairline" />
        <p className="pointer-events-auto mt-6 text-center text-[0.75rem] tracking-[0.02em] text-[rgba(232,228,255,0.42)]">
          {SITE.name} · {SITE.place} · <span className="text-lilac">{SITE.sentence}</span>
        </p>
        <p className="mt-2 text-center text-[0.625rem] uppercase tracking-[0.24em] text-[rgba(232,228,255,0.2)]">
          2026
        </p>
      </div>
    </footer>
  );
}
