// Utility function for creating embeddings
// This is a placeholder implementation that can be replaced with actual AI service integration

const createEmbedding = async (text) => {
  try {
    // If you have an AI service (like OpenAI, TensorFlow, etc.), integrate here
    // For now, return a simple hash-based embedding as placeholder
    
    if (!text || typeof text !== 'string') {
      return [];
    }

    // Simple text preprocessing
    const cleanText = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Create a simple hash-based embedding (placeholder)
    // In production, replace this with actual AI service call
    const words = cleanText.split(' ').filter(word => word.length > 2);
    const embedding = new Array(384).fill(0); // Standard embedding size
    
    // Simple word-to-vector mapping (placeholder logic)
    words.forEach((word, index) => {
      const hash = simpleHash(word);
      const position = hash % embedding.length;
      embedding[position] = (embedding[position] || 0) + (1 / (index + 1));
    });

    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;

  } catch (error) {
    console.error('Error creating embedding:', error);
    return new Array(384).fill(0); // Return zero vector on error
  }
};

// Simple hash function for placeholder embedding
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

// Batch embedding creation for multiple texts
const createBatchEmbeddings = async (texts) => {
  try {
    const embeddings = [];
    for (const text of texts) {
      const embedding = await createEmbedding(text);
      embeddings.push(embedding);
    }
    return embeddings;
  } catch (error) {
    console.error('Error creating batch embeddings:', error);
    return texts.map(() => new Array(384).fill(0));
  }
};

// Calculate cosine similarity between two embeddings
const cosineSimilarity = (embedding1, embedding2) => {
  try {
    if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
      return 0;
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  } catch (error) {
    console.error('Error calculating cosine similarity:', error);
    return 0;
  }
};

// Find most similar embeddings to a query embedding
const findSimilarEmbeddings = (queryEmbedding, candidateEmbeddings, topK = 10) => {
  try {
    const similarities = candidateEmbeddings.map((embedding, index) => ({
      index,
      similarity: cosineSimilarity(queryEmbedding, embedding)
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  } catch (error) {
    console.error('Error finding similar embeddings:', error);
    return [];
  }
};

// Example integration with OpenAI (commented out - uncomment if you have OpenAI API)
/*
const createEmbedding = async (text) => {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-ada-002'
      })
    });

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error creating OpenAI embedding:', error);
    return new Array(1536).fill(0); // OpenAI embeddings are 1536 dimensions
  }
};
*/

module.exports = {
  createEmbedding,
  createBatchEmbeddings,
  cosineSimilarity,
  findSimilarEmbeddings
};
