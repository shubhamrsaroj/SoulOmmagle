import { GoogleGenerativeAI } from "@google/generative-ai";
import { pool } from '../db/init.js';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function getEmbedding(interests) {
  try {
    // Verify API key exists
    if (!process.env.GOOGLE_API_KEY) {
      console.warn('GEMINI_API_KEY not found in environment variables');
      // Return a simple fallback embedding (normalized random vector)
      const fallbackEmbedding = Array(512).fill(0).map(() => Math.random());
      const magnitude = Math.sqrt(fallbackEmbedding.reduce((sum, val) => sum + val * val, 0));
      return fallbackEmbedding.map(val => val / magnitude);
    }

    const model = genAI.getGenerativeModel({ model: "embedding-001" });
    const interestsText = interests.join(', ');
    
    const result = await model.embedContent(interestsText);
    const embedding = result.embedding.values;
    
    // Normalize the embedding vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    const normalizedEmbedding = embedding.map(val => val / magnitude);
    
    return normalizedEmbedding;
  } catch (error) {
    console.error('Error getting embedding:', error);
    
    // If API key is invalid, use fallback embedding
    if (error.message?.includes('API key not valid') || error.status === 400) {
      console.warn('Using fallback embedding due to API key error');
      const fallbackEmbedding = Array(512).fill(0).map(() => Math.random());
      const magnitude = Math.sqrt(fallbackEmbedding.reduce((sum, val) => sum + val * val, 0));
      return fallbackEmbedding.map(val => val / magnitude);
    }
    
    throw new Error('Failed to generate interest embedding: ' + error.message);
  }
}

// Save user interests to database
async function saveInterests(userId, interests) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // First, ensure user exists in users table with display_name
    let userResult = await client.query(
      `INSERT INTO users (firebase_uid, display_name, online_status)
       VALUES ($1, $1, true)
       ON CONFLICT (firebase_uid) 
       DO UPDATE SET 
         online_status = true,
         last_active = CURRENT_TIMESTAMP
       RETURNING id`,
      [userId]
    );

    const userDbId = userResult.rows[0].id;

    // Update or insert interests
    await client.query(
      `INSERT INTO user_interests (user_id, interests)
       VALUES ($1, $2)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         interests = $2,
         created_at = CURRENT_TIMESTAMP`,
      [userDbId, interests]
    );

    await client.query('COMMIT');
    console.log(`Saved interests for user ${userId}:`, interests);
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving interests:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function findBestMatch(userId, availableUsers) {
  const client = await pool.connect();
  try {
    console.log('Finding match for user:', userId);
    console.log('Available users:', availableUsers);

    if (!availableUsers || availableUsers.length === 0) {
      return { 
        match: null, 
        message: 'No users available for matching',
        error: 'NO_USERS'
      };
    }

    // Get current user's interests
    const userResult = await client.query(
      `SELECT u.id, ui.interests 
       FROM users u
       LEFT JOIN user_interests ui ON u.id = ui.user_id
       WHERE u.firebase_uid = $1`,
      [userId]
    );

    if (!userResult.rows.length || !userResult.rows[0].interests) {
      console.log('No interests found for user:', userId);
      return { 
        match: null, 
        message: 'Please set your interests first',
        error: 'NO_INTERESTS'
      };
    }

    const userInterests = userResult.rows[0].interests;
    console.log('User interests:', userInterests);

    // Get potential matches with their interests
    const matchesResult = await client.query(
      `SELECT 
         u.firebase_uid,
         u.display_name,
         u.photo_url,
         ui.interests
       FROM users u
       JOIN user_interests ui ON u.id = ui.user_id
       WHERE u.firebase_uid = ANY($1)
         AND u.online_status = true
         AND u.firebase_uid != $2`,
      [availableUsers, userId]
    );

    console.log('Found potential matches:', matchesResult.rows.length);

    let bestMatch = null;
    let highestScore = 0;

    for (const potentialMatch of matchesResult.rows) {
      if (!potentialMatch.interests) continue;

      // Calculate common interests
      const commonInterests = userInterests.filter(interest => 
        potentialMatch.interests.includes(interest)
      );
      
      const similarityScore = commonInterests.length;
      console.log('Comparing with user:', potentialMatch.firebase_uid);
      console.log('Their interests:', potentialMatch.interests);
      console.log('Common interests:', commonInterests);
      console.log('Similarity score:', similarityScore);

      if (similarityScore > highestScore) {
        highestScore = similarityScore;
        bestMatch = {
          firebaseUid: potentialMatch.firebase_uid,
          displayName: potentialMatch.display_name || potentialMatch.firebase_uid,
          photoURL: potentialMatch.photo_url || '',
          commonInterests,
          similarityScore
        };
      }
    }

    if (bestMatch) {
      console.log('Best match found:', bestMatch);
      return { match: bestMatch, message: 'Match found' };
    } else {
      console.log('No suitable match found');
      return { 
        match: null, 
        message: 'No suitable match found',
        error: 'NO_MATCH'
      };
    }
  } catch (error) {
    console.error('Error finding match:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function updateUserOnlineStatus(userId, isOnline) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO users (firebase_uid, online_status, last_active)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (firebase_uid) 
       DO UPDATE SET 
         online_status = $2,
         last_active = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, isOnline]
    );

    console.log(`Updated online status for user ${userId} to ${isOnline}`);
    return result.rows[0];
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function getUserInterests(userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT ui.interests 
       FROM users u
       LEFT JOIN user_interests ui ON u.id = ui.user_id
       WHERE u.firebase_uid = $1`,
      [userId]
    );

    return result.rows[0]?.interests || [];
  } catch (error) {
    console.error('Error getting user interests:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Single export statement at the end
export { findBestMatch, updateUserOnlineStatus, saveInterests, getUserInterests }; 