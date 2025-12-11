-- Reset password for requester@it to '123456'
-- Password hash for '123456' with bcrypt rounds=10
UPDATE users 
SET password = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE email = 'requester@it';

-- Verify the update
SELECT email, password IS NOT NULL as has_password FROM users WHERE email = 'requester@it';
