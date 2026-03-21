"use client";

import { useState } from "react";
import { CalendarDays, BarChart2, Settings, HelpCircle, LogOut, Menu, X } from "lucide-react";

const menuItems = [
	{ icon: CalendarDays, label: "Calendar", href: "/calendar" },
	{ icon: BarChart2, label: "Analytics", href: "/analytics" },
	{ icon: Settings, label: "Settings", href: "/settings" },
	{ icon: HelpCircle, label: "Help", href: "/help" },
	{ divider: true },
	{ icon: LogOut, label: "Sign out", href: "/signout" },
] as const;

export function Navbar() {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<header className="sticky top-0 z-50 border-b border-white/5">
			<div className="glass-strong">
				<div className="flex h-14 items-center justify-between px-4">
					<div className="flex items-center gap-3">
						<div className="relative flex size-10 items-center justify-center rounded-xl bg-mars-red shadow-lg shadow-mars-red/30">
							<CalendarDays className="size-5 text-white" />
							<div className="absolute inset-0 rounded-xl ring-2 ring-mars-red/20 ring-offset-2 ring-offset-transparent" />
						</div>
						<div className="flex flex-col">
							<h1 className="text-lg font-bold tracking-tight text-foreground">Calendar</h1>
							<p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
								Task Tracker
							</p>
						</div>
					</div>

					{/* Hamburger menu button - only visible on mobile */}
					<button
						onClick={() => setIsOpen(!isOpen)}
						className="flex md:hidden items-center justify-center size-10 rounded-lg transition-colors hover:bg-white/10 focus:outline-none"
						aria-label={isOpen ? "Close menu" : "Open menu"}
						aria-expanded={isOpen}
					>
						{isOpen ? (
							<X className="size-6 text-foreground" />
						) : (
							<Menu className="size-6 text-foreground" />
						)}
					</button>
				</div>
			</div>

			{/* Full-width mobile dropdown menu */}
			{isOpen && (
				<div className="md:hidden border-t border-white/5 glass-strong">
					<nav className="flex flex-col w-full">
						{menuItems.map((item, i) => {
							if ("divider" in item) {
								return <div key={i} className="my-1 h-px bg-white/10" />;
							}
							const Icon = item.icon;
							return (
								<a
									key={item.label}
									href={item.href}
									onClick={() => setIsOpen(false)}
									className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground active:bg-white/15"
								>
									<Icon className="size-5" />
									{item.label}
								</a>
							);
						})}
					</nav>
				</div>
			)}
		</header>
	);
}
