import Link from "next/link";
import { projects } from "@/lib/projects";

const toHref = (href?: string) =>
  href ? (href.startsWith("#") ? `/${href}` : href) : undefined;

/** No WebGL: the void and the eight names. Never a white crash. */
export default function Fallback() {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-void">
      <div className="css-galaxy" aria-hidden />
      <div className="shell relative flex min-h-full flex-col justify-center py-24">
        <Link
          href="/"
          prefetch={false}
          className="eyebrow inline-block py-2 transition-colors hover:text-ice"
        >
          ← T3KDesigns
        </Link>
        <ul className="mt-8 flex flex-col gap-1">
          {projects.map((p) => {
            const href = toHref(p.href);
            return (
              <li key={p.id} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="size-[7px] rounded-full"
                  style={{ background: p.color, boxShadow: `0 0 10px 0 ${p.color}` }}
                />
                {href && href.startsWith("http") ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="display inline-block py-2 text-[clamp(1.35rem,4.5vw,2rem)] text-ice transition-colors hover:text-lilac"
                  >
                    {p.name}
                  </a>
                ) : href ? (
                  <Link
                    href={href}
                    prefetch={false}
                    className="display inline-block py-2 text-[clamp(1.35rem,4.5vw,2rem)] text-ice transition-colors hover:text-lilac"
                  >
                    {p.name}
                  </Link>
                ) : (
                  <span className="display inline-block py-2 text-[clamp(1.35rem,4.5vw,2rem)] text-dim">
                    {p.name}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
