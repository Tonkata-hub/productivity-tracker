'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { WorkoutExercise, ExerciseSet, LastExercisePerformance } from '@/lib/types'
import { ChevronDown, ChevronUp, Plus, Trash2, TrendingUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExerciseCardProps {
  workoutExercise: WorkoutExercise & {
    exercise: { id: string; name: string }
    sets: ExerciseSet[]
  }
  lastPerformance?: LastExercisePerformance
  onUpdate: () => void
}

export function ExerciseCard({ workoutExercise, lastPerformance, onUpdate }: ExerciseCardProps) {
  const [isExpanded, setIsExpanded]   = useState(true)
  const [isAddingSet, setIsAddingSet] = useState(false)
  const [newReps, setNewReps]         = useState('')
  const [newWeight, setNewWeight]     = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg]       = useState<string | null>(null)

  function showError(msg: string) {
    setErrorMsg(msg)
    setTimeout(() => setErrorMsg(null), 3000)
  }

  function openAddSet() {
    // Auto-fill with last set values or last performance
    const lastSet = workoutExercise.sets[workoutExercise.sets.length - 1]
    if (lastSet) {
      setNewReps(lastSet.reps.toString())
      setNewWeight(lastSet.weight_kg.toString())
    } else if (lastPerformance && lastPerformance.sets.length > 0) {
      setNewReps(lastPerformance.sets[0].reps.toString())
      setNewWeight(lastPerformance.sets[0].weight_kg.toString())
    }
    setIsAddingSet(true)
  }

  const addSet = useCallback(async () => {
    const reps   = parseInt(newReps)
    const weight = parseFloat(newWeight)
    if (isNaN(reps) || reps <= 0) return
    if (isNaN(weight) || weight < 0) return

    setIsSubmitting(true)
    const { error } = await supabase
      .from('exercise_sets')
      .insert({
        workout_exercise_id: workoutExercise.id,
        set_order: workoutExercise.sets.length + 1,
        reps,
        weight_kg: weight,
      })

    setIsSubmitting(false)
    if (error) { showError('Failed to add set — try again'); return }

    setNewReps('')
    setNewWeight('')
    setIsAddingSet(false)
    onUpdate()
  }, [newReps, newWeight, workoutExercise.id, workoutExercise.sets.length, onUpdate])

  const deleteSet = async (setId: string) => {
    setIsDeletingId(setId)
    const { error: delErr } = await supabase
      .from('exercise_sets')
      .delete()
      .eq('id', setId)

    if (delErr) {
      setIsDeletingId(null)
      showError('Failed to delete set — try again')
      return
    }

    // Reorder remaining sets
    const remaining = workoutExercise.sets
      .filter(s => s.id !== setId)
      .sort((a, b) => a.set_order - b.set_order)

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].set_order !== i + 1) {
        await supabase
          .from('exercise_sets')
          .update({ set_order: i + 1 })
          .eq('id', remaining[i].id)
      }
    }

    setIsDeletingId(null)
    onUpdate()
  }

  const currentVolume = workoutExercise.sets.reduce(
    (sum, set) => sum + set.reps * set.weight_kg,
    0
  )
  const lastVolume  = lastPerformance
    ? lastPerformance.sets.reduce((sum, set) => sum + set.reps * set.weight_kg, 0)
    : 0
  const volumeDiff = lastVolume > 0 ? currentVolume - lastVolume : 0

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
      >
        <div>
          <h3 className="font-semibold text-foreground text-sm">{workoutExercise.exercise.name}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {workoutExercise.sets.length} sets · {Math.round(currentVolume)} kg
            {volumeDiff !== 0 && (
              <span className={cn('ml-1', volumeDiff > 0 ? 'text-green-400' : 'text-red-400')}>
                ({volumeDiff > 0 ? '+' : ''}{Math.round(volumeDiff)} kg)
              </span>
            )}
          </p>
        </div>
        {isExpanded
          ? <ChevronUp  className="size-4 text-muted-foreground flex-shrink-0" />
          : <ChevronDown className="size-4 text-muted-foreground flex-shrink-0" />
        }
      </button>

      {isExpanded && (
        <div className="border-t border-border">
          {/* Error message */}
          {errorMsg && (
            <div className="px-4 py-2 bg-accent/10 border-b border-accent/20">
              <p className="text-xs text-accent">{errorMsg}</p>
            </div>
          )}

          {/* Last performance reference */}
          {lastPerformance && (
            <div className="px-4 py-2.5 bg-white/3 border-b border-border">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1.5">
                <TrendingUp className="size-3" />
                Last · {new Date(lastPerformance.workout_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {lastPerformance.sets.map((set, idx) => (
                  <span key={idx} className="text-[11px] bg-white/6 px-2 py-0.5 rounded-lg text-muted-foreground">
                    {set.weight_kg} kg × {set.reps}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sets list */}
          <div className="divide-y divide-border/40">
            {workoutExercise.sets.map((set) => (
              <div key={set.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-accent/15 text-accent text-xs flex items-center justify-center font-semibold flex-shrink-0">
                    {set.set_order}
                  </span>
                  <span className="text-sm text-foreground font-medium">
                    {set.weight_kg} kg × {set.reps} reps
                  </span>
                </div>
                <button
                  onClick={() => deleteSet(set.id)}
                  disabled={isDeletingId === set.id}
                  className="shrink-0 flex size-8 items-center justify-center rounded-xl text-muted-foreground/40 transition-all hover:bg-accent/10 hover:text-accent active:scale-90 disabled:opacity-50"
                  aria-label="Delete set"
                >
                  {isDeletingId === set.id
                    ? <Loader2 className="size-3.5 animate-spin" />
                    : <Trash2   className="size-3.5" />
                  }
                </button>
              </div>
            ))}
          </div>

          {/* Add set form / button */}
          {isAddingSet ? (
            <div className="p-4 border-t border-border bg-white/2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1.5">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={newWeight}
                    onChange={e => setNewWeight(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-border bg-white/5 px-3 py-2.5 text-sm text-foreground text-center outline-none focus:border-accent/50 transition-colors"
                    inputMode="decimal"
                    autoFocus
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1.5">
                    Reps
                  </label>
                  <input
                    type="number"
                    value={newReps}
                    onChange={e => setNewReps(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addSet() }}
                    placeholder="0"
                    className="w-full rounded-xl border border-border bg-white/5 px-3 py-2.5 text-sm text-foreground text-center outline-none focus:border-accent/50 transition-colors"
                    inputMode="numeric"
                  />
                </div>
                <button
                  onClick={addSet}
                  disabled={!newReps || !newWeight || isSubmitting}
                  className="flex items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : 'Add'}
                </button>
              </div>
              <button
                onClick={() => { setIsAddingSet(false); setNewReps(''); setNewWeight('') }}
                className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={openAddSet}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm text-accent/70 hover:text-accent hover:bg-accent/5 transition-colors border-t border-border"
            >
              <Plus className="size-4" />
              Add Set
            </button>
          )}
        </div>
      )}
    </div>
  )
}
