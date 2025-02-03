-- Drop existing tables if they exist
DROP TABLE IF EXISTS user_interests CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table with display_name
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) DEFAULT '',
    photo_url TEXT,
    online_status BOOLEAN DEFAULT false,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_interests table
CREATE TABLE user_interests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    interests TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_user_interests_user_id ON user_interests(user_id);

-- Drop the existing matches table if it exists
DROP TABLE IF EXISTS matches;

-- Recreate the matches table with proper constraints
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    user1_id INTEGER REFERENCES users(id),
    user2_id INTEGER REFERENCES users(id),
    similarity_score FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_match UNIQUE(user1_id, user2_id)
); 