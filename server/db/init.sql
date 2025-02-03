-- Drop existing tables if they exist (in correct order)
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS interests CASCADE;
DROP TABLE IF EXISTS user_interests CASCADE;  -- Drop this table if it exists
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS icebreakers CASCADE;

-- Create vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    photo_url TEXT,
    online_status BOOLEAN DEFAULT false,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create interests table with vector support
CREATE TABLE interests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    interests TEXT[] NOT NULL,
    interest_embedding vector(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create matches table
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    user1_id INTEGER REFERENCES users(id),
    user2_id INTEGER REFERENCES users(id),
    similarity_score FLOAT NOT NULL,
    room_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Create icebreakers table
CREATE TABLE icebreakers (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating timestamp
CREATE TRIGGER update_interests_updated_at
    BEFORE UPDATE ON interests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_online_status ON users(online_status);
CREATE INDEX idx_matches_users ON matches(user1_id, user2_id);
CREATE INDEX interests_user_id_idx ON interests(user_id);
CREATE INDEX idx_interests_embedding ON interests USING ivfflat (interest_embedding vector_cosine_ops);

-- Create vector index if ivfflat is available
DO $$ 
BEGIN
  CREATE INDEX interests_embedding_idx ON interests USING ivfflat (interest_embedding vector_cosine_ops);
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'ivfflat access method not available - skipping vector index';
END $$; 