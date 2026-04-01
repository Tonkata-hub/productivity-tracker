'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { WorkoutWithExercises, Exercise, LastExercisePerformance } from '@/lib/types'
import { ExerciseCard } from './ExerciseCard'
import { WorkoutSummary } from './WorkoutSummary'
import { Timer, Plus, Check, X } from 'lucide-react'

interface WorkoutSessionProps {
  workout: WorkoutWithExercises
  onEndWorkout: () => void
  onRefresh: () => void
}

export function WorkoutSession({ workout, onEndWorkout, onRefresh }: WorkoutSessionProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [isAddingExercise, setIsAddingExercise] = useState(false)
  const [exerciseSuggestions, setExerciseSuggestions] = useState<Exercise[]>([])
  const [showSummary, setShowSummary] = useState(false)
  const [lastPerformances, setLastPerformances] = useState<Record<string, LastExercisePerformance>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  // Timer
  useEffect(() => {
    const startTime = new Date(workout.started_at).getTime()
    
    const updateTimer = () => {
      const now = Date.now()
      setElapsedSeconds(Math.floor((now - startTime) / 1000))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [workout.started_at])

  // Format time
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Search for exercises as user types
  useEffect(() => {
    const searchExercises = async () => {
      if (newExerciseName.trim().length < 1) {
        setExerciseSuggestions([])
        return
      }

      const { data } = await supabase
        .from('exercises')
        .select('*')
        .ilike('name_lower', `%${newExerciseName.toLowerCase()}%`)
        .limit(5)

      if (data) {
        setExerciseSuggestions(data)
      }
    }

    const debounce = setTimeout(searchExercises, 200)
    return () => clearTimeout(debounce)
  }, [newExerciseName])

  // Fetch last performance for all exercises in this workout
  useEffect(() => {
    const fetchLastPerformances = async () => {
      const exerciseIds = workout.workout_exercises.map(we => we.exercise_id)
      if (exerciseIds.length === 0) return

      const performances: Record<string, LastExercisePerformance> = {}

      for (const exerciseId of exerciseIds) {
        const { data } = await supabase
          .from('workout_exercises')
          .select(`
            workout:workouts!inner (started_at, ended_at),
            sets:exercise_sets (set_order, reps, weight_kg)
          `)
          .eq('exercise_id', exerciseId)
          .not('workout.ended_at', 'is', null)
          .neq('workout.id', workout.id)
          .order('workout(started_at)', { ascending: false })
          .limit(1)
          .single()

        if (data && data.sets && data.sets.length > 0) {
          performances[exerciseId] = {
            workout_date: (data.workout as { started_at: string }).started_at,
            sets: data.sets.sort((a, b) => a.set_order - b.set_order)
          }
        }
      }

      setLastPerformances(performances)
    }

    fetchLastPerformances()
  }, [workout.workout_exercises, workout.id])

  const addExercise = async (exerciseName: string) => {
    const nameLower = exerciseName.trim().toLowerCase()
    if (!nameLower) return

    // Check if exercise exists
    let exercise: Exercise | null = null
    const { data: existingExercise } = await supabase
      .from('exercises')
      .select('*')
      .eq('name_lower', nameLower)
      .single()

    if (existingExercise) {
      exercise = existingExercise
    } else {
      // Create new exercise
      const { data: newExercise } = await supabase
        .from('exercises')
        .insert({
          name: exerciseName.trim(),
          name_lower: nameLower
        })
        .select()
        .single()

      if (newExercise) {
        exercise = newExercise
      }
    }

    if (!exercise) return

    // Add exercise to workout
    const nextOrder = workout.workout_exercises.length + 1
    await supabase
      .from('workout_exercises')
      .insert({
        workout_id: workout.id,
        exercise_id: exercise.id,
        exercise_order: nextOrder
      })

    setNewExerciseName('')
    setIsAddingExercise(false)
    setExerciseSuggestions([])
    onRefresh()
  }

  const handleEndWorkout = () => {
    setShowSummary(true)
  }

  const confirmEndWorkout = () => {
    onEndWorkout()
  }

  // Calculate current stats
  const totalSets = workout.workout_exercises.reduce(
    (sum, we) => sum + we.sets.length, 
    0
  )
  const totalVolume = workout.workout_exercises.reduce(
    (sum, we) => sum + we.sets.reduce((setSum, set) => setSum + (set.reps * set.weight_kg), 0),
    0
  )

  if (showSummary) {
    return (
      <WorkoutSummary
        workout={workout}
        duration={elapsedSeconds}
        totalSets={totalSets}
        totalVolume={totalVolume}
        onConfirm={confirmEndWorkout}
        onCancel={() => setShowSummary(false)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header with Timer */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
              <Timer className="w-4 h-4 text-primary" />
              <span className="font-mono font-semibold text-primary">
                {formatTime(elapsedSeconds)}
              </span>
            </div>
          </div>
          <button
            onClick={handleEndWorkout}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Check className="w-4 h-4" />
            Finish
          </button>
        </div>

        {/* Live Stats */}
        <div className="flex items-center justify-around px-4 py-2 border-t border-border/50">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Exercises</p>
            <p className="font-semibold text-foreground">{workout.workout_exercises.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Sets</p>
            <p className="font-semibold text-foreground">{totalSets}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Volume</p>
            <p className="font-semibold text-foreground">{Math.round(totalVolume)} kg</p>
          </div>
        </div>
      </div>

      {/* Exercise List */}
      <div className="p-4 space-y-4">
        {workout.workout_exercises.map((workoutExercise) => (
          <ExerciseCard
            key={workoutExercise.id}
            workoutExercise={workoutExercise}
            lastPerformance={lastPerformances[workoutExercise.exercise_id]}
            onUpdate={onRefresh}
          />
        ))}

        {/* Add Exercise */}
        {isAddingExercise ? (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newExerciseName.trim()) {
                    addExercise(newExerciseName)
                  }
                }}
                placeholder="Exercise name..."
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
              <button
                onClick={() => {
                  setIsAddingExercise(false)
                  setNewExerciseName('')
                  setExerciseSuggestions([])
                }}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Suggestions */}
            {exerciseSuggestions.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground px-1">Previous exercises:</p>
                {exerciseSuggestions.map(exercise => (
                  <button
                    key={exercise.id}
                    onClick={() => addExercise(exercise.name)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-background hover:bg-muted transition-colors text-foreground"
                  >
                    {exercise.name}
                  </button>
                ))}
              </div>
            )}

            {newExerciseName.trim() && (
              <button
                onClick={() => addExercise(newExerciseName)}
                className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium"
              >
                Add &quot;{newExerciseName.trim()}&quot;
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => setIsAddingExercise(true)}
            className="w-full border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-4 flex items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Exercise</span>
          </button>
        )}
      </div>
    </div>
  )
}
