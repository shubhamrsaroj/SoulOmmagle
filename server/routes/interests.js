import express from 'express';
import { pool } from '../db/init.js';
import { saveInterests } from '../services/interestMatching.js';

const router = express.Router();

// Get user interests
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(
      `SELECT ui.interests 
       FROM users u
       LEFT JOIN user_interests ui ON u.id = ui.user_id
       WHERE u.firebase_uid = $1`,
      [userId]
    );

    res.json({ 
      interests: result.rows[0]?.interests || [] 
    });
  } catch (error) {
    console.error('Error fetching interests:', error);
    res.status(500).json({ error: 'Failed to fetch interests' });
  }
});

// Save user interests
router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { interests } = req.body;

    if (!Array.isArray(interests)) {
      return res.status(400).json({ error: 'Interests must be an array' });
    }

    await saveInterests(userId, interests);
    res.json({ success: true, interests });
  } catch (error) {
    console.error('Error saving interests:', error);
    res.status(500).json({ error: 'Failed to save interests' });
  }
});

export default router; 
