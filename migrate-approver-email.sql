-- Migrate data from approver_email to user_mail
-- Copy data from approver_email to user_mail where user_mail is NULL
UPDATE users 
SET user_mail = approver_email 
WHERE user_mail IS NULL AND approver_email IS NOT NULL;

-- Verify the migration
SELECT email, approver_email, user_mail FROM users;

-- Drop the approver_email column
ALTER TABLE users DROP COLUMN IF EXISTS approver_email;

-- Verify the final structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
