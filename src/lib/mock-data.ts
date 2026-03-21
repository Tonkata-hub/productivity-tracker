import { Task } from './types'

// Helper to get ISO date strings relative to today
const getDateOffset = (days: number): string => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

const today = getDateOffset(0)
const yesterday = getDateOffset(-1)
const twoDaysAgo = getDateOffset(-2)
const threeDaysAgo = getDateOffset(-3)
const fourDaysAgo = getDateOffset(-4)
const fiveDaysAgo = getDateOffset(-5)
const tomorrow = getDateOffset(1)
const inTwoDays = getDateOffset(2)
const inFourDays = getDateOffset(4)

export const mockTasks: Task[] = [
  // ── DAILY RECURRING TASKS ──────────────────────────────────────────────────
  {
    id: '1',
    title: 'Morning meditation',
    type: 'daily',
    // Strong streak — completed every day this week
    completedDates: [today, yesterday, twoDaysAgo, threeDaysAgo, fourDaysAgo, fiveDaysAgo],
  },
  {
    id: '2',
    title: 'Exercise',
    type: 'daily',
    // Mostly consistent, skipped yesterday and today
    completedDates: [twoDaysAgo, threeDaysAgo, fourDaysAgo, fiveDaysAgo],
  },
  {
    id: '3',
    title: 'Read for 30 minutes',
    type: 'daily',
    // Every other day pattern
    completedDates: [yesterday, threeDaysAgo, fiveDaysAgo],
  },
  {
    id: '4',
    title: 'Review daily goals',
    type: 'daily',
    // Completed today and a few recent days, missed some
    completedDates: [today, yesterday, threeDaysAgo],
  },
  {
    id: '5',
    title: 'Drink 8 glasses of water',
    type: 'daily',
    // Perfect streak all week
    completedDates: [today, yesterday, twoDaysAgo, threeDaysAgo, fourDaysAgo, fiveDaysAgo],
  },
  {
    id: '6',
    title: 'Evening journal',
    type: 'daily',
    // Sporadic — only managed it twice this week
    completedDates: [twoDaysAgo, fiveDaysAgo],
  },

  // ── ONE-TIME TASKS ─────────────────────────────────────────────────────────

  // Monday (5 days ago) — completed on time
  {
    id: '7',
    title: 'Send weekly status report',
    type: 'one-time',
    dueDate: fiveDaysAgo,
    completedDates: [fiveDaysAgo],
  },

  // Tuesday (4 days ago) — OVERDUE #1
  {
    id: '8',
    title: 'Submit expense report',
    type: 'one-time',
    dueDate: fourDaysAgo,
    completedDates: [],
  },

  // Wednesday (3 days ago) — completed on time
  {
    id: '9',
    title: 'Prepare team meeting agenda',
    type: 'one-time',
    dueDate: threeDaysAgo,
    completedDates: [threeDaysAgo],
  },

  // Thursday (2 days ago) — OVERDUE #2
  {
    id: '10',
    title: 'Schedule dentist appointment',
    type: 'one-time',
    dueDate: twoDaysAgo,
    completedDates: [],
  },

  // Friday (yesterday) — OVERDUE #3
  {
    id: '11',
    title: 'Reply to client proposal email',
    type: 'one-time',
    dueDate: yesterday,
    completedDates: [],
  },

  // Today — due today, not yet done
  {
    id: '12',
    title: 'Review pull requests',
    type: 'one-time',
    dueDate: today,
    completedDates: [],
  },

  // Tomorrow — upcoming
  {
    id: '13',
    title: 'Call insurance provider',
    type: 'one-time',
    dueDate: tomorrow,
    completedDates: [],
  },

  // In 2 days — upcoming
  {
    id: '14',
    title: 'Buy groceries for dinner party',
    type: 'one-time',
    dueDate: inTwoDays,
    completedDates: [],
  },

  // In 4 days — upcoming
  {
    id: '15',
    title: 'Finalize Q2 project spec',
    type: 'one-time',
    dueDate: inFourDays,
    completedDates: [],
  },
]

export const filterOptions = [
  { value: 'all', label: 'All Tasks' },
  { value: 'daily', label: 'Daily Only' },
  { value: 'one-time', label: 'One-Time Only' },
  { value: 'completed', label: 'Completed' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'overdue', label: 'Overdue' },
]
