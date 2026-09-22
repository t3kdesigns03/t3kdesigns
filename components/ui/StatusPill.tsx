import { statusColor, statusLabel, type ProjectStatus } from "@/lib/projects";

export default function StatusPill({
  status,
  size = "sm",
}: {
  status: ProjectStatus;
  size?: "sm" | "md";
}) {
  const color = statusColor[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-[0.4rem] rounded-full border border-[var(--stroke)] uppercase tracking-[0.16em] ${
        size === "md"
          ? "px-2.5 py-1 text-[0.625rem]"
          : "px-2 py-[0.1875rem] text-[0.5625rem]"
      }`}
      style={{ color, background: "rgba(232,228,255,0.03)" }}
    >
      <span
        aria-hidden
        className="size-[4px] rounded-full"
        style={{ background: color, boxShadow: `0 0 8px 0 ${color}` }}
      />
      {statusLabel[status]}
    </span>
  );
}
