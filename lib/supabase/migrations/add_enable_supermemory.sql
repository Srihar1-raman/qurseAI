-- Add enable_supermemory column to user_preferences table
-- Allows users to opt-out of Supermemory feature
-- Default value is TRUE (feature enabled by default)

ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS enable_supermemory BOOLEAN DEFAULT TRUE NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_preferences.enable_supermemory IS 'Enable/disable Supermemory AI memory feature';
