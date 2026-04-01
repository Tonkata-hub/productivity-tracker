-- Add optional name field to workouts (e.g. "Push Day", "Upper Body")
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS name TEXT;
