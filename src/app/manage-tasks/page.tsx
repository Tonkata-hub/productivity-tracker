'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { mockTasks } from '@/lib/mock-data'
import { Task, TaskPriority } from '@/lib/types'
import { Trash2, Repeat, Clock, Calendar, BarChart2, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'

const priorityDot: Record<NonNullable<TaskPriority>, string> = {
  high:   'bg-accent',
  medium: 'bg-yellow-400',
  low:    'bg-zinc-400',
}

const priorityLabel: Record<NonNullable<TaskPriority>, string> = {
  high: 'High', medium: 'Med', low: 'Low',
}

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'

type Filter = 'all' | 'daily' | 'one_time'

export default function ManageTasksPage() {
  const [tasks, setTasks]               = useState<Task[]>([])
  const [loading, setLoading]           = useState(true)
  const [filter, setFilter]             = useState<Filter>('all')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [sheetVisible, setSheetVisible]   = useState(false)
  const [sheetExiting, setSheetExiting]   = useState(false)
  const [sheetAnimated, setSheetAnimated] = useState(false)

  // Trigger enter animation after mount (needs two frames so browser paints the start state first)
  useEffect(() => {
    if (!sheetVisible) return
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setSheetAnimated(true))
    )
    return () => cancelAnimationFrame(id)
  }, [sheetVisible])

  useEffect(() => {
    async function fetchTasks() {
      if (useMock) { setTasks(mockTasks); setLoading(false); return }
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) setTasks(data as Task[])
      setLoading(false)
    }
    fetchTasks()
  }, [])

  // Open sheet
  function openSheet(id: string) {
    setSheetAnimated(false)  // reset so enter animation plays
    setPendingDeleteId(id)
    setSheetExiting(false)
    setSheetVisible(true)
  }

  // Close sheet with exit animation
  function closeSheet() {
    setSheetExiting(true)
    setTimeout(() => {
      setSheetVisible(false)
      setSheetExiting(false)
      setPendingDeleteId(null)
    }, 280)
  }

  async function handleDelete() {
    if (!pendingDeleteId) return
    setDeleting(true)

    if (!useMock) {
      const { error: ce } = await supabase
        .from('task_completions').delete().eq('task_id', pendingDeleteId)
      if (ce) { setDeleting(false); closeSheet(); return }

      const { error: te } = await supabase
        .from('tasks').delete().eq('id', pendingDeleteId)
      if (te) { setDeleting(false); closeSheet(); return }
    }

    setTasks(prev => prev.filter(t => t.id !== pendingDeleteId))
    setDeleting(false)
    closeSheet()
  }

  const dailyTasks   = tasks.filter(t => t.type === 'daily')
  const oneTimeTasks = tasks.filter(t => t.type === 'one_time')

  const filtered =
    filter === 'daily'    ? dailyTasks   :
    filter === 'one_time' ? oneTimeTasks :
    tasks

  const pendingTask = tasks.find(t => t.id === pendingDeleteId) ?? null

  const FILTERS: { value: Filter; label: string; count: number }[] = [
    { value: 'all',      label: 'All',      count: tasks.length },
    { value: 'daily',    label: 'Daily',    count: dailyTasks.length },
    { value: 'one_time', label: 'One-time', count: oneTimeTasks.length },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 pt-6 pb-10 space-y-5">

        {/* Header */}
        <div className="calendar-animate-slide-in-up">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Library</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mt-1">Manage Tasks</h1>
        </div>

        {/* Filter tabs */}
        <div
          className="flex gap-2 calendar-animate-slide-in-up"
          style={{ animationDelay: '50ms' }}
        >
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150',
                filter === f.value
                  ? 'bg-accent/15 text-accent border border-accent/25'
                  : 'bg-white/5 text-muted-foreground border border-transparent hover:text-foreground hover:bg-white/8'
              )}
            >
              {f.label}
              <span className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                filter === f.value ? 'bg-accent/20 text-accent' : 'bg-white/8 text-muted-foreground'
              )}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="calendar-animate-slide-in-up" style={{ animationDelay: '100ms' }}>

          {/* Loading */}
          {loading && (
            <div className="glass rounded-2xl flex items-center justify-center gap-3 p-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading tasks…</span>
            </div>
          )}

          {/* Empty */}
          {!loading && filtered.length === 0 && (
            <div className="glass rounded-2xl flex flex-col items-center justify-center gap-3 p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                <BarChart2 className="size-5 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">
                {filter === 'all' ? 'No tasks yet.' : `No ${filter === 'daily' ? 'daily' : 'one-time'} tasks.`}
              </p>
            </div>
          )}

          {/* Task list */}
          {!loading && filtered.length > 0 && (
            <div className="glass rounded-2xl overflow-hidden divide-y divide-border">
              {filtered.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onDelete={() => openSheet(task.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Confirmation dialog (bottom sheet on mobile, modal on desktop) */}
      {sheetVisible && (
        <>
          {/* Backdrop */}
          <div
            className={cn(
              'fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300',
              sheetAnimated && !sheetExiting ? 'opacity-100' : 'opacity-0'
            )}
            onClick={closeSheet}
          />

          {/* Positioning wrapper: bottom on mobile, centered on desktop */}
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-6 pointer-events-none">

          {/* Card — solid background, no transparency bleed */}
          <div
            className={cn(
              'w-full md:max-w-sm pointer-events-auto',
              'bg-[#0f1117] border-t border-x md:border border-white/10',
              'rounded-t-3xl md:rounded-2xl px-5 pt-5',
              'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
              sheetAnimated && !sheetExiting
                ? 'translate-y-0 md:opacity-100 md:scale-100'
                : 'max-md:translate-y-full md:opacity-0 md:scale-95'
            )}
            style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

            {/* Icon + task name */}
            <div className="flex flex-col items-center gap-3 text-center mb-5">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/15">
                <AlertTriangle className="size-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Delete task</p>
                <p className="text-base font-semibold text-foreground">&ldquo;{pendingTask?.title}&rdquo;</p>
              </div>
            </div>

            {/* Warning */}
            <p className="text-center text-sm text-muted-foreground mb-6">
              This will permanently remove the task and{' '}
              <span className="text-foreground font-medium">all its completion history</span>.
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full rounded-2xl bg-accent py-4 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Deleting…
                  </span>
                ) : (
                  'Delete permanently'
                )}
              </button>
              <button
                onClick={closeSheet}
                disabled={deleting}
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-medium text-foreground transition-all hover:bg-white/8 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
          </div>{/* end positioning wrapper */}
        </>
      )}
    </div>
  )
}

function TaskRow({ task, onDelete }: { task: Task; onDelete: () => void }) {
  const today = new Date().toISOString().split('T')[0]
  const isOverdue = task.type === 'one_time' && !!task.due_date && task.due_date < today && !task.is_completed
  const isDaily = task.type === 'daily'

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 group">
      {/* Left edge type indicator */}
      <div className={cn(
        'w-0.5 self-stretch rounded-full flex-shrink-0',
        isDaily ? 'bg-accent/40' : 'bg-muted-foreground/20'
      )} />

      {/* Icon */}
      {isDaily
        ? <Repeat className="size-4 shrink-0 text-accent/60" />
        : <Clock  className="size-4 shrink-0 text-muted-foreground/60" />
      }

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
        <div className="mt-0.5 flex items-center gap-2.5">
          {task.priority && (
            <span className="flex items-center gap-1">
              <span className={cn('w-1.5 h-1.5 rounded-full', priorityDot[task.priority])} />
              <span className="text-[10px] text-muted-foreground">{priorityLabel[task.priority]}</span>
            </span>
          )}
          {task.due_date && task.type === 'one_time' && (
            <span className={cn(
              'flex items-center gap-1 text-[10px]',
              isOverdue ? 'text-accent font-medium' : 'text-muted-foreground'
            )}>
              <Calendar className="size-2.5" />
              {format(parseISO(task.due_date), 'MMM d')}
              {isOverdue && ' · Overdue'}
            </span>
          )}
          {task.target_value != null && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <BarChart2 className="size-2.5" />
              {task.target_value} {task.unit}
            </span>
          )}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="shrink-0 flex size-9 items-center justify-center rounded-xl text-muted-foreground/40 transition-all hover:bg-accent/10 hover:text-accent active:scale-90"
        aria-label={`Delete "${task.title}"`}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}
