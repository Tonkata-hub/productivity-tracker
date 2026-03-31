"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { CalendarDays, BarChart2, Settings, HelpCircle, LogOut, Menu, X, PlusCircle, Trash2 } from "lucide-react";

const menuItems = [
	{ icon: CalendarDays, label: "Calendar", href: "/calendar" },
	{ icon: PlusCircle, label: "Add Task", href: "/add-task" },
	{ icon: Trash2, label: "Manage Tasks", href: "/manage-tasks" },
	{ icon: BarChart2, label: "Analytics", href: "/analytics" },
	{ icon: Settings, label: "Settings", href: "/settings" },
	{ icon: HelpCircle, label: "Help", href: "/help" },
] as const;

const signOutItem = { icon: LogOut, label: "Sign out", href: "/signout" };

export function Navbar() {
	const [isOpen, setIsOpen] = useState(false);
	const pathname = usePathname();
	const navRef = useRef<HTMLElement>(null);

	const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

	// Close menu when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (navRef.current && !navRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	return (
		<>
			{/* Backdrop overlay for mobile menu */}
			<div
				className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
					isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
				}`}
				onClick={() => setIsOpen(false)}
				aria-hidden="true"
			/>

			<header ref={navRef} className="sticky top-0 z-50 glass-strong border-b border-white/5">
				{/* Main navbar row */}
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

					{/* Desktop navigation */}
					<nav className="hidden md:flex items-center gap-1">
						{menuItems.map((item) => {
							const Icon = item.icon;
							const active = isActive(item.href);
							return (
								<a
									key={item.label}
									href={item.href}
									className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
										active
											? "text-mars-red bg-mars-red/10"
											: "text-muted-foreground hover:bg-white/10 hover:text-foreground"
									}`}
								>
									<Icon className="size-4" />
									{item.label}
								</a>
							);
						})}
						<div className="w-px h-6 bg-white/10 mx-2" />
						<a
							href={signOutItem.href}
							className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
						>
							<LogOut className="size-4" />
							{signOutItem.label}
						</a>
					</nav>

					{/* Hamburger button - mobile only */}
					<button
						onClick={() => setIsOpen(!isOpen)}
						className="relative flex md:hidden items-center justify-center size-10 rounded-lg transition-colors hover:bg-white/10 focus:outline-none"
						aria-label={isOpen ? "Close menu" : "Open menu"}
						aria-expanded={isOpen}
					>
						<Menu
							className={`absolute size-6 text-foreground transition-all duration-300 ease-in-out ${
								isOpen ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
							}`}
						/>
						<X
							className={`absolute size-6 text-foreground transition-all duration-300 ease-in-out ${
								isOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
							}`}
						/>
					</button>
				</div>

				{/* Mobile dropdown menu */}
				<div
					className={`md:hidden border-t border-white/5 bg-[#0a0a0a] overflow-hidden transition-all duration-300 ease-in-out ${
						isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
					}`}
				>
					<nav className="flex flex-col w-full">
						{menuItems.map((item) => {
							const Icon = item.icon;
							const active = isActive(item.href);
							return (
								<a
									key={item.label}
									href={item.href}
									onClick={() => setIsOpen(false)}
									className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
										active
											? "text-mars-red bg-mars-red/10"
											: "text-muted-foreground hover:bg-white/10 hover:text-foreground active:bg-white/15"
									}`}
								>
									<Icon className="size-5" />
									{item.label}
								</a>
							);
						})}
						<div className="my-1 h-px bg-white/10" />
						<a
							href={signOutItem.href}
							onClick={() => setIsOpen(false)}
							className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground active:bg-white/15"
						>
							<LogOut className="size-5" />
							{signOutItem.label}
						</a>
					</nav>
				</div>
			</header>
		</>
	);
}
