"use client";

import { useState } from "react";
import { TaskWithStatus } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Repeat, Clock, AlertCircle, Flag, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

interface TaskItemProps {
	task: TaskWithStatus;
	onToggle?: (taskId: string) => void;
}

const priorityConfig = {
	high: { label: "High", className: "text-mars-red" },
	medium: { label: "Medium", className: "text-amber-400" },
	low: { label: "Low", className: "text-muted-foreground" },
};

export function TaskItem({ task, onToggle }: TaskItemProps) {
	const [isPressed, setIsPressed] = useState(false);

	const handleToggle = () => {
		setIsPressed(true);
		setTimeout(() => setIsPressed(false), 200);
		onToggle?.(task.id);
	};

	const hasMeta = task.priority || task.due_date || task.isOverdue || task.isDueToday;

	return (
		<div
			className={cn(
				"group relative flex cursor-pointer items-center gap-3 rounded-xl p-2.5 transition-all duration-200",
				"bg-white/3 hover:bg-white/6",
				"border border-transparent hover:border-white/5",
				isPressed && "scale-[0.98] bg-white/8",
				task.isCompleted && "opacity-40"
			)}
			role="listitem"
			onClick={handleToggle}
		>
			{/* Checkbox with custom styling */}
			<div className="relative flex shrink-0 items-center self-center">
				<Checkbox
					checked={task.isCompleted}
					onCheckedChange={handleToggle}
					onClick={(e) => e.stopPropagation()}
					className={cn(
						"size-5 rounded-md border-2 transition-all duration-200",
						"border-white/20 bg-transparent",
						"data-[state=checked]:border-white/40 data-[state=checked]:bg-white/10",
						"hover:border-white/30"
					)}
					aria-label={`Mark "${task.title}" as ${task.isCompleted ? "incomplete" : "complete"}`}
				/>
			</div>

			{/* Task content */}
			<div className="min-w-0 flex-1">
				<div className="flex flex-col gap-1">
					{/* Task title */}
					<span
						className={cn(
							"text-sm font-medium leading-tight transition-all duration-200",
							task.isCompleted && "line-through text-muted-foreground",
							task.isOverdue && !task.isCompleted && "text-mars-red"
						)}
					>
						{task.title}
					</span>

					{/* Meta info row - priority, due date, status badges */}
					{hasMeta && (
						<div className="flex flex-wrap items-center gap-2">
							{/* Priority */}
							{task.priority && (
								<span
									className={cn(
										"inline-flex items-center gap-1 text-[10px] font-medium",
										priorityConfig[task.priority].className
									)}
								>
									<Flag className="size-2.5" />
									{priorityConfig[task.priority].label}
								</span>
							)}

							{/* Due date for one-time tasks */}
							{task.due_date && task.type === "one_time" && (
								<span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
									<Calendar className="size-2.5" />
									{format(parseISO(task.due_date), "MMM d")}
								</span>
							)}

							{/* Overdue badge */}
							{task.isOverdue && !task.isCompleted && (
								<span className="inline-flex items-center gap-1 rounded-md bg-mars-red/15 px-1.5 py-0.5 text-[10px] font-semibold text-mars-red">
									<AlertCircle className="size-2.5" />
									Overdue
								</span>
							)}

							{/* Due today badge */}
							{task.isDueToday && !task.isCompleted && !task.isOverdue && (
								<span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
									Today
								</span>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Type icon - always visible, vertically centered */}
			<div className="shrink-0 self-center">
				{task.type === "daily" ? (
					<Repeat className="size-4 text-muted-foreground" />
				) : (
					<Clock className="size-4 text-muted-foreground" />
				)}
			</div>
		</div>
	);
}
