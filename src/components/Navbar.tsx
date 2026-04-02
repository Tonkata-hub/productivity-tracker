"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, PlusCircle, ListChecks, Dumbbell, LogOut, Home, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  icon: typeof Home | typeof CalendarDays | typeof PlusCircle | typeof Dumbbell | typeof ListChecks;
  label: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { icon: Home, label: "Home", href: "/" },
  { icon: CalendarDays, label: "Calendar", href: "/calendar" },
  { icon: PlusCircle, label: "Add Task", href: "/add-task" },
  { icon: Dumbbell, label: "Gym", href: "/gym" },
  { icon: ListChecks, label: "Manage Tasks", href: "/manage-tasks" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

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
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight text-foreground">Productivity</span>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Tracker</span>
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  active ? "bg-accent/12 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-white/6"
                )}
              >
                <Icon className={cn("size-4 shrink-0", active && "text-accent")} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-white/5 shrink-0">
          <Link
            href="/signout"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground transition-all duration-150 hover:text-foreground hover:bg-white/6"
          >
            <LogOut className="size-4 shrink-0" />
            Sign out
          </Link>
        </div>
      </aside>

      {/* ── Mobile top bar ─────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 md:hidden navbar-glass border-b border-white/5">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3" aria-label="Go to homepage">
            <div className="flex size-8 items-center justify-center rounded-xl bg-accent shadow-md shadow-accent/40">
              <CalendarDays className="size-4 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-tight text-foreground">Productivity</span>
              <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Tracker</span>
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
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{ maxHeight: open ? "400px" : "0px" }}
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
                    "flex items-center gap-3 px-3 h-14 rounded-xl text-sm font-medium transition-all duration-150",
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

          <div className="px-3 py-2">
            <Link
              href="/signout"
              onClick={close}
              className="flex items-center gap-3 px-3 h-14 rounded-xl text-sm font-medium text-muted-foreground transition-all duration-150 hover:text-foreground hover:bg-white/6"
            >
              <LogOut className="size-5 shrink-0" />
              Sign out
            </Link>
          </div>
        </div>
      </header>

      {/* Backdrop — closes menu on outside tap */}
      {open && <div className="fixed inset-0 z-40 md:hidden" onClick={close} aria-hidden="true" />}
    </>
  );
}
