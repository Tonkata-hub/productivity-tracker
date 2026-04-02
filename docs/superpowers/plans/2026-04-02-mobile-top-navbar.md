# Mobile Top Navbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mobile bottom tab bar with a fixed top navbar (logo + hamburger) that opens a full-width slide-down drawer.

**Architecture:** The existing `Navbar` component's mobile section is replaced in-place. A `useState` hook tracks open/closed state. The drawer uses a CSS `max-height` transition for the slide animation. Desktop sidebar is untouched. `layout.tsx` body padding changes from bottom to top on mobile.

**Tech Stack:** Next.js App Router, React 19, TailwindCSS 4, lucide-react

---

### Task 1: Replace mobile bottom nav with top bar + drawer in Navbar.tsx

**Files:**
- Modify: `src/components/Navbar.tsx`

- [ ] **Step 1: Add `useState` import and open state**

Replace the top of the file so it reads:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, PlusCircle, ListChecks, Dumbbell, LogOut, Home, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
```

Inside the `Navbar` function, add after the `isActive` helper:

```tsx
const [open, setOpen] = useState(false);
const close = () => setOpen(false);
```

- [ ] **Step 2: Replace the mobile bottom nav JSX**

Remove the entire `{/* ── Mobile bottom tab bar ── */}` block (lines 77–124) and replace with:

```tsx
{/* ── Mobile top bar ─────────────────────────────────── */}
<header className="fixed top-0 left-0 right-0 z-50 md:hidden navbar-glass border-b border-white/5">
  <div className="flex items-center justify-between px-4 h-14">
    {/* Brand */}
    <div className="flex items-center gap-3">
      <div className="flex size-8 items-center justify-center rounded-xl bg-accent shadow-md shadow-accent/40">
        <CalendarDays className="size-4 text-white" />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-sm font-bold tracking-tight text-foreground">Productivity</span>
        <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Tracker</span>
      </div>
    </div>

    {/* Hamburger / Close */}
    <button
      onClick={() => setOpen((v) => !v)}
      className="flex items-center justify-center size-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/6 transition-colors duration-150"
      aria-label={open ? "Close menu" : "Open menu"}
    >
      {open ? <X className="size-5" /> : <Menu className="size-5" />}
    </button>
  </div>

  {/* Slide-down drawer */}
  <div
    className="overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
    style={{ maxHeight: open ? "400px" : "0px" }}
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
{open && (
  <div
    className="fixed inset-0 z-40 md:hidden"
    onClick={close}
    aria-hidden="true"
  />
)}
```

- [ ] **Step 3: Verify the file compiles**

Run: `npm run lint`
Expected: no errors related to `Navbar.tsx`

- [ ] **Step 4: Commit**

```bash
git add src/components/Navbar.tsx
git commit -m "feat: replace mobile bottom tab bar with top navbar + slide-down drawer"
```

---

### Task 2: Update body padding in layout.tsx

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update the padding class**

In `src/app/layout.tsx`, change:

```tsx
<div className="pb-16 md:pb-0 md:pl-56">{children}</div>
```

to:

```tsx
<div className="pt-14 md:pt-0 md:pl-56">{children}</div>
```

- [ ] **Step 2: Verify visually**

Run: `npm run dev`

On a mobile viewport (or DevTools mobile mode):
- Top bar visible with logo + hamburger
- Tapping hamburger slides down the full nav
- Tapping a nav item navigates and closes the drawer
- Tapping outside the drawer closes it
- Page content starts below the top bar (not obscured)

On desktop: sidebar unchanged, no top bar visible.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "fix: update mobile body padding for top navbar (pb-16 → pt-14)"
```
