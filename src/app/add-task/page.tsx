'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TaskType, TaskPriority } from '@/lib/types'
import { PlusCircle, CheckCircle2, AlertCircle, CalendarDays, Flag, Type } from 'lucide-react'

export default function AddTaskPage() {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<TaskType>('daily')
  const [priority, setPriority] = useState<TaskPriority | ''>('')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('idle')
    setIsSubmitting(true)

    const { error } = await supabase.from('tasks').insert({
      title,
      type,
      priority: priority || null,
      due_date: type === 'one_time' ? dueDate || null : null,
    })

    setIsSubmitting(false)

    if (error) {
      console.error(error)
      setStatus('error')
    } else {
      setTitle('')
      setType('daily')
      setPriority('')
      setDueDate('')
      setStatus('success')
      // Auto-dismiss success message after 3 seconds
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Subtle background gradient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-white/2 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full bg-white/1 blur-[100px]" />
      </div>

      <main className="relative flex-1 p-4 pb-8">
        <div className="mx-auto max-w-lg space-y-6">
          {/* Header */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-mars-red shadow-lg shadow-mars-red/30">
                <PlusCircle className="size-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Add New Task</h1>
                <p className="text-sm text-muted-foreground">Create a new task to track</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title Input */}
            <div className="glass rounded-2xl p-4">
              <label className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <Type className="size-4 text-muted-foreground" />
                Task Title
              </label>
              <input
                className="w-full rounded-xl border border-glass-border bg-white/5 px-4 py-3 text-foreground placeholder-muted-foreground outline-none transition-all focus:border-mars-red/50 focus:ring-2 focus:ring-mars-red/20"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title..."
                required
              />
            </div>

            {/* Type Selection */}
            <div className="glass rounded-2xl p-4">
              <label className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <CalendarDays className="size-4 text-muted-foreground" />
                Task Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType('daily')}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                    type === 'daily'
                      ? 'border-mars-red bg-mars-red/20 text-mars-red'
                      : 'border-glass-border bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setType('one_time')}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                    type === 'one_time'
                      ? 'border-mars-red bg-mars-red/20 text-mars-red'
                      : 'border-glass-border bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                  }`}
                >
                  One-time
                </button>
              </div>
            </div>

            {/* Priority Selection */}
            <div className="glass rounded-2xl p-4">
              <label className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <Flag className="size-4 text-muted-foreground" />
                Priority
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: '', label: 'None', color: 'text-muted-foreground' },
                  { value: 'low', label: 'Low', color: 'text-blue-400' },
                  { value: 'medium', label: 'Med', color: 'text-yellow-400' },
                  { value: 'high', label: 'High', color: 'text-mars-red' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPriority(option.value as TaskPriority | '')}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                      priority === option.value
                        ? option.value === 'high'
                          ? 'border-mars-red bg-mars-red/20 text-mars-red'
                          : option.value === 'medium'
                          ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                          : option.value === 'low'
                          ? 'border-blue-400 bg-blue-400/20 text-blue-400'
                          : 'border-foreground/30 bg-foreground/10 text-foreground'
                        : 'border-glass-border bg-white/5 text-muted-foreground hover:bg-white/10'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date (conditional) */}
            {type === 'one_time' && (
              <div className="glass rounded-2xl p-4">
                <label className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                  <CalendarDays className="size-4 text-muted-foreground" />
                  Due Date
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-glass-border bg-white/5 px-4 py-3 text-foreground outline-none transition-all focus:border-mars-red/50 focus:ring-2 focus:ring-mars-red/20 [color-scheme:dark]"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-mars-red px-6 py-4 text-base font-semibold text-white shadow-lg shadow-mars-red/30 transition-all hover:bg-mars-red/90 hover:shadow-xl hover:shadow-mars-red/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Adding Task...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <PlusCircle className="size-5" />
                  Add Task
                </span>
              )}
            </button>
          </form>

          {/* Status Messages */}
          {status === 'success' && (
            <div className="glass flex items-center gap-3 rounded-2xl border-green-500/30 bg-green-500/10 p-4">
              <CheckCircle2 className="size-5 text-green-400" />
              <p className="text-sm font-medium text-green-400">Task added successfully!</p>
            </div>
          )}
          {status === 'error' && (
            <div className="glass flex items-center gap-3 rounded-2xl border-mars-red/30 bg-mars-red/10 p-4">
              <AlertCircle className="size-5 text-mars-red" />
              <p className="text-sm font-medium text-mars-red">Something went wrong. Please try again.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
