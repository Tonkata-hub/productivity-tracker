'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TaskType, TaskPriority } from '@/lib/types'

export default function AddTaskPage() {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<TaskType>('daily')
  const [priority, setPriority] = useState<TaskPriority | ''>('')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('idle')

    const { error } = await supabase.from('tasks').insert({
      title,
      type,
      priority: priority || null,
      due_date: type === 'one_time' ? dueDate || null : null,
    })

    if (error) {
      console.error(error)
      setStatus('error')
    } else {
      setTitle('')
      setType('daily')
      setPriority('')
      setDueDate('')
      setStatus('success')
    }
  }

  return (
    <main className="max-w-md mx-auto mt-16 px-4">
      <h1 className="text-2xl font-bold mb-6">Add Task</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Title</label>
          <input
            className="border rounded px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Type</label>
          <select
            className="border rounded px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value as TaskType)}
          >
            <option value="daily">Daily</option>
            <option value="one_time">One-time</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Priority</label>
          <select
            className="border rounded px-3 py-2"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority | '')}
          >
            <option value="">None</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        {type === 'one_time' && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Due Date</label>
            <input
              type="date"
              className="border rounded px-3 py-2"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        )}

        <button
          type="submit"
          className="bg-black text-white rounded px-4 py-2 hover:bg-gray-800"
        >
          Add Task
        </button>

        {status === 'success' && <p className="text-green-600">Task added!</p>}
        {status === 'error' && <p className="text-red-600">Something went wrong.</p>}
      </form>
    </main>
  )
}
