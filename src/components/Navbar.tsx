"use client";

import { CalendarDays, BarChart2, Settings, HelpCircle, LogOut, ChevronDown } from "lucide-react";
import { DropdownMenu } from "radix-ui";

const menuItems = [
	{ icon: CalendarDays, label: "Calendar", href: "/calendar" },
	{ icon: BarChart2, label: "Analytics", href: "/analytics" },
	{ icon: Settings, label: "Settings", href: "/settings" },
	{ icon: HelpCircle, label: "Help", href: "/help" },
	{ divider: true },
	{ icon: LogOut, label: "Sign out", href: "/signout" },
] as const;

export function Navbar() {
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

					<DropdownMenu.Root>
						<DropdownMenu.Trigger asChild>
							<button
								className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/10 focus:outline-none"
								aria-label="Open menu"
							>
								<ChevronDown className="ml-0.5 size-3 text-muted-foreground" />
							</button>
						</DropdownMenu.Trigger>

						<DropdownMenu.Portal>
							<DropdownMenu.Content
								align="end"
								sideOffset={8}
								className="z-50 min-w-[160px] overflow-hidden rounded-xl border border-white/10 bg-[#111] p-1 shadow-xl shadow-black/40 backdrop-blur-xl"
							>
								{menuItems.map((item, i) => {
									if ("divider" in item) {
										return <DropdownMenu.Separator key={i} className="my-1 h-px bg-white/10" />;
									}
									const Icon = item.icon;
									return (
										<DropdownMenu.Item
											key={item.label}
											className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-white/10 hover:text-foreground focus:bg-white/10 focus:text-foreground"
											onSelect={() => {}}
										>
											<Icon className="size-4" />
											{item.label}
										</DropdownMenu.Item>
									);
								})}
							</DropdownMenu.Content>
						</DropdownMenu.Portal>
					</DropdownMenu.Root>
				</div>
			</div>
		</header>
	);
}
