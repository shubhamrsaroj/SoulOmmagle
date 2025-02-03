import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOFLE_API_KEY);

async function getEmbeddings(text) {
  try {
    const model = genAI.getGenerativeModel({ model: "embedding-001" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Error getting embeddings:', error);
    throw error;
  }
}

async function processInterests(interests) {
  try {
    // Join interests into a single string
    const interestsText = interests.join(', ');
    
    // Get embeddings for the interests
    const embedding = await getEmbeddings(interestsText);
    
    // Normalize the embedding vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    const normalizedEmbedding = embedding.map(val => val / magnitude);
    
    return normalizedEmbedding;
  } catch (error) {
    console.error('Error processing interests:', error);
    throw error;
  }
}

// Calculate cosine similarity between two vectors
function calculateSimilarity(vector1, vector2) {
  if (vector1.length !== vector2.length) {
    throw new Error('Vectors must be of same length');
  }
  
  const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
  return dotProduct; // Vectors are already normalized
}

export { processInterests, calculateSimilarity }; 