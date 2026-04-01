'use client'

import type { WorkoutWithExercises } from '@/lib/types'
import { Trophy, Clock, Dumbbell, TrendingUp, Check, ArrowLeft } from 'lucide-react'

interface WorkoutSummaryProps {
  workout: WorkoutWithExercises
  duration: number
  totalSets: number
  totalVolume: number
  onConfirm: () => void
  onCancel: () => void
}

export function WorkoutSummary({
  workout,
  duration,
  totalSets,
  totalVolume,
  onConfirm,
  onCancel
}: WorkoutSummaryProps) {
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hrs > 0) {
      return `${hrs}h ${mins}m`
    }
    return `${mins}m`
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to workout</span>
        </button>
      </div>

      {/* Summary Content */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6">
          <Trophy className="w-8 h-8 text-primary" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2 text-balance text-center">Workout Complete!</h1>
        <p className="text-muted-foreground mb-8 text-center">Great job pushing through!</p>

        {/* Stats Grid */}
        <div className="w-full max-w-sm grid grid-cols-3 gap-4 mb-8">
          <SummaryStatCard
            icon={<Clock className="w-5 h-5" />}
            label="Duration"
            value={formatDuration(duration)}
          />
          <SummaryStatCard
            icon={<Dumbbell className="w-5 h-5" />}
            label="Sets"
            value={totalSets.toString()}
          />
          <SummaryStatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Volume"
            value={`${Math.round(totalVolume)}kg`}
          />
        </div>

        {/* Exercise Breakdown */}
        <div className="w-full max-w-sm space-y-2 mb-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Exercise Breakdown</h2>
          {workout.workout_exercises.map((we) => {
            const exerciseVolume = we.sets.reduce(
              (sum, set) => sum + (set.reps * set.weight_kg),
              0
            )
            return (
              <div
                key={we.id}
                className="flex items-center justify-between bg-card border border-border rounded-lg p-3"
              >
                <div>
                  <p className="font-medium text-foreground">{we.exercise.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {we.sets.length} sets
                  </p>
                </div>
                <p className="text-primary font-semibold">{Math.round(exerciseVolume)} kg</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <button
          onClick={onConfirm}
          className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors active:scale-[0.98]"
        >
          <Check className="w-5 h-5" />
          <span>Save Workout</span>
        </button>
      </div>
    </div>
  )
}

function SummaryStatCard({
  icon,
  label,
  value
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 text-center">
      <div className="text-primary mb-2 flex justify-center">{icon}</div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
