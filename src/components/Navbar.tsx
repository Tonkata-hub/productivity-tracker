"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, PlusCircle, ListChecks, Dumbbell, Home, Menu, X, BarChart2, Sparkles, Shuffle, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  icon: typeof Home | typeof CalendarDays | typeof PlusCircle | typeof Dumbbell | typeof ListChecks | typeof BarChart2 | typeof LayoutList;
  label: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { icon: Home, label: "Home", href: "/" },
  { icon: CalendarDays, label: "Calendar", href: "/calendar" },
  { icon: LayoutList, label: "Day Planner", href: "/day-planner" },
  { icon: Dumbbell, label: "Gym", href: "/gym" },
  { icon: PlusCircle, label: "Add Task", href: "/add-task" },
  { icon: ListChecks, label: "Manage Tasks", href: "/manage-tasks" },
  { icon: BarChart2, label: "Stats", href: "/stats" },
];

const GRADIENT_VARIANT_COUNT = 4;
const SHUFFLE_FADE_MS = 420;
const GRADIENT_PREFERENCE_EVENT = "homepage-gradient-preference-change";

function subscribeGradientPreference(notify: () => void) {
  if (typeof window === "undefined") return () => {};
  const onPreferenceChange = () => notify();
  window.addEventListener("storage", onPreferenceChange);
  window.addEventListener(GRADIENT_PREFERENCE_EVENT, onPreferenceChange);
  return () => {
    window.removeEventListener("storage", onPreferenceChange);
    window.removeEventListener(GRADIENT_PREFERENCE_EVENT, onPreferenceChange);
  };
}

function useGradientPreference<T>(getSnapshot: () => T, getServerSnapshot: () => T) {
  return useSyncExternalStore(subscribeGradientPreference, getSnapshot, getServerSnapshot);
}

function GradientButtons({
  gradientEnabled,
  onToggle,
  onShuffle,
  size,
}: {
  gradientEnabled: boolean;
  onToggle: () => void;
  onShuffle: () => void;
  size: "desktop" | "mobile";
}) {
  const buttonClass =
    size === "desktop"
      ? "flex h-10 w-24 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-all duration-150 hover:bg-white/6 hover:text-foreground"
      : "flex h-12 w-28 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-all duration-150 hover:text-foreground hover:bg-white/6";

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={onToggle}
        className={buttonClass}
        aria-pressed={gradientEnabled}
        type="button"
      >
        <Sparkles className={cn("size-4 shrink-0", gradientEnabled && "text-accent")} />
        Gradient
      </button>
      <button
        onClick={onShuffle}
        className={buttonClass}
        type="button"
      >
        <Shuffle className="size-4 shrink-0" />
        Shuffle
      </button>
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const shuffleTimeoutRef = useRef<number | null>(null);
  const shuffleFrameRef = useRef<number | null>(null);
  const close = () => setOpen(false);

  const gradientEnabled = useGradientPreference(
    () => {
      const saved = window.localStorage.getItem("homepage-gradient-enabled");
      return saved == null ? true : saved === "true";
    },
    () => true
  );
  const gradientVariant = useGradientPreference(
    () => {
      const raw = window.localStorage.getItem("homepage-gradient-variant");
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed >= GRADIENT_VARIANT_COUNT) return 0;
      return parsed;
    },
    () => 0
  );

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    document.body.classList.toggle("home-gradient-enabled", gradientEnabled);
    document.body.dataset.homeGradientVariant = String(gradientVariant);
  }, [gradientEnabled, gradientVariant]);

  const toggleHomepageGradient = () => {
    const next = !gradientEnabled;
    window.localStorage.setItem("homepage-gradient-enabled", String(next));
    window.dispatchEvent(new Event(GRADIENT_PREFERENCE_EVENT));
  };
  const shuffleHomepageGradient = () => {
    const choices = Array.from({ length: GRADIENT_VARIANT_COUNT }, (_, i) => i).filter((i) => i !== gradientVariant);
    const next = choices[Math.floor(Math.random() * choices.length)] ?? 0;

    if (shuffleTimeoutRef.current != null) {
      window.clearTimeout(shuffleTimeoutRef.current);
      shuffleTimeoutRef.current = null;
    }
    if (shuffleFrameRef.current != null) {
      window.cancelAnimationFrame(shuffleFrameRef.current);
      shuffleFrameRef.current = null;
    }

    document.body.dataset.homeGradientPrevVariant = String(gradientVariant);
    document.body.classList.remove("home-gradient-crossfade-active");
    document.body.classList.add("home-gradient-crossfade-start");
    window.localStorage.setItem("homepage-gradient-variant", String(next));
    window.dispatchEvent(new Event(GRADIENT_PREFERENCE_EVENT));

    shuffleFrameRef.current = window.requestAnimationFrame(() => {
      shuffleFrameRef.current = window.requestAnimationFrame(() => {
        document.body.classList.remove("home-gradient-crossfade-start");
        document.body.classList.add("home-gradient-crossfade-active");
        shuffleFrameRef.current = null;
      });
    });
    shuffleTimeoutRef.current = window.setTimeout(() => {
      document.body.classList.remove("home-gradient-crossfade-active");
      delete document.body.dataset.homeGradientPrevVariant;
      shuffleTimeoutRef.current = null;
    }, SHUFFLE_FADE_MS);
  };

  useEffect(
    () => () => {
      if (shuffleTimeoutRef.current != null) {
        window.clearTimeout(shuffleTimeoutRef.current);
      }
      if (shuffleFrameRef.current != null) {
        window.cancelAnimationFrame(shuffleFrameRef.current);
      }
      document.body.classList.remove("home-gradient-crossfade-start");
      document.body.classList.remove("home-gradient-crossfade-active");
      delete document.body.dataset.homeGradientPrevVariant;
    },
    []
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside className="hidden md:flex fixed top-0 left-0 h-full w-56 flex-col z-50 border-r border-white/5 navbar-glass">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-3 px-5 h-16 border-b border-white/5 shrink-0"
          aria-label="Go to homepage"
        >
          <div className="flex size-8 items-center justify-center rounded-xl bg-accent shadow-md shadow-accent/40">
            <CalendarDays className="size-4 text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-bold tracking-tight text-foreground">Productivity</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tracker</span>
          </div>
        </Link>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col gap-0.5 px-3 py-4 overflow-y-auto">
          {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-base font-medium transition-all duration-150",
                  active ? "bg-accent/12 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-white/6"
                )}
              >
                <Icon className={cn("size-4 shrink-0", active && "text-accent")} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-white/5 shrink-0">
          <GradientButtons
            gradientEnabled={gradientEnabled}
            onToggle={toggleHomepageGradient}
            onShuffle={shuffleHomepageGradient}
            size="desktop"
          />
        </div>

        {/* Sign out
        <div className="px-3 py-4 border-t border-white/5 shrink-0">
          <Link
            href="/signout"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-base font-medium text-muted-foreground transition-all duration-150 hover:text-foreground hover:bg-white/6"
          >
            <LogOut className="size-4 shrink-0" />
            Sign out
          </Link>
        </div> */}
      </aside>

      {/* ── Mobile top bar ─────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 md:hidden navbar-glass border-b border-white/5">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3" aria-label="Go to homepage">
            <div className="flex size-8 items-center justify-center rounded-xl bg-accent shadow-md shadow-accent/40">
              <CalendarDays className="size-4 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-bold tracking-tight text-foreground">Productivity</span>
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tracker</span>
            </div>
          </Link>

          {/* Hamburger / Close */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center justify-center size-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/6 transition-colors duration-150"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav-drawer"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {/* Slide-down drawer */}
        <div
          id="mobile-nav-drawer"
          className="overflow-x-hidden overflow-y-auto transition-[max-height] duration-300 ease-in-out"
          style={{ maxHeight: open ? "calc(100dvh - 3.5rem)" : "0px" }}
          aria-hidden={!open}
          {...(!open ? { inert: true } : {})}
        >
          <nav className="flex flex-col px-3 py-2">
            {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={close}
                  className={cn(
                    "flex items-center gap-3 px-3 h-14 rounded-xl text-base font-medium transition-all duration-150",
                    active ? "bg-accent/12 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-white/6"
                  )}
                >
                  <Icon className={cn("size-5 shrink-0", active && "text-accent")} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/5 mx-3" />

          <div className="px-3 pt-2 pb-5" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
            <GradientButtons
              gradientEnabled={gradientEnabled}
              onToggle={toggleHomepageGradient}
              onShuffle={shuffleHomepageGradient}
              size="mobile"
            />
          </div>

          {/* <div className="border-t border-white/5 mx-3" />

          <div className="px-3 py-2">
            <Link
              href="/signout"
              onClick={close}
              className="flex items-center gap-3 px-3 h-14 rounded-xl text-base font-medium text-muted-foreground transition-all duration-150 hover:text-foreground hover:bg-white/6"
            >
              <LogOut className="size-5 shrink-0" />
              Sign out
            </Link>
          </div> */}
        </div>
      </header>

      {/* Backdrop — closes menu on outside tap */}
      {open && <div className="fixed inset-0 z-40 md:hidden" onClick={close} aria-hidden="true" />}
    </>
  );
}
