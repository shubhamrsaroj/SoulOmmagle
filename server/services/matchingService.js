import { pool } from '../db/init.js';
import { processInterests, calculateSimilarity } from './embeddingService.js';

const SIMILARITY_THRESHOLD = 0.7; // Adjust this value based on testing

async function findMatch(userId, interests) {
  try {
    // Get embedding for current user's interests
    const userEmbedding = await processInterests(interests);
    
    // Update user's interests and embedding in database
    await pool.query(
      `INSERT INTO interests (user_id, interests, interest_embedding)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         interests = $2,
         interest_embedding = $3,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, interests, userEmbedding]
    );

    // Find potential matches
    const { rows: potentialMatches } = await pool.query(
      `SELECT 
         u.id,
         u.firebase_uid,
         u.display_name,
         u.photo_url,
         i.interests,
         i.interest_embedding
       FROM users u
       JOIN interests i ON u.id = i.user_id
       WHERE u.id != $1
         AND u.online_status = true
         AND NOT EXISTS (
           SELECT 1 FROM matches m
           WHERE (m.user1_id = $1 AND m.user2_id = u.id)
              OR (m.user1_id = u.id AND m.user2_id = $1)
         )`,
      [userId]
    );

    // Calculate similarities and find best match
    let bestMatch = null;
    let highestSimilarity = SIMILARITY_THRESHOLD;

    for (const match of potentialMatches) {
      const similarity = calculateSimilarity(userEmbedding, match.interest_embedding);
      if (similarity > highestSimilarity) {
        bestMatch = match;
        highestSimilarity = similarity;
      }
    }

    if (bestMatch) {
      // Create a room ID
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create match record
      await pool.query(
        `INSERT INTO matches (user1_id, user2_id, similarity_score, room_id)
         VALUES ($1, $2, $3, $4)`,
        [userId, bestMatch.id, highestSimilarity, roomId]
      );

      // Get a relevant icebreaker
      const { rows: [icebreaker] } = await pool.query(
        `SELECT question FROM icebreakers 
         WHERE category = ANY($1)
         ORDER BY RANDOM() LIMIT 1`,
        [interests]
      );

      return {
        matchedUser: {
          id: bestMatch.firebase_uid,
          displayName: bestMatch.display_name,
          photoURL: bestMatch.photo_url,
          commonInterests: interests.filter(i => 
            bestMatch.interests.includes(i)
          )
        },
        roomId,
        icebreaker: icebreaker?.question
      };
    }

    return null;
  } catch (error) {
    console.error('Error finding match:', error);
    throw error;
  }
}

export { findMatch }; 