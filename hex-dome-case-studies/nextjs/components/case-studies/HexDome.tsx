"use client";

import gsap from "gsap";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CaseStudyShowcaseEntry } from "@/lib/case-studies-showcase";
import type { Project } from "@/lib/projects";
import { createHexDome, type DomeCursor, type DomeHandle, type DomeItem } from "./hexDomeEngine";

/** Discipline names from lib/projects.ts, shortened for the card caption (Figma: "①Brand, ②Web"). */
const SHORT_SERVICE: Record<string, string> = {
  Branding: "Brand",
  "Website Design": "Web",
  "Product Design": "Product",
};
const shortService = (s: string) => SHORT_SERVICE[s] ?? (s.endsWith("Development") ? "Dev" : s);

const ease = "ease-[cubic-bezier(0.77,0,0.175,1)]";

interface HexDomeProps {
  projects: Project[];
  /** Optional enrichment for the open-card panel (headline, niche, badge, stat). */
  showcase: CaseStudyShowcaseEntry[];
}

/**
 * Work highlights as an infinite, draggable dome of cards (Figma: PIXELUP
 * Brand 2026, "Some highlights from our recent projects"). Drag or throw to
 * explore, click a card to open its panel. The WebGL side lives in
 * hexDomeEngine.ts; this component owns the overlay copy, HUD and panel.
 */
export function HexDome({ projects, showcase }: HexDomeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const domeRef = useRef<DomeHandle | null>(null);

  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [cursor, setCursor] = useState<DomeCursor>("idle");
  const [opened, setOpened] = useState<number | null>(null);

  const entries = useMemo(() => new Map(showcase.map((e) => [e.slug, e])), [showcase]);

  // Videos fall back to their poster-less stream; captions read lib/projects.ts.
  const items = useMemo<DomeItem[]>(
    () =>
      projects.map((p) => ({
        media: { type: p.media.type, src: p.media.src },
        label: p.label,
        tagline: p.tagline ?? "",
        services: (p.services ?? []).map(shortService),
      })),
    [projects],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dome = createHexDome(canvas, items, {
      onProgress: setProgress,
      onReady: () => setReady(true),
      onActive: setActive,
      onCursor: setCursor,
      onDragging: setDragging,
      onOpen: setOpened,
    });
    domeRef.current = dome;
    return () => {
      dome.destroy();
      domeRef.current = null;
    };
  }, [items]);

  // Custom cursor follows the pointer while it's over the dome.
  useEffect(() => {
    const canvas = canvasRef.current;
    const el = cursorRef.current;
    if (!canvas || !el) return;
    const x = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3" });
    const y = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3" });
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const rect = canvas.getBoundingClientRect();
      x(e.clientX - rect.left);
      y(e.clientY - rect.top);
      el.style.opacity = "1";
    };
    const leave = () => {
      el.style.opacity = "0";
    };
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerleave", leave);
    return () => {
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
    };
  }, []);

  // Headline intro once the cards start flying in.
  useEffect(() => {
    if (!ready || !titleRef.current) return;
    const lines = titleRef.current.querySelectorAll("[data-line]");
    const tween = gsap.fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: 1.4, stagger: 0.07, ease: "expo.out", delay: 0.5 });
    return () => {
      tween.kill();
    };
  }, [ready]);

  // Panel copy reveal on open.
  useEffect(() => {
    if (opened === null || !panelRef.current) return;
    const panel = panelRef.current;
    const ctx = gsap.context(() => {
      gsap.fromTo("[data-word]", { yPercent: 110 }, { yPercent: 0, duration: 1.1, stagger: 0.025, ease: "expo.out", delay: 0.55 });
      gsap.fromTo("[data-reveal]", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.06, ease: "expo.out", delay: 0.7 });
    }, panel);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    addEventListener("keydown", onKey);
    return () => {
      ctx.revert();
      removeEventListener("keydown", onKey);
    };
  }, [opened]);

  function close() {
    domeRef.current?.close();
    setOpened(null);
    canvasRef.current?.focus({ preventScroll: true });
  }

  const project = opened !== null ? projects[opened] : null;
  const entry = project ? entries.get(project.slug) : undefined;
  const headline = entry?.title ?? project?.tagline ?? project?.label ?? "";
  const isOpen = opened !== null;
  const activeProject = projects[active];

  return (
    <section
      aria-label="Work highlights"
      className="relative h-[calc(100svh-4rem)] min-h-[560px] select-none overflow-hidden bg-base"
    >
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label="Interactive dome of PIXELUP LABS case studies. Drag or use the arrow keys to explore, click or press Enter to open a project."
        className="absolute inset-0 h-full w-full touch-pan-y font-display outline-none [@media(hover:hover)]:cursor-none"
      />

      {/* Depth: darkens behind the headline and around the edges */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${ease} ${dragging ? "opacity-50" : ""}`}
        style={{
          background:
            "radial-gradient(ellipse 60% 38% at 50% 26%, rgb(0 0 0 / 0.78), transparent 72%), radial-gradient(ellipse 120% 90% at 50% 60%, transparent 55%, rgb(0 0 0 / 0.85) 100%)",
        }}
      />

      {/* Headline (Figma: WORK IV / SOME HIGHLIGHTS FROM OUR RECENT PROJECTS) */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-[6vh] flex flex-col items-center text-center transition-[opacity,filter,transform] duration-700 ${ease} ${
          dragging || isOpen ? "-translate-y-3 scale-[0.98] opacity-0 blur-sm" : ""
        } ${ready ? "" : "opacity-0"}`}
      >
        <p className="flex items-start gap-1 text-[13px] text-muted-65">
          WORK<sup className="text-[8px] leading-none">IV</sup>
        </p>
        <h2
          ref={titleRef}
          className="mt-[4.6vh] flex flex-col items-center text-[34px] font-medium uppercase leading-[0.82] tracking-[-0.045em] text-white desk:text-[clamp(40px,4.4vw,64px)]"
        >
          {["Some", "highlights", "from our", "recent", "projects"].map((line) => (
            <span key={line} className="block overflow-hidden px-[0.04em] pt-[0.06em] pb-[0.02em]">
              <span data-line className="block">
                {line}
              </span>
            </span>
          ))}
        </h2>
      </div>

      {/* HUD */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 grid grid-cols-[1fr_auto] items-center p-4 text-[11px] uppercase tracking-[0.08em] text-muted-65 transition-[opacity,transform] duration-500 desk:grid-cols-[1fr_auto_1fr] desk:p-5 ${ease} ${
          isOpen ? "translate-y-5 opacity-0" : ""
        }`}
      >
        <p className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          {ready ? "Drag to explore" : `Loading work ${String(Math.round(progress * 100)).padStart(3, "0")}%`}
        </p>
        <div className="flex items-center gap-3.5 text-white tabular-nums">
          <span>{String(active + 1).padStart(2, "0")}</span>
          <div className="flex h-3.5 items-center gap-[5px]">
            {projects.map((p, i) => (
              <i
                key={p.slug}
                className={`block transition-all duration-400 ${ease} ${
                  i === active ? "h-3.5 w-0.5 bg-white" : "h-2 w-px bg-white/30"
                }`}
              />
            ))}
          </div>
          <span>{String(projects.length).padStart(2, "0")}</span>
        </div>
        <p className="hidden justify-self-end text-white desk:block">{activeProject?.label}</p>
      </div>

      {/* Open project */}
      <div
        aria-hidden={!isOpen}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className={`absolute inset-0 flex items-end ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${ease} ${isOpen ? "opacity-100" : "opacity-0"}`}
          style={{ background: "linear-gradient(to top, rgb(0 0 0 / 0.95) 0%, rgb(0 0 0 / 0.6) 22%, transparent 40%)" }}
        />
        <button
          type="button"
          onClick={close}
          aria-label="Close project"
          tabIndex={isOpen ? 0 : -1}
          className={`absolute top-4 right-4 z-10 h-[52px] w-[52px] cursor-pointer rounded-full border border-hairline bg-base/40 backdrop-blur-md transition-[opacity,transform,border-color] duration-700 hover:border-white desk:top-5 desk:right-5 ${ease} ${
            isOpen ? "opacity-100" : "scale-60 -rotate-90 opacity-0"
          }`}
        >
          <span className="absolute top-1/2 left-1/2 h-px w-[18px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white" />
          <span className="absolute top-1/2 left-1/2 h-px w-[18px] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-white" />
        </button>

        {project && (
          <div
            ref={panelRef}
            key={project.slug}
            className="relative grid w-full grid-cols-1 items-end gap-6 p-4 pb-7 desk:grid-cols-[1.25fr_1fr_auto] desk:gap-12 desk:p-5 desk:pb-10"
          >
            <div>
              <p data-reveal className="mb-4 flex items-center gap-1.5 text-[12px] uppercase tracking-[0.06em] text-muted-65">
                {String((opened ?? 0) + 1).padStart(2, "0")} / {project.label}
                {entry?.badge && (
                  <span className="ml-2.5 flex items-end">
                    <span className="h-1 w-1.5 shrink-0 bg-highlight" />
                    <span className="bg-label-grey/20 px-1 py-px text-[12px] font-medium text-white">{entry.badge}</span>
                  </span>
                )}
              </p>
              <h3 className="max-w-[18ch] text-[28px] font-medium leading-[1.02] tracking-[-0.035em] text-white desk:text-[clamp(28px,3vw,46px)]">
                {headline.split(" ").map((word, i) => (
                  <span key={i} className="-mb-[0.08em] inline-block overflow-hidden pb-[0.08em] align-top">
                    <span data-word className="inline-block">
                      {word}
                    </span>
                    {" "}
                  </span>
                ))}
              </h3>
            </div>
            <dl className="grid grid-cols-2 gap-x-7 gap-y-5 text-[12px] desk:text-[13px]">
              {[
                ["Industry", entry?.niche],
                ["What we did", entry?.whatWeDid ?? project.services?.join(", ")],
                ["Year", project.year],
                ["Result", entry?.stat],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} data-reveal className="border-t-[0.5px] border-hairline pt-2.5">
                    <dt className="mb-1.5 text-[10px] uppercase tracking-[0.08em] text-label-grey">{k}</dt>
                    <dd className="leading-[1.4] text-white">{v}</dd>
                  </div>
                ))}
            </dl>
            <CtaCircle project={project} />
          </div>
        )}
      </div>

      {/* Cursor */}
      <div
        ref={cursorRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 z-20 opacity-0 [@media(hover:none)]:hidden"
      >
        <div
          className={`-mt-[42px] -ml-[42px] grid h-[84px] w-[84px] place-items-center rounded-full bg-white text-[10px] uppercase tracking-[0.12em] text-base transition-transform duration-500 ${ease} ${
            cursor === "view" ? "scale-100" : cursor === "drag" ? "scale-[0.62]" : "scale-[0.14] mix-blend-difference"
          }`}
        >
          <span className={`transition-opacity duration-200 ${cursor === "idle" ? "opacity-0" : "opacity-100"}`}>
            {cursor === "drag" ? "Drag" : "View"}
          </span>
        </div>
      </div>
    </section>
  );
}

/** Round white CTA — internal case studies route in-app, external work opens the live site. */
function CtaCircle({ project }: { project: Project }) {
  const className =
    "group absolute right-4 -top-24 grid h-24 w-24 place-items-center rounded-full bg-white text-center text-[13px] font-medium text-base transition-transform duration-500 hover:scale-[1.06] desk:static desk:h-[132px] desk:w-[132px] " +
    ease;
  const inner = (
    <>
      <span className="max-w-[9ch] leading-[1.1]">{project.external ? "Visit live site" : "View case study"}</span>
      <span className={`absolute top-4 right-6 transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1 desk:top-[22px] desk:right-[30px] ${ease}`}>
        ↗
      </span>
    </>
  );
  return project.external ? (
    <a data-reveal href={project.href} target="_blank" rel="noopener noreferrer" className={className}>
      {inner}
    </a>
  ) : (
    <Link data-reveal href={project.href} className={className}>
      {inner}
    </Link>
  );
}
