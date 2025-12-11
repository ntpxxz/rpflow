-- Add userMail column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_mail VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_user_mail ON users(user_mail);
