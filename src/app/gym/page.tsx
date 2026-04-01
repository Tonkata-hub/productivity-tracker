'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Workout, WorkoutWithExercises } from '@/lib/types'
import { WorkoutSession } from '@/components/gym/WorkoutSession'
import { WorkoutHistory } from '@/components/gym/WorkoutHistory'
import { formatDuration } from '@/lib/gym-utils'
import { Dumbbell, Plus, History, TrendingUp, AlertCircle, Loader2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type View = 'home' | 'history'

export default function GymPage() {
  const [activeWorkout, setActiveWorkout]     = useState<WorkoutWithExercises | null>(null)
  const [recentWorkouts, setRecentWorkouts]   = useState<Workout[]>([])
  const [isLoading, setIsLoading]             = useState(true)
  const [isStartingWorkout, setIsStartingWorkout] = useState(false)
  const [view, setView]                       = useState<View>('home')
  const [errorMessage, setErrorMessage]       = useState<string | null>(null)

  const fetchActiveWorkout = useCallback(async () => {
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
      .maybeSingle()

    if (error) { setErrorMessage(`Could not load active workout: ${error.message}`); setActiveWorkout(null); return }

    if (data) {
      const workout = data as WorkoutWithExercises
      workout.workout_exercises = workout.workout_exercises
        .sort((a, b) => a.exercise_order - b.exercise_order)
        .map(we => ({ ...we, sets: we.sets.sort((a, b) => a.set_order - b.set_order) }))
      setActiveWorkout(workout)
    } else {
      setActiveWorkout(null)
    }
  }, [])

  const fetchRecentWorkouts = useCallback(async () => {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(20)

    if (error) { setErrorMessage(`Could not load workout history: ${error.message}`); return }
    if (data) setRecentWorkouts(data)
  }, [])

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setErrorMessage(null)
      await Promise.all([fetchActiveWorkout(), fetchRecentWorkouts()])
      setIsLoading(false)
    }
    load()
  }, [fetchActiveWorkout, fetchRecentWorkouts])

  const startWorkout = async () => {
    setIsStartingWorkout(true)
    setErrorMessage(null)

    const { data, error } = await supabase
      .from('workouts')
      .insert({ started_at: new Date().toISOString(), total_sets: 0, total_volume_kg: 0 })
      .select()
      .single()

    setIsStartingWorkout(false)
    if (error) { setErrorMessage(`Could not start workout: ${error.message}`); return }
    if (data)  { setActiveWorkout({ ...data, workout_exercises: [] }) }
  }

  const endWorkout = async () => {
    if (!activeWorkout) return
    setErrorMessage(null)

    let totalSets   = 0
    let totalVolume = 0
    activeWorkout.workout_exercises.forEach(we => {
      we.sets.forEach(set => { totalSets++; totalVolume += set.reps * set.weight_kg })
    })

    const startedAt      = new Date(activeWorkout.started_at)
    const endedAt        = new Date()
    const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)

    const { error } = await supabase
      .from('workouts')
      .update({ ended_at: endedAt.toISOString(), duration_seconds: durationSeconds, total_sets: totalSets, total_volume_kg: totalVolume })
      .eq('id', activeWorkout.id)

    if (error) { setErrorMessage(`Could not save workout: ${error.message}`); return }

    setActiveWorkout(null)
    fetchRecentWorkouts()
  }

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-4 pt-6">
          <div className="glass rounded-2xl flex items-center justify-center gap-3 p-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading gym…</span>
          </div>
        </div>
      </div>
    )
  }

  // Active workout — full-screen session
  if (activeWorkout) {
    return (
      <WorkoutSession
        workout={activeWorkout}
        onEndWorkout={endWorkout}
        onRefresh={fetchActiveWorkout}
      />
    )
  }

  // Stats
  const weekAgo        = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const weekWorkouts   = recentWorkouts.filter(w => new Date(w.started_at) >= weekAgo)
  const totalVolumeAll = recentWorkouts.reduce((sum, w) => sum + (w.total_volume_kg || 0), 0)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 pt-6 pb-10 space-y-5">

        {/* Header */}
        <div className="calendar-animate-slide-in-up">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Fitness</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mt-1">Gym</h1>
        </div>

        {/* View toggle */}
        <div className="relative grid grid-cols-2 rounded-xl bg-white/5 p-0.5 calendar-animate-slide-in-up" style={{ animationDelay: '40ms' }}>
          <div
            className="absolute top-0.5 bottom-0.5 rounded-lg bg-white/8 border border-white/10 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              width: 'calc(50% - 2px)',
              transform: view === 'home' ? 'translateX(2px)' : 'translateX(calc(100% + 2px))',
            }}
          />
          <button
            onClick={() => setView('home')}
            className={cn(
              'relative z-10 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors duration-150',
              view === 'home' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <TrendingUp className="size-3.5" />
            Overview
          </button>
          <button
            onClick={() => setView('history')}
            className={cn(
              'relative z-10 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors duration-150',
              view === 'history' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <History className="size-3.5" />
            History
          </button>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm text-accent">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {view === 'home' ? (
          <>
            {/* Start workout CTA */}
            <button
              onClick={startWorkout}
              disabled={isStartingWorkout}
              className={cn(
                'w-full rounded-2xl px-6 py-4 text-sm font-semibold',
                'bg-accent text-white shadow-lg shadow-accent/30',
                'flex items-center justify-center gap-2',
                'transition-all active:scale-[0.98] hover:bg-accent/90',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
                'calendar-animate-slide-in-up'
              )}
              style={{ animationDelay: '80ms' }}
            >
              {isStartingWorkout ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  <Plus className="size-5" />
                  Start Workout
                </>
              )}
            </button>

            {/* Stats */}
            <div
              className="grid grid-cols-2 gap-3 calendar-animate-slide-in-up"
              style={{ animationDelay: '120ms' }}
            >
              <div className="glass rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">This week</p>
                <p className="text-2xl font-bold text-foreground">
                  {weekWorkouts.length}
                  <span className="text-sm font-normal text-muted-foreground ml-1">workouts</span>
                </p>
              </div>
              <div className="glass rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Total volume</p>
                <p className="text-2xl font-bold text-foreground">
                  {Math.round(totalVolumeAll).toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground ml-1">kg</span>
                </p>
              </div>
            </div>

            {/* Recent workouts */}
            {recentWorkouts.length > 0 ? (
              <div
                className="space-y-2 calendar-animate-slide-in-up"
                style={{ animationDelay: '160ms' }}
              >
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-1">
                  Recent
                </p>
                <div className="glass rounded-2xl overflow-hidden divide-y divide-border">
                  {recentWorkouts.slice(0, 3).map(w => (
                    <RecentWorkoutRow key={w.id} workout={w} />
                  ))}
                  {recentWorkouts.length > 3 && (
                    <button
                      onClick={() => setView('history')}
                      className="w-full flex items-center justify-center gap-1 py-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      View all {recentWorkouts.length} workouts
                      <ChevronRight className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="glass rounded-2xl flex flex-col items-center justify-center gap-3 p-12 text-center calendar-animate-slide-in-up"
                style={{ animationDelay: '160ms' }}
              >
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                  <Dumbbell className="size-5 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">No workouts yet.</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">Start your first workout to track progress.</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <WorkoutHistory
            workouts={recentWorkouts}
            onWorkoutDeleted={fetchRecentWorkouts}
          />
        )}

      </div>
    </div>
  )
}

function RecentWorkoutRow({ workout }: { workout: Workout }) {
  const date = new Date(workout.started_at)
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {workout.total_sets} sets · {Math.round(workout.total_volume_kg)} kg
        </p>
      </div>
      <span className="text-sm font-semibold text-accent shrink-0">
        {formatDuration(workout.duration_seconds)}
      </span>
    </div>
  )
}
