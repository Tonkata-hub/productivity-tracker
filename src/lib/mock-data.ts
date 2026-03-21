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
const tomorrow = getDateOffset(1)
const inTwoDays = getDateOffset(2)
const inThreeDays = getDateOffset(3)

export const mockTasks: Task[] = [
  // DAILY RECURRING TASKS - Various completion patterns
  {
    id: '1',
    title: 'Morning meditation',
    type: 'daily',
    completedDates: [today, yesterday, twoDaysAgo], // Completed consistently
  },
  {
    id: '2',
    title: 'Exercise routine',
    type: 'daily',
    completedDates: [yesterday, threeDaysAgo], // Missed some days (today not completed)
  },
  {
    id: '3',
    title: 'Read for 30 minutes',
    type: 'daily',
    completedDates: [], // Never completed - new task
  },
  {
    id: '4',
    title: 'Review daily goals',
    type: 'daily',
    completedDates: [today, twoDaysAgo], // Completed today, missed yesterday
  },
  {
    id: '5',
    title: 'Drink 8 glasses of water',
    type: 'daily',
    completedDates: [today, yesterday, twoDaysAgo, threeDaysAgo], // Perfect streak
  },
  {
    id: '6',
    title: 'Journal entry',
    type: 'daily',
    completedDates: [threeDaysAgo], // Only completed once, long ago
  },

  // ONE-TIME TASKS - Various states
  {
    id: '7',
    title: 'Complete project proposal',
    type: 'one-time',
    dueDate: tomorrow,
    completedDates: [], // Due tomorrow, not completed
  },
  {
    id: '8',
    title: 'Call dentist for appointment',
    type: 'one-time',
    dueDate: today,
    completedDates: [], // Due today, not completed yet
  },
  {
    id: '9',
    title: 'Submit tax documents',
    type: 'one-time',
    dueDate: yesterday,
    completedDates: [], // OVERDUE - past due date, not completed
  },
  {
    id: '10',
    title: 'Buy birthday gift',
    type: 'one-time',
    dueDate: inTwoDays,
    completedDates: [], // Due in future
  },
  {
    id: '11',
    title: 'Schedule car maintenance',
    type: 'one-time',
    dueDate: twoDaysAgo,
    completedDates: [], // OVERDUE - significantly past due
  },
  {
    id: '12',
    title: 'Finish online course',
    type: 'one-time',
    dueDate: inThreeDays,
    completedDates: [], // Due in future
  },
  {
    id: '13',
    title: 'Send weekly report',
    type: 'one-time',
    dueDate: yesterday,
    completedDates: [yesterday], // Completed on time
  },
  {
    id: '14',
    title: 'Update resume',
    type: 'one-time',
    dueDate: twoDaysAgo,
    completedDates: [twoDaysAgo], // Completed on due date
  },
  {
    id: '15',
    title: 'Book flight tickets',
    type: 'one-time',
    dueDate: today,
    completedDates: [today], // Completed today (on due date)
  },

  // ONE-TIME TASKS WITHOUT DUE DATE
  {
    id: '16',
    title: 'Organize digital photos',
    type: 'one-time',
    completedDates: [], // No due date, not completed
  },
  {
    id: '17',
    title: 'Learn a new recipe',
    type: 'one-time',
    completedDates: [yesterday], // No due date, completed
  },
  {
    id: '18',
    title: 'Clean out garage',
    type: 'one-time',
    completedDates: [], // No due date, not completed
  },

  // EDGE CASE: Very long task title
  {
    id: '19',
    title: 'Research and compile comprehensive market analysis report for Q4 strategic planning meeting',
    type: 'one-time',
    dueDate: inTwoDays,
    completedDates: [],
  },

  // EDGE CASE: Short task title
  {
    id: '20',
    title: 'Nap',
    type: 'daily',
    completedDates: [today],
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
