'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { WorkoutWithExercises, Exercise, LastExercisePerformance, ExerciseSet } from '@/lib/types'
import { ExerciseCard } from './ExerciseCard'
import { WorkoutSummary } from './WorkoutSummary'
import { formatTime } from '@/lib/gym-utils'
import { Plus, Check, X, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkoutSessionProps {
  workout: WorkoutWithExercises
  onEndWorkout: () => void
  onRefresh: () => void
}

export function WorkoutSession({ workout, onEndWorkout, onRefresh }: WorkoutSessionProps) {
  const [elapsedSeconds, setElapsedSeconds]       = useState(0)
  const [newExerciseName, setNewExerciseName]     = useState('')
  const [isAddingExercise, setIsAddingExercise]   = useState(false)
  const [exerciseSuggestions, setExerciseSuggestions] = useState<Exercise[]>([])
  const [showSummary, setShowSummary]             = useState(false)
  const [lastPerformances, setLastPerformances]   = useState<Record<string, LastExercisePerformance>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  // Timer
  useEffect(() => {
    const startTime = new Date(workout.started_at).getTime()
    const update = () => setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [workout.started_at])

  // Search exercises with debounce
  useEffect(() => {
    const search = async () => {
      if (newExerciseName.trim().length < 1) { setExerciseSuggestions([]); return }
      const { data } = await supabase
        .from('exercises')
        .select('*')
        .ilike('name_lower', `%${newExerciseName.toLowerCase()}%`)
        .limit(5)
      if (data) setExerciseSuggestions(data)
    }
    const t = setTimeout(search, 200)
    return () => clearTimeout(t)
  }, [newExerciseName])

  // Fetch last performance for all exercises — single query (fixes N+1)
  useEffect(() => {
    const fetchLastPerformances = async () => {
      const exerciseIds = workout.workout_exercises.map(we => we.exercise_id)
      if (exerciseIds.length === 0) return

      const { data } = await supabase
        .from('workout_exercises')
        .select(`
          exercise_id,
          workout_id,
          workout:workouts!inner(started_at, ended_at),
          sets:exercise_sets(set_order, reps, weight_kg)
        `)
        .in('exercise_id', exerciseIds)
        .neq('workout_id', workout.id)
        .not('workout.ended_at', 'is', null)
        .order('workout(started_at)', { ascending: false })

      if (!data) return

      // Group by exercise_id — first row per exercise is the most recent (desc order)
      const performances: Record<string, LastExercisePerformance> = {}
      for (const row of data) {
        if (!performances[row.exercise_id]) {
          performances[row.exercise_id] = {
            workout_date: (row.workout as { started_at: string }).started_at,
            sets: (row.sets as ExerciseSet[]).sort((a, b) => a.set_order - b.set_order),
          }
        }
      }
      setLastPerformances(performances)
    }

    fetchLastPerformances()
  }, [workout.workout_exercises, workout.id])

  const addExercise = async (exerciseName: string) => {
    const nameTrimmed = exerciseName.trim().slice(0, 100)
    const nameLower   = nameTrimmed.toLowerCase()
    if (!nameLower) return

    let exercise: Exercise | null = null

    const { data: existing } = await supabase
      .from('exercises')
      .select('*')
      .eq('name_lower', nameLower)
      .single()

    if (existing) {
      exercise = existing
    } else {
      const { data: created } = await supabase
        .from('exercises')
        .insert({ name: nameTrimmed, name_lower: nameLower })
        .select()
        .single()
      if (created) exercise = created
    }

    if (!exercise) return

    await supabase.from('workout_exercises').insert({
      workout_id:     workout.id,
      exercise_id:    exercise.id,
      exercise_order: workout.workout_exercises.length + 1,
    })

    setNewExerciseName('')
    setIsAddingExercise(false)
    setExerciseSuggestions([])
    onRefresh()
  }

  const totalSets   = workout.workout_exercises.reduce((sum, we) => sum + we.sets.length, 0)
  const totalVolume = workout.workout_exercises.reduce(
    (sum, we) => sum + we.sets.reduce((s, set) => s + set.reps * set.weight_kg, 0),
    0
  )

  if (showSummary) {
    return (
      <WorkoutSummary
        workout={workout}
        duration={elapsedSeconds}
        totalSets={totalSets}
        totalVolume={totalVolume}
        onConfirm={onEndWorkout}
        onCancel={() => setShowSummary(false)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">

      {/* Sticky header */}
      <div className="sticky top-0 z-10 glass-strong border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Timer */}
          <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 px-3 py-1.5 rounded-full">
            <Timer className="size-3.5 text-accent" />
            <span className="font-mono font-semibold text-accent tracking-wider text-sm">
              {formatTime(elapsedSeconds)}
            </span>
          </div>

          {/* Finish */}
          <button
            onClick={() => setShowSummary(true)}
            className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-accent/25 transition-all active:scale-95 hover:bg-accent/90"
          >
            <Check className="size-4" />
            Finish
          </button>
        </div>

        {/* Live stats */}
        <div className="flex items-center px-4 pb-3 gap-3">
          {[
            { label: 'Exercises', value: workout.workout_exercises.length },
            { label: 'Sets',      value: totalSets },
            { label: 'Volume',    value: `${Math.round(totalVolume)} kg` },
          ].map(stat => (
            <div key={stat.label} className="flex-1 bg-white/5 rounded-xl px-3 py-2 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              <p className="text-sm font-semibold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Exercise list */}
      <div className="mx-auto max-w-lg px-4 pt-4 space-y-3">
        {workout.workout_exercises.map(we => (
          <ExerciseCard
            key={we.id}
            workoutExercise={we}
            lastPerformance={lastPerformances[we.exercise_id]}
            onUpdate={onRefresh}
          />
        ))}

        {/* Add exercise */}
        {isAddingExercise ? (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 p-4">
              <input
                ref={inputRef}
                type="text"
                value={newExerciseName}
                onChange={e => setNewExerciseName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newExerciseName.trim()) addExercise(newExerciseName)
                }}
                placeholder="Exercise name…"
                maxLength={100}
                className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground/40 outline-none caret-accent"
                autoFocus
              />
              <button
                onClick={() => { setIsAddingExercise(false); setNewExerciseName(''); setExerciseSuggestions([]) }}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {exerciseSuggestions.length > 0 && (
              <div className="border-t border-border divide-y divide-border/40">
                {exerciseSuggestions.map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => addExercise(ex.name)}
                    className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-white/5 transition-colors"
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            )}

            {newExerciseName.trim() && (
              <div className="border-t border-border p-3">
                <button
                  onClick={() => addExercise(newExerciseName)}
                  className="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98]"
                >
                  Add &quot;{newExerciseName.trim()}&quot;
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setIsAddingExercise(true)}
            className={cn(
              'w-full border-2 border-dashed border-border hover:border-accent/40 rounded-2xl p-4',
              'flex items-center justify-center gap-2',
              'text-sm text-muted-foreground hover:text-accent transition-colors'
            )}
          >
            <Plus className="size-5" />
            Add Exercise
          </button>
        )}
      </div>
    </div>
  )
}
