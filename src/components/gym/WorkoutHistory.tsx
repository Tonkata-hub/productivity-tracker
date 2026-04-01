'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Workout, WorkoutWithExercises } from '@/lib/types'
import { Calendar, Clock, Dumbbell, TrendingUp, ChevronRight, X } from 'lucide-react'

interface WorkoutHistoryProps {
  workouts: Workout[]
}

export function WorkoutHistory({ workouts }: WorkoutHistoryProps) {
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutWithExercises | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchWorkoutDetails = async (workoutId: string) => {
    setIsLoading(true)
    const { data } = await supabase
      .from('workouts')
      .select(`
        *,
        workout_exercises (
          *,
          exercise:exercises (*),
          sets:exercise_sets (*)
        )
      `)
      .eq('id', workoutId)
      .single()

    if (data) {
      const workout = data as WorkoutWithExercises
      workout.workout_exercises = workout.workout_exercises
        .sort((a, b) => a.exercise_order - b.exercise_order)
        .map(we => ({
          ...we,
          sets: we.sets.sort((a, b) => a.set_order - b.set_order)
        }))
      setSelectedWorkout(workout)
    }
    setIsLoading(false)
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hrs > 0) {
      return `${hrs}h ${mins}m`
    }
    return `${mins}m`
  }

  const groupWorkoutsByMonth = (workouts: Workout[]) => {
    const groups: Record<string, Workout[]> = {}
    
    workouts.forEach(workout => {
      const date = new Date(workout.started_at)
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      if (!groups[monthYear]) {
        groups[monthYear] = []
      }
      groups[monthYear].push(workout)
    })

    return groups
  }

  const groupedWorkouts = groupWorkoutsByMonth(workouts)

  if (selectedWorkout) {
    return (
      <WorkoutDetailView 
        workout={selectedWorkout} 
        onClose={() => setSelectedWorkout(null)} 
      />
    )
  }

  if (workouts.length === 0) {
    return (
      <div className="p-8 text-center">
        <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">No workout history yet</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      {Object.entries(groupedWorkouts).map(([monthYear, monthWorkouts]) => (
        <div key={monthYear}>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">{monthYear}</h2>
          <div className="space-y-2">
            {monthWorkouts.map(workout => {
              const date = new Date(workout.started_at)
              const formattedDate = date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })
              const formattedTime = date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
              })

              return (
                <button
                  key={workout.id}
                  onClick={() => fetchWorkoutDetails(workout.id)}
                  className="w-full bg-card border border-border rounded-xl p-4 flex items-center justify-between text-left hover:bg-card/80 transition-colors"
                  disabled={isLoading}
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{formattedDate}</p>
                    <p className="text-sm text-muted-foreground">{formattedTime}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{formatDuration(workout.duration_seconds)}</p>
                      <p className="text-sm text-muted-foreground">
                        {workout.total_sets} sets &middot; {Math.round(workout.total_volume_kg)} kg
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function WorkoutDetailView({ 
  workout, 
  onClose 
}: { 
  workout: WorkoutWithExercises
  onClose: () => void 
}) {
  const date = new Date(workout.started_at)
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hrs > 0) {
      return `${hrs}h ${mins}m`
    }
    return `${mins} minutes`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="font-semibold text-foreground">Workout Details</h1>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Date & Overview */}
        <div>
          <p className="text-lg font-semibold text-foreground">{formattedDate}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatDuration(workout.duration_seconds)}
            </span>
            <span className="flex items-center gap-1">
              <Dumbbell className="w-4 h-4" />
              {workout.total_sets} sets
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {Math.round(workout.total_volume_kg)} kg
            </span>
          </div>
        </div>

        {/* Exercises */}
        <div className="space-y-4">
          {workout.workout_exercises.map((we) => (
            <div key={we.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">{we.exercise.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {we.sets.length} sets &middot;{' '}
                  {Math.round(we.sets.reduce((sum, s) => sum + (s.reps * s.weight_kg), 0))} kg
                </p>
              </div>
              <div className="divide-y divide-border/50">
                {we.sets.map((set) => (
                  <div key={set.id} className="flex items-center justify-between px-4 py-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-medium">
                      {set.set_order}
                    </span>
                    <span className="text-foreground">
                      {set.weight_kg} kg × {set.reps} reps
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
