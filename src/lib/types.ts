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
  target_value: number | null   // only for quantitative tasks
  unit: string | null           // only for quantitative tasks (e.g. 'ml', 'steps')
}

export interface TaskCompletion {
  id: string
  task_id: string
  date: string           // ISO date string
  completed_at: string   // ISO timestamp
  created_at: string
  value: number | null   // only for quantitative tasks (amount logged per entry)
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
  currentValue: number   // 0 for daily/one_time; running sum of logs for quantitative
}
