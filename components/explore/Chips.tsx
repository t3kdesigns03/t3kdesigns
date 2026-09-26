"use client";

import { useEffect, useRef } from "react";
import { flyTo } from "./flight";
import { hub, worlds, type Body } from "./layout";
import { CHIP, KIND } from "./looks";
import { useExplore } from "./store";

/**
 * A world at thirty pixels: SVG, painted from the same palette as the 3D
 * body — lit from above like every parked shot, a band of night along the
 * bottom, the atmosphere as a rim, and the one feature that identifies it
 * (a ring, a landmark light, an unfinished frame). No extra WebGL.
 */
function MiniWorld({ w, size }: { w: Body; size: number }) {
  const L = w.look;
  const [hi, mid, lo] = CHIP[w.id]?.tones ?? [L.c, L.b, L.a];
  const g = `mw-${w.id}`;
  const ring = L.ring;
  const station = L.kind === KIND.station;
  const tilt = -14;
  // one ring, or — for a ripple — two thin ones fading colour outward
  const loops = ring
    ? ring.ripple
      ? [
          { rx: 12 * 1.3, ry: 3.3, color: ring.color },
          { rx: 12 * 1.62, ry: 4.3, color: ring.color2 ?? ring.color },
        ]
      : [{ rx: 12 * Math.min(ring.outer, 1.62), ry: 3.6, color: ring.color }]
    : [];
  const width = ring?.ripple ? 0.9 : 1.4;
  const markerGlow = L.marker && L.kind === KIND.holler ? L.marker.glow : L.lights;

  return (
    <svg width={size} height={size} viewBox="-20 -20 40 40" aria-hidden className="shrink-0 overflow-visible">
      <defs>
        <radialGradient id={`${g}-s`} cx="42%" cy="26%" r="78%">
          <stop offset="0" stopColor={hi} />
          <stop offset="0.5" stopColor={mid} />
          <stop offset="0.92" stopColor={lo} />
        </radialGradient>
        <linearGradient id={`${g}-n`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.52" stopColor="#030208" stopOpacity="0" />
          <stop offset="0.8" stopColor="#030208" stopOpacity="0.72" />
          <stop offset="1" stopColor="#030208" stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id={`${g}-g`}>
          <stop offset="0" stopColor={markerGlow} />
          <stop offset="1" stopColor={markerGlow} stopOpacity="0" />
        </radialGradient>
      </defs>

      {loops.map((o) => (
        <ellipse
          key={`b${o.rx}`}
          rx={o.rx}
          ry={o.ry}
          transform={`rotate(${tilt})`}
          fill="none"
          stroke={o.color}
          strokeOpacity={0.5}
          strokeWidth={width}
        />
      ))}

      <circle r="12" fill={`url(#${g}-s)`} />
      {station && (
        <g stroke={w.accent} strokeOpacity="0.55" strokeWidth="0.7" fill="none">
          <ellipse rx="4.5" ry="12" />
          <ellipse rx="9" ry="12" />
          <line x1="-12" y1="0" x2="12" y2="0" />
          <line x1="-10.4" y1="-6" x2="10.4" y2="-6" />
          <line x1="-10.4" y1="6" x2="10.4" y2="6" />
          <circle r="3.2" fill={w.accent} fillOpacity="0.7" stroke="none" />
        </g>
      )}
      <circle r="12" fill={`url(#${g}-n)`} />
      {L.marker && (
        <>
          <circle cx="2.5" cy="8.2" r="3.4" fill={`url(#${g}-g)`} opacity="0.7" />
          <circle cx="2.5" cy="8.2" r="0.95" fill={markerGlow} />
        </>
      )}
      {L.atmoStrength > 0 && (
        <circle
          r="12.5"
          fill="none"
          stroke={L.atmo}
          strokeOpacity={Math.min(0.75, 0.25 + L.atmoStrength * 0.4)}
          strokeWidth="1"
        />
      )}

      {loops.map((o) => (
        <path
          key={`f${o.rx}`}
          d={`M ${-o.rx} 0 A ${o.rx} ${o.ry} 0 0 0 ${o.rx} 0`}
          transform={`rotate(${tilt})`}
          fill="none"
          stroke={o.color}
          strokeOpacity={0.85}
          strokeWidth={width}
        />
      ))}
    </svg>
  );
}

function Chip({
  w,
  on,
  coarse,
}: {
  w: Body;
  on: boolean;
  coarse: boolean;
}) {
  const short = CHIP[w.id]?.short ?? w.name;
  return (
    <button
      type="button"
      data-world={w.id}
      aria-label={`Fly to ${w.name}`}
      aria-pressed={on}
      onClick={() => flyTo(w)}
      className="chip group relative flex min-h-11 shrink-0 snap-center items-center gap-2 rounded-full py-1 pl-1.5 pr-3 transition-colors duration-300 hover:bg-[rgba(203,182,255,0.07)] focus-visible:bg-[rgba(203,182,255,0.07)]"
      style={{ scrollMarginInline: "1.5rem" }}
    >
      <span
        className="relative grid place-items-center rounded-full transition-shadow duration-500"
        style={{
          boxShadow: on
            ? `0 0 0 2px rgba(5,3,10,0.9), 0 0 0 3px ${w.accent}, 0 0 18px 2px ${w.accent}66`
            : "none",
        }}
      >
        <MiniWorld w={w} size={coarse ? 26 : 30} />
      </span>
      <span
        className="max-w-[6.5rem] text-left text-[0.6875rem] leading-[1.15] tracking-[0.04em] transition-colors duration-300 sm:text-[0.75rem]"
        style={{ color: on ? "var(--ice)" : "rgba(232,228,255,0.62)" }}
      >
        {short}
      </span>

      {/* the destination hover: full name and one line, desktop pointers only */}
      <span
        role="tooltip"
        className="chip-tip pointer-events-none absolute bottom-[calc(100%+0.6rem)] left-1/2 w-max max-w-[16rem] -translate-x-1/2 translate-y-1 rounded-2xl px-3.5 py-2.5 text-left opacity-0 transition-all duration-300"
      >
        <span className="block text-[0.6875rem] uppercase tracking-[0.2em] text-ice">{w.name}</span>
        <span
          aria-hidden
          className="my-1.5 block h-px w-full"
          style={{ background: `linear-gradient(90deg, ${w.accent}aa, transparent)` }}
        />
        {w.project?.oneLiner && (
          <span className="block text-[0.75rem] leading-snug text-[rgba(232,228,255,0.7)]">
            {w.project.oneLiner}
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * Every destination as a chip: a mini world and a name. The studio's own
 * products (inner lanes, sun outward) and the client sites (outer lanes)
 * are two labelled groups. On a phone each group is a row that
 * snap-scrolls sideways, and the chip you are flying to is scrolled into
 * view as the autopilot takes it.
 */
export default function Chips({ coarse, reduced }: { coarse: boolean; reduced: boolean }) {
  const parked = useExplore((s) => s.parked);
  const target = useExplore((s) => s.target);
  const root = useRef<HTMLDivElement>(null);
  const active = target ?? parked;

  useEffect(() => {
    if (!active || !root.current) return;
    const el = root.current.querySelector<HTMLElement>(`[data-world="${CSS.escape(active)}"]`);
    const row = el?.parentElement;
    if (!el || !row || row.scrollWidth <= row.clientWidth) return;
    const left = el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2;
    row.scrollTo({ left, behavior: reduced ? "auto" : "smooth" });
  }, [active, reduced]);

  const groups = [
    // the hub leads its ring: it is where you start
    {
      label: "inner",
      list: worlds
        .filter((w) => w.ring === "inner")
        .sort((a, b) => Number(b.id === hub.id) - Number(a.id === hub.id)),
    },
    { label: "outer", list: worlds.filter((w) => w.ring === "outer") },
  ];

  return (
    <div
      ref={root}
      role="group"
      aria-label="Worlds"
      className="glass pointer-events-auto flex w-full max-w-[min(66rem,calc(100vw-1.5rem))] flex-col gap-0.5 rounded-[1.4rem] px-1.5 py-1.5 sm:px-3 sm:py-2"
    >
      {groups.map((g, i) => (
        <div key={g.label} className={`flex items-center ${i ? "border-t border-[rgba(203,182,255,0.08)] pt-0.5" : ""}`}>
          <span className="w-11 shrink-0 pl-1.5 text-[0.5rem] uppercase tracking-[0.18em] text-[rgba(203,182,255,0.42)] sm:w-12 sm:pl-2 sm:text-[0.5625rem] sm:tracking-[0.24em]">
            {g.label}
          </span>
          <div
            className="chip-row flex min-w-0 flex-1 snap-x snap-mandatory items-center gap-0.5 overflow-x-auto overscroll-x-contain sm:flex-wrap sm:justify-start sm:overflow-visible"
            style={{
              touchAction: "pan-x",
              scrollbarWidth: "none",
            }}
          >
            {g.list.map((w) => (
              <Chip key={w.id} w={w} on={active === w.id} coarse={coarse} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
