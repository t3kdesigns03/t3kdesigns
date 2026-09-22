"use client";

import { EASE } from "@/lib/motion";
import { motion } from "framer-motion";
import { useState } from "react";
import { SITE } from "@/lib/theme";

const ENDPOINT = process.env.NEXT_PUBLIC_FORM_ENDPOINT;

type Fields = { name: string; email: string; want: string };

export default function Contact() {
  const [f, setF] = useState<Fields>({ name: "", email: "", want: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const mailto = () => {
    const subject = `Transmission from ${f.name || "someone in the dark"}`;
    const body = [
      `Name: ${f.name}`,
      `Email: ${f.email}`,
      "",
      f.want,
      "",
      "— sent from t3kdesigns.app",
    ].join("\n");
    return `mailto:${SITE.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // With an endpoint configured we post; without one, mailto always works.
    if (ENDPOINT) {
      setSending(true);
      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(f),
        });
        if (!res.ok) throw new Error("bad response");
        setSent(true);
        setF({ name: "", email: "", want: "" });
        return;
      } catch {
        setError("That didn't send. Opening your mail app instead.");
      } finally {
        setSending(false);
      }
    }

    window.location.href = mailto();
  };

  return (
    <section
      id="contact"
      className="pointer-events-none relative flex min-h-[90svh] items-center py-28"
    >
      <div className="shell w-full">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1, ease: EASE }}
          className="glass pointer-events-auto mx-auto w-full max-w-[40rem] rounded-[1.5rem] px-6 py-9 sm:px-10 sm:py-11"
        >
          <p className="eyebrow">Contact</p>
          <h2 className="display mt-5 text-[clamp(1.75rem,4.4vw,2.75rem)] text-ice">
            Don&rsquo;t brief a committee.
            <br />
            Brief <span className="accent">one studio.</span>
          </h2>

          {sent ? (
            <div className="mt-9">
              <p className="text-[0.9375rem] text-good">
                Received. We&rsquo;ll come back to you at {SITE.email}.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="pill pill-ghost mt-7"
              >
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-9 flex flex-col gap-5">
              <Field
                id="name"
                label="Name"
                value={f.name}
                onChange={set("name")}
                required
                autoComplete="name"
              />
              <Field
                id="email"
                label="Email"
                type="email"
                value={f.email}
                onChange={set("email")}
                required
                autoComplete="email"
              />
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="want"
                  className="text-[0.625rem] uppercase tracking-[0.22em] text-[rgba(232,228,255,0.42)]"
                >
                  What you want
                </label>
                <textarea
                  id="want"
                  name="want"
                  rows={4}
                  required
                  value={f.want}
                  onChange={set("want")}
                  placeholder="A site, an app, a tool nobody has built yet…"
                  className="w-full resize-y rounded-xl border border-[var(--stroke)] bg-[rgba(232,228,255,0.03)] px-4 py-3 text-[0.9375rem] text-ice outline-none transition-colors placeholder:text-[rgba(232,228,255,0.24)] focus:border-[rgba(203,182,255,0.4)]"
                />
              </div>

              {error && (
                <p className="text-[0.8125rem] text-[#ffb37a]" role="status">
                  {error}
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={sending}
                  className="pill pill-primary disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Send transmission"}
                </button>
                <p className="text-[0.75rem] text-[rgba(232,228,255,0.38)]">
                  or write to{" "}
                  <a
                    href={`mailto:${SITE.email}`}
                    className="text-lilac underline decoration-[rgba(203,182,255,0.3)] underline-offset-4 transition-colors hover:text-ice"
                  >
                    {SITE.email}
                  </a>
                </p>
              </div>

              <p className="text-[0.75rem] text-[rgba(232,228,255,0.38)]">
                or reach out on X{" "}
                <a
                  href={SITE.xUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-lilac underline decoration-[rgba(203,182,255,0.3)] underline-offset-4 transition-colors hover:text-ice"
                >
                  {SITE.x}
                </a>
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}

function Field({
  id,
  label,
  type = "text",
  ...rest
}: {
  id: string;
  label: string;
  type?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="text-[0.625rem] uppercase tracking-[0.22em] text-[rgba(232,228,255,0.42)]"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        className="w-full rounded-xl border border-[var(--stroke)] bg-[rgba(232,228,255,0.03)] px-4 py-3 text-[0.9375rem] text-ice outline-none transition-colors placeholder:text-[rgba(232,228,255,0.24)] focus:border-[rgba(203,182,255,0.4)]"
        {...rest}
      />
    </div>
  );
}
