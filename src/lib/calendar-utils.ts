import { Task, TaskWithStatus, DayTasks } from './types'

export function getWeekDates(baseDate: Date = new Date()): Date[] {
  const dates: Date[] = []
  const current = new Date(baseDate)

  // Get Monday of the current week
  const day = current.getDay()
  const diff = current.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
  current.setDate(diff)

  // Generate 7 days starting from Monday
  for (let i = 0; i < 7; i++) {
    const date = new Date(current)
    date.setDate(current.getDate() + i)
    dates.push(date)
  }

  return dates
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function getTaskStatusForDate(task: Task, dateISO: string): TaskWithStatus {
  const today = formatDateISO(new Date())
  const isCompleted = task.completedDates.includes(dateISO)

  let isOverdue = false
  let isDueToday = false

  if (task.type === 'one-time' && task.dueDate) {
    // For one-time tasks: overdue if past due date and not completed
    isOverdue = task.dueDate < today && !task.completedDates.includes(task.dueDate)
    isDueToday = task.dueDate === today
  } else if (task.type === 'daily') {
    // For daily tasks: "overdue" if not completed on a past date (including today)
    if (dateISO <= today && !isCompleted) {
      isOverdue = dateISO < today // Only mark past days as overdue, not today
    }
  }

  return {
    ...task,
    isCompleted,
    isOverdue,
    isDueToday,
  }
}

export function getTasksForDate(tasks: Task[], dateISO: string): TaskWithStatus[] {
  const result: TaskWithStatus[] = []
  const today = formatDateISO(new Date())

  for (const task of tasks) {
    if (task.type === 'daily') {
      // Daily tasks appear on every day
      result.push(getTaskStatusForDate(task, dateISO))
    } else if (task.type === 'one-time') {
      // One-time tasks appear on their due date or completion date
      const shouldShow =
        task.dueDate === dateISO ||
        task.completedDates.includes(dateISO) ||
        // Also show overdue tasks on today
        (dateISO === today && task.dueDate && task.dueDate < today && !task.completedDates.some(d => d <= today))

      if (shouldShow) {
        result.push(getTaskStatusForDate(task, dateISO))
      }
    }
  }

  return result
}

export function generateWeekData(tasks: Task[], weekDates: Date[]): DayTasks[] {
  const today = formatDateISO(new Date())
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return weekDates.map((date, index) => {
    const dateISO = formatDateISO(date)
    return {
      date: dateISO,
      dayName: dayNames[index],
      dayNumber: date.getDate(),
      isToday: dateISO === today,
      isPast: dateISO < today,
      isFuture: dateISO > today,
      tasks: getTasksForDate(tasks, dateISO),
    }
  })
}

export function filterTasks(
  tasks: TaskWithStatus[],
  filter: string
): TaskWithStatus[] {
  switch (filter) {
    case 'daily':
      return tasks.filter(t => t.type === 'daily')
    case 'one-time':
      return tasks.filter(t => t.type === 'one-time')
    case 'completed':
      return tasks.filter(t => t.isCompleted)
    case 'incomplete':
      return tasks.filter(t => !t.isCompleted)
    case 'overdue':
      return tasks.filter(t => t.isOverdue)
    default:
      return tasks
  }
}

export function getWeekRangeLabel(weekDates: Date[]): string {
  if (weekDates.length < 7) return ''

  const first = weekDates[0]
  const last = weekDates[6]

  const formatOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric'
  }

  const firstStr = first.toLocaleDateString('en-US', formatOptions)
  const lastStr = last.toLocaleDateString('en-US', {
    ...formatOptions,
    year: 'numeric'
  })

  return `${firstStr} - ${lastStr}`
}
