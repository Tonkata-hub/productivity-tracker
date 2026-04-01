'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { WorkoutExercise, ExerciseSet, LastExercisePerformance } from '@/lib/types'
import { ChevronDown, ChevronUp, Plus, Trash2, TrendingUp } from 'lucide-react'

interface ExerciseCardProps {
  workoutExercise: WorkoutExercise & {
    exercise: { id: string; name: string }
    sets: ExerciseSet[]
  }
  lastPerformance?: LastExercisePerformance
  onUpdate: () => void
}

export function ExerciseCard({ workoutExercise, lastPerformance, onUpdate }: ExerciseCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isAddingSet, setIsAddingSet] = useState(false)
  const [newReps, setNewReps] = useState('')
  const [newWeight, setNewWeight] = useState('')

  // Auto-fill with last set values or last performance
  useEffect(() => {
    if (isAddingSet && !newReps && !newWeight) {
      const lastSet = workoutExercise.sets[workoutExercise.sets.length - 1]
      if (lastSet) {
        setNewReps(lastSet.reps.toString())
        setNewWeight(lastSet.weight_kg.toString())
      } else if (lastPerformance && lastPerformance.sets.length > 0) {
        const lastPerfSet = lastPerformance.sets[0]
        setNewReps(lastPerfSet.reps.toString())
        setNewWeight(lastPerfSet.weight_kg.toString())
      }
    }
  }, [isAddingSet, workoutExercise.sets, lastPerformance, newReps, newWeight])

  const addSet = useCallback(async () => {
    const reps = parseInt(newReps)
    const weight = parseFloat(newWeight)

    if (isNaN(reps) || reps <= 0) return
    if (isNaN(weight) || weight < 0) return

    const nextOrder = workoutExercise.sets.length + 1

    await supabase
      .from('exercise_sets')
      .insert({
        workout_exercise_id: workoutExercise.id,
        set_order: nextOrder,
        reps,
        weight_kg: weight
      })

    setNewReps('')
    setNewWeight('')
    setIsAddingSet(false)
    onUpdate()
  }, [newReps, newWeight, workoutExercise.id, workoutExercise.sets.length, onUpdate])

  const deleteSet = async (setId: string, setOrder: number) => {
    await supabase
      .from('exercise_sets')
      .delete()
      .eq('id', setId)

    // Reorder remaining sets
    const remainingSets = workoutExercise.sets
      .filter(s => s.id !== setId)
      .sort((a, b) => a.set_order - b.set_order)

    for (let i = 0; i < remainingSets.length; i++) {
      if (remainingSets[i].set_order !== i + 1) {
        await supabase
          .from('exercise_sets')
          .update({ set_order: i + 1 })
          .eq('id', remainingSets[i].id)
      }
    }

    onUpdate()
  }

  const currentVolume = workoutExercise.sets.reduce(
    (sum, set) => sum + (set.reps * set.weight_kg), 
    0
  )

  // Calculate progression compared to last time
  const lastVolume = lastPerformance
    ? lastPerformance.sets.reduce((sum, set) => sum + (set.reps * set.weight_kg), 0)
    : 0
  const volumeDiff = lastVolume > 0 ? currentVolume - lastVolume : 0

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div>
          <h3 className="font-semibold text-foreground">{workoutExercise.exercise.name}</h3>
          <p className="text-sm text-muted-foreground">
            {workoutExercise.sets.length} sets &middot; {Math.round(currentVolume)} kg
            {volumeDiff !== 0 && (
              <span className={volumeDiff > 0 ? 'text-green-500' : 'text-red-500'}>
                {' '}({volumeDiff > 0 ? '+' : ''}{Math.round(volumeDiff)} kg)
              </span>
            )}
          </p>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-border">
          {/* Last Performance Reference */}
          {lastPerformance && (
            <div className="px-4 py-2 bg-muted/30 border-b border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <TrendingUp className="w-3 h-3" />
                <span>Last time ({new Date(lastPerformance.workout_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {lastPerformance.sets.map((set, idx) => (
                  <span key={idx} className="text-xs bg-background px-2 py-1 rounded text-muted-foreground">
                    {set.weight_kg}kg × {set.reps}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sets List */}
          <div className="divide-y divide-border/50">
            {workoutExercise.sets.map((set) => (
              <div key={set.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-4">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-medium">
                    {set.set_order}
                  </span>
                  <span className="text-foreground font-medium">
                    {set.weight_kg} kg × {set.reps} reps
                  </span>
                </div>
                <button
                  onClick={() => deleteSet(set.id, set.set_order)}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Set Form */}
          {isAddingSet ? (
            <div className="p-4 border-t border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder="0"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                    inputMode="decimal"
                    autoFocus
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1">Reps</label>
                  <input
                    type="number"
                    value={newReps}
                    onChange={(e) => setNewReps(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addSet()
                      }
                    }}
                    placeholder="0"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                    inputMode="numeric"
                  />
                </div>
                <button
                  onClick={addSet}
                  disabled={!newReps || !newWeight}
                  className="mt-5 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingSet(true)}
              className="w-full flex items-center justify-center gap-2 p-3 text-primary hover:bg-primary/5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Set</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
