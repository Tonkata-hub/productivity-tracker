# Mobile Top Navbar Redesign

**Date:** 2026-04-02  
**Status:** Approved

## Overview

Replace the mobile bottom tab bar with a top navbar (logo + hamburger) that opens a full-width slide-down drawer. Desktop sidebar is unchanged.

## Components

### Top Bar (mobile only)
- Fixed at the top, full width, `h-14`
- `navbar-glass` background + `border-b border-white/5`
- **Left:** Brand mark — red accent square (CalendarDays icon) + "Productivity / TRACKER" text (same as desktop sidebar)
- **Right:** Hamburger icon (`Menu` from lucide-react), animates to `X` when drawer is open
- Hidden on `md:` and above (`md:hidden`)

### Dropdown Drawer
- Full-width, positioned directly below the top bar
- `max-height: 0` → `max-height: 400px`, `overflow: hidden`
- Transition: `300ms cubic-bezier(0.4, 0, 0.2, 1)`
- Same `navbar-glass` background + `border-b border-white/5`
- **Nav items:** stacked vertically, each `h-14`, icon + label (same style as desktop sidebar)
  - Active: `text-accent bg-accent/12`
  - Inactive: `text-muted-foreground hover:text-foreground hover:bg-white/6`
- **Sign out** at the bottom, separated by `border-t border-white/5`
- Closing triggers: tap a nav item, tap the backdrop overlay
- **Backdrop:** fixed full-screen overlay behind the drawer (`opacity-0`, pointer-events capture only), closes menu on tap

### Desktop Sidebar
- No changes. Remains as-is.

## Layout Changes (`layout.tsx`)

| Before | After |
|--------|-------|
| `pb-16 md:pb-0 md:pl-56` | `pt-14 md:pt-0 md:pl-56` |

## Animation Detail

```css
/* Drawer open */
max-height: 400px;
transition: max-height 300ms cubic-bezier(0.4, 0, 0.2, 1);

/* Drawer closed */
max-height: 0;
transition: max-height 300ms cubic-bezier(0.4, 0, 0.2, 1);
```

Hamburger → X: simple icon swap with a short `transition-all duration-200` on the button.

## Files to Change

- `src/components/Navbar.tsx` — replace mobile bottom nav with top bar + drawer
- `src/app/layout.tsx` — update body wrapper padding class
