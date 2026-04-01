-- Align gym tables with the current frontend app schema.
-- Safe to run on top of 001_create_gym_tables.sql (idempotent).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Keep one shared updated_at trigger function.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Exercises
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_lower TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS name_lower TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE exercises
SET name_lower = LOWER(name)
WHERE name_lower IS NULL OR name_lower = '';

ALTER TABLE exercises ALTER COLUMN name_lower SET NOT NULL;

-- Workouts
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  total_sets INTEGER NOT NULL DEFAULT 0,
  total_volume_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS total_sets INTEGER NOT NULL DEFAULT 0;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS total_volume_kg NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Workout exercises
CREATE TABLE IF NOT EXISTS workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  exercise_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workout_exercises'
      AND column_name = 'order_index'
  ) THEN
    ALTER TABLE workout_exercises RENAME COLUMN order_index TO exercise_order;
  END IF;
END $$;

ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS exercise_order INTEGER NOT NULL DEFAULT 1;

-- Exercise sets
CREATE TABLE IF NOT EXISTS exercise_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_order INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight_kg NUMERIC(8,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'exercise_sets'
      AND column_name = 'set_number'
  ) THEN
    ALTER TABLE exercise_sets RENAME COLUMN set_number TO set_order;
  END IF;
END $$;

ALTER TABLE exercise_sets ADD COLUMN IF NOT EXISTS set_order INTEGER;
ALTER TABLE exercise_sets ALTER COLUMN set_order SET NOT NULL;

-- Triggers
DROP TRIGGER IF EXISTS update_workouts_updated_at ON workouts;
CREATE TRIGGER update_workouts_updated_at
BEFORE UPDATE ON workouts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exercises_updated_at ON exercises;
CREATE TRIGGER update_exercises_updated_at
BEFORE UPDATE ON exercises
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workouts_started_at ON workouts(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_ended_at ON workouts(ended_at);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_workout_exercise_id ON exercise_sets(workout_exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercises_name_lower ON exercises(name_lower);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);
