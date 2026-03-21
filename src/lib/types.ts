export type TaskType = 'daily' | 'one-time'

export interface Task {
  id: string
  title: string
  type: TaskType
  dueDate?: string // ISO date string, only for one-time tasks
  completedDates: string[] // ISO date strings when the task was completed
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
