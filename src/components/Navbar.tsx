"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, PlusCircle, ListChecks, Dumbbell, LogOut, Home } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  icon: (typeof Home) | (typeof CalendarDays) | (typeof PlusCircle) | (typeof Dumbbell) | (typeof ListChecks);
  label: string;
  mobileLabel?: string;
  href: string;
  fab?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { icon: Home, label: "Home", href: "/" },
  { icon: CalendarDays, label: "Calendar", href: "/calendar" },
  { icon: PlusCircle, label: "Add Task", mobileLabel: "Add", href: "/add-task", fab: true },
  { icon: Dumbbell, label: "Gym", href: "/gym" },
  { icon: ListChecks, label: "Manage Tasks", mobileLabel: "Manage", href: "/manage-tasks" },
];

export function Navbar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside className="hidden md:flex fixed top-0 left-0 h-full w-56 flex-col z-50 border-r border-white/5 navbar-glass">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/5 shrink-0">
          <div className="flex size-8 items-center justify-center rounded-xl bg-accent shadow-md shadow-accent/40">
            <CalendarDays className="size-4 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight text-foreground">Productivity</span>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Tracker</span>
          </div>
        </div>

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

      {/* ── Mobile bottom tab bar ───────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden navbar-glass border-t border-white/5"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch h-16">
          {NAV_ITEMS.map(({ icon: Icon, href, fab, label, mobileLabel }) => {
            const active = isActive(href);
            const itemLabel = mobileLabel ?? label;

            if (fab) {
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-1 flex-col items-center justify-center"
                  aria-label={label}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-12 h-12 rounded-2xl bg-accent transition-all duration-150 active:scale-90",
                      active
                        ? "shadow-lg shadow-accent/50 ring-2 ring-accent/25 ring-offset-2 ring-offset-background"
                        : "shadow-md shadow-accent/35"
                    )}
                  >
                    <Icon className="size-5 text-white" />
                  </div>
                </Link>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 transition-colors duration-150",
                  active ? "text-accent" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("size-5 transition-transform duration-150", active && "scale-110")} />
                <span className="text-[10px] font-semibold tracking-wide">{itemLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
