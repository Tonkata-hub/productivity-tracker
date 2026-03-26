export type TaskType = 'daily' | 'one_time'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  type: TaskType
  priority: TaskPriority | null
  due_date: string | null       // ISO date string, only for one_time tasks
  is_completed: boolean         // only meaningful for one_time tasks
  completed_at: string | null   // ISO timestamp, only meaningful for one_time tasks
  created_at: string
  updated_at: string
}

export interface DayTasks {
  date: string
  dayName: string
  dayNumber: number
  isToday: boolean
  isPast: boolean
  isFuture: boolean
  tasks: TaskWithStatus[]
}

export interface TaskWithStatus extends Task {
  isCompleted: boolean
  isOverdue: boolean
  isDueToday: boolean
}
