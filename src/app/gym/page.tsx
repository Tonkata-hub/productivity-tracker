'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Workout, WorkoutWithExercises } from '@/lib/types'
import { WorkoutSession } from '@/components/gym/WorkoutSession'
import { WorkoutHistory } from '@/components/gym/WorkoutHistory'
import { Dumbbell, Plus, History, TrendingUp } from 'lucide-react'

export default function GymPage() {
  const [activeWorkout, setActiveWorkout] = useState<WorkoutWithExercises | null>(null)
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<'home' | 'history'>('home')

  const fetchActiveWorkout = useCallback(async () => {
    // Check for any workout that hasn't ended yet
    const { data, error } = await supabase
      .from('workouts')
      .select(`
        *,
        workout_exercises (
          *,
          exercise:exercises (*),
          sets:exercise_sets (*)
        )
      `)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    if (data && !error) {
      // Sort exercises and sets by order
      const workout = data as WorkoutWithExercises
      workout.workout_exercises = workout.workout_exercises
        .sort((a, b) => a.exercise_order - b.exercise_order)
        .map(we => ({
          ...we,
          sets: we.sets.sort((a, b) => a.set_order - b.set_order)
        }))
      setActiveWorkout(workout)
    } else {
      setActiveWorkout(null)
    }
  }, [])

  const fetchRecentWorkouts = useCallback(async () => {
    const { data } = await supabase
      .from('workouts')
      .select('*')
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(10)

    if (data) {
      setRecentWorkouts(data)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchActiveWorkout(), fetchRecentWorkouts()])
      setIsLoading(false)
    }
    loadData()
  }, [fetchActiveWorkout, fetchRecentWorkouts])

  const startWorkout = async () => {
    const { data, error } = await supabase
      .from('workouts')
      .insert({
        started_at: new Date().toISOString(),
        total_sets: 0,
        total_volume_kg: 0
      })
      .select()
      .single()

    if (data && !error) {
      setActiveWorkout({
        ...data,
        workout_exercises: []
      })
    }
  }

  const endWorkout = async () => {
    if (!activeWorkout) return

    // Calculate totals
    let totalSets = 0
    let totalVolume = 0

    activeWorkout.workout_exercises.forEach(we => {
      we.sets.forEach(set => {
        totalSets++
        totalVolume += set.reps * set.weight_kg
      })
    })

    const startedAt = new Date(activeWorkout.started_at)
    const endedAt = new Date()
    const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)

    await supabase
      .from('workouts')
      .update({
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
        total_sets: totalSets,
        total_volume_kg: totalVolume
      })
      .eq('id', activeWorkout.id)

    setActiveWorkout(null)
    fetchRecentWorkouts()
  }

  const refreshWorkout = () => {
    fetchActiveWorkout()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Dumbbell className="w-12 h-12 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading gym...</p>
        </div>
      </div>
    )
  }

  // If there's an active workout, show the workout session
  if (activeWorkout) {
    return (
      <WorkoutSession 
        workout={activeWorkout} 
        onEndWorkout={endWorkout}
        onRefresh={refreshWorkout}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Gym</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('home')}
              className={`p-2 rounded-lg transition-colors ${
                view === 'home' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
            </button>
            <button
              onClick={() => setView('history')}
              className={`p-2 rounded-lg transition-colors ${
                view === 'history' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              <History className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {view === 'home' ? (
        <div className="p-4 space-y-6">
          {/* Start Workout Button */}
          <button
            onClick={startWorkout}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
          >
            <Plus className="w-6 h-6" />
            <span className="text-lg">Start Workout</span>
          </button>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <QuickStatCard
              label="This Week"
              value={recentWorkouts.filter(w => {
                const workoutDate = new Date(w.started_at)
                const weekAgo = new Date()
                weekAgo.setDate(weekAgo.getDate() - 7)
                return workoutDate >= weekAgo
              }).length}
              unit="workouts"
            />
            <QuickStatCard
              label="Total Volume"
              value={Math.round(recentWorkouts.reduce((sum, w) => sum + (w.total_volume_kg || 0), 0))}
              unit="kg"
            />
          </div>

          {/* Recent Workouts Preview */}
          {recentWorkouts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Recent Workouts</h2>
              <div className="space-y-2">
                {recentWorkouts.slice(0, 3).map(workout => (
                  <RecentWorkoutCard key={workout.id} workout={workout} />
                ))}
              </div>
              {recentWorkouts.length > 3 && (
                <button
                  onClick={() => setView('history')}
                  className="w-full text-center text-primary text-sm py-2"
                >
                  View all {recentWorkouts.length} workouts
                </button>
              )}
            </div>
          )}

          {recentWorkouts.length === 0 && (
            <div className="text-center py-12">
              <Dumbbell className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No workouts yet</p>
              <p className="text-muted-foreground/60 text-sm">Start your first workout to track your progress</p>
            </div>
          )}
        </div>
      ) : (
        <WorkoutHistory workouts={recentWorkouts} />
      )}
    </div>
  )
}

function QuickStatCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-2xl font-bold text-foreground">
        {value} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  )
}

function RecentWorkoutCard({ workout }: { workout: Workout }) {
  const date = new Date(workout.started_at)
  const formattedDate = date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  })
  const duration = workout.duration_seconds 
    ? `${Math.floor(workout.duration_seconds / 60)}m`
    : '-'

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
      <div>
        <p className="font-medium text-foreground">{formattedDate}</p>
        <p className="text-sm text-muted-foreground">
          {workout.total_sets} sets &middot; {Math.round(workout.total_volume_kg)} kg
        </p>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-primary">{duration}</p>
      </div>
    </div>
  )
}
