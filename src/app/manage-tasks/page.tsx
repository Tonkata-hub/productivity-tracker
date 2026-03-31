'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { mockTasks } from '@/lib/mock-data'
import { Task, TaskPriority } from '@/lib/types'
import {
	Trash2,
	AlertTriangle,
	Repeat,
	Clock,
	Flag,
	Calendar,
	CheckCircle2,
	AlertCircle,
	Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'

const priorityConfig: Record<NonNullable<TaskPriority>, { label: string; className: string }> = {
	high: { label: 'High', className: 'text-mars-red' },
	medium: { label: 'Medium', className: 'text-amber-400' },
	low: { label: 'Low', className: 'text-blue-400' },
}

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'

export default function ManageTasksPage() {
	const [tasks, setTasks] = useState<Task[]>([])
	const [loading, setLoading] = useState(true)
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
	const [deleting, setDeleting] = useState(false)
	const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

	useEffect(() => {
		async function fetchTasks() {
			if (useMock) {
				setTasks(mockTasks)
				setLoading(false)
				return
			}
			const { data, error } = await supabase
				.from('tasks')
				.select('*')
				.order('created_at', { ascending: false })
			if (!error && data) setTasks(data as Task[])
			setLoading(false)
		}
		fetchTasks()
	}, [])

	const pendingTask = tasks.find((t) => t.id === pendingDeleteId) ?? null

	async function handleDelete() {
		if (!pendingDeleteId) return
		setDeleting(true)

		if (!useMock) {
			const { error: completionsError } = await supabase
				.from('task_completions')
				.delete()
				.eq('task_id', pendingDeleteId)

			if (completionsError) {
				setDeleting(false)
				setPendingDeleteId(null)
				setStatus('error')
				setTimeout(() => setStatus('idle'), 3000)
				return
			}

			const { error: taskError } = await supabase
				.from('tasks')
				.delete()
				.eq('id', pendingDeleteId)

			if (taskError) {
				setDeleting(false)
				setPendingDeleteId(null)
				setStatus('error')
				setTimeout(() => setStatus('idle'), 3000)
				return
			}
		}

		setTasks((prev) => prev.filter((t) => t.id !== pendingDeleteId))
		setDeleting(false)
		setPendingDeleteId(null)
		setStatus('success')
		setTimeout(() => setStatus('idle'), 3000)
	}

	const dailyTasks = tasks.filter((t) => t.type === 'daily')
	const oneTimeTasks = tasks.filter((t) => t.type === 'one_time')

	return (
		<div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
			{/* Background gradient blobs */}
			<div className="pointer-events-none fixed inset-0 overflow-hidden">
				<div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-white/2 blur-[120px]" />
				<div className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full bg-white/1 blur-[100px]" />
			</div>

			<main className="relative flex-1 p-4 pb-8">
				<div className="mx-auto max-w-lg space-y-6">
					{/* Header */}
					<div className="glass rounded-2xl p-6">
						<div className="flex items-center gap-3">
							<div className="flex size-12 items-center justify-center rounded-xl bg-white/10 border border-glass-border">
								<Trash2 className="size-6 text-foreground" />
							</div>
							<div>
								<h1 className="text-xl font-bold tracking-tight text-foreground">Manage Tasks</h1>
								<p className="text-sm text-muted-foreground">Delete tasks you no longer need</p>
							</div>
						</div>
					</div>

					{/* Status messages */}
					{status === 'success' && (
						<div className="glass flex items-center gap-3 rounded-2xl border-green-500/30 bg-green-500/10 p-4">
							<CheckCircle2 className="size-5 shrink-0 text-green-400" />
							<p className="text-sm font-medium text-green-400">Task deleted successfully.</p>
						</div>
					)}
					{status === 'error' && (
						<div className="glass flex items-center gap-3 rounded-2xl border-mars-red/30 bg-mars-red/10 p-4">
							<AlertCircle className="size-5 shrink-0 text-mars-red" />
							<p className="text-sm font-medium text-mars-red">Something went wrong. Please try again.</p>
						</div>
					)}

					{/* Loading */}
					{loading && (
						<div className="glass flex items-center justify-center gap-3 rounded-2xl p-8">
							<Loader2 className="size-5 animate-spin text-muted-foreground" />
							<span className="text-sm text-muted-foreground">Loading tasks…</span>
						</div>
					)}

					{/* Empty state */}
					{!loading && tasks.length === 0 && (
						<div className="glass flex flex-col items-center justify-center gap-2 rounded-2xl p-10 text-center">
							<CheckCircle2 className="size-8 text-muted-foreground/40" />
							<p className="text-sm text-muted-foreground">No tasks yet. Add one from the Add Task page.</p>
						</div>
					)}

					{/* Daily tasks */}
					{!loading && dailyTasks.length > 0 && (
						<div className="space-y-3">
							<div className="flex items-center gap-2 px-1">
								<Repeat className="size-4 text-muted-foreground" />
								<h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
									Daily ({dailyTasks.length})
								</h2>
							</div>
							<div className="glass rounded-2xl divide-y divide-white/5">
								{dailyTasks.map((task) => (
									<TaskRow key={task.id} task={task} onDelete={() => setPendingDeleteId(task.id)} />
								))}
							</div>
						</div>
					)}

					{/* One-time tasks */}
					{!loading && oneTimeTasks.length > 0 && (
						<div className="space-y-3">
							<div className="flex items-center gap-2 px-1">
								<Clock className="size-4 text-muted-foreground" />
								<h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
									One-time ({oneTimeTasks.length})
								</h2>
							</div>
							<div className="glass rounded-2xl divide-y divide-white/5">
								{oneTimeTasks.map((task) => (
									<TaskRow key={task.id} task={task} onDelete={() => setPendingDeleteId(task.id)} />
								))}
							</div>
						</div>
					)}
				</div>
			</main>

			{/* Confirmation overlay */}
			{pendingDeleteId && pendingTask && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
					<div className="glass-strong w-full max-w-sm rounded-2xl p-6 space-y-5 border border-white/10">
						{/* Icon + title */}
						<div className="flex flex-col items-center gap-3 text-center">
							<div className="flex size-14 items-center justify-center rounded-xl bg-mars-red/15">
								<AlertTriangle className="size-7 text-mars-red" />
							</div>
							<div>
								<h2 className="text-lg font-bold text-foreground">Delete Task?</h2>
								<p className="mt-1 text-sm font-semibold text-foreground">&ldquo;{pendingTask.title}&rdquo;</p>
							</div>
						</div>

						{/* Warning text */}
						<p className="text-center text-sm text-muted-foreground">
							This will permanently delete the task and{' '}
							<span className="font-semibold text-foreground">all associated completion data</span>.
							This cannot be undone.
						</p>

						{/* Buttons */}
						<div className="flex gap-3">
							<button
								onClick={() => setPendingDeleteId(null)}
								disabled={deleting}
								className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-white/10 disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								onClick={handleDelete}
								disabled={deleting}
								className="flex-1 rounded-xl bg-mars-red px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-mars-red/30 transition-all hover:bg-mars-red/90 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{deleting ? (
									<span className="flex items-center justify-center gap-2">
										<Loader2 className="size-4 animate-spin" />
										Deleting…
									</span>
								) : (
									'Delete'
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

function TaskRow({ task, onDelete }: { task: Task; onDelete: () => void }) {
	const today = new Date().toISOString().split('T')[0]
	const isOverdue = task.type === 'one_time' && !!task.due_date && task.due_date < today && !task.is_completed

	return (
		<div className="flex items-center gap-3 px-4 py-3">
			{/* Type icon */}
			{task.type === 'daily' ? (
				<Repeat className="size-4 shrink-0 text-muted-foreground" />
			) : (
				<Clock className="size-4 shrink-0 text-muted-foreground" />
			)}

			{/* Info */}
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium text-foreground">{task.title}</p>
				<div className="mt-0.5 flex flex-wrap items-center gap-2">
					{task.priority && (
						<span className={cn('inline-flex items-center gap-1 text-[10px] font-medium', priorityConfig[task.priority].className)}>
							<Flag className="size-2.5" />
							{priorityConfig[task.priority].label}
						</span>
					)}
					{task.due_date && task.type === 'one_time' && (
						<span className={cn('inline-flex items-center gap-1 text-[10px] font-medium', isOverdue ? 'text-mars-red' : 'text-muted-foreground')}>
							<Calendar className="size-2.5" />
							{format(parseISO(task.due_date), 'MMM d')}
							{isOverdue && ' · Overdue'}
						</span>
					)}
					{task.target_value != null && (
						<span className="text-[10px] text-muted-foreground">
							Target: {task.target_value} {task.unit}
						</span>
					)}
				</div>
			</div>

			{/* Delete button */}
			<button
				onClick={onDelete}
				className="shrink-0 flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-mars-red/15 hover:text-mars-red"
				aria-label={`Delete "${task.title}"`}
			>
				<Trash2 className="size-4" />
			</button>
		</div>
	)
}
