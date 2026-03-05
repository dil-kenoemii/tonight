import { GoogleGenerativeAI } from '@google/generative-ai';
import { Category, QuizResponses, AiSuggestion } from '../types';

// Lazy-initialized client — only created when first needed
let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

const CATEGORY_LABELS: Record<Category, string> = {
  eat: 'where to eat',
  watch: 'what to watch',
  do: 'what to do',
};

/**
 * Generates 3 AI suggestions based on category and quiz responses.
 * Calls Google Gemini and parses the JSON response.
 */
export async function generateSuggestions(
  category: Category,
  quizResponses: QuizResponses
): Promise<AiSuggestion[]> {
  const client = getClient();
  const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are helping a group decide ${CATEGORY_LABELS[category]}.

User preferences from quiz:
${JSON.stringify(quizResponses, null, 2)}

Generate exactly 3 specific, realistic suggestions that match their stated preferences.

Requirements:
- Be specific: Real place names, movie titles, activity names (not generic)
- Match their budget, cuisine/genre, style, dietary needs, and adventure level
- Provide variety while staying within their constraints
- Keep each suggestion under 50 characters
- Format as JSON array with: text, reasoning (one sentence), confidence (0.0-1.0)

Example output:
[
  {
    "text": "Chipotle Mexican Grill",
    "reasoning": "Fast casual Mexican within budget",
    "confidence": 0.9
  }
]

Respond with ONLY the JSON array, no other text.`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  if (!text) {
    throw new Error('No text content in AI response');
  }

  // Strip markdown code fences if present (Gemini sometimes wraps JSON in ```json ... ```)
  const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  // Parse JSON from response
  let suggestions: unknown;
  try {
    suggestions = JSON.parse(cleaned);
  } catch {
    throw new Error('AI response was not valid JSON');
  }

  // Validate structure: must be array of 3 objects with text/reasoning/confidence
  if (!Array.isArray(suggestions) || suggestions.length !== 3) {
    throw new Error('AI response must be an array of exactly 3 suggestions');
  }

  for (const suggestion of suggestions) {
    if (
      typeof suggestion !== 'object' ||
      suggestion === null ||
      typeof suggestion.text !== 'string' ||
      typeof suggestion.reasoning !== 'string' ||
      typeof suggestion.confidence !== 'number'
    ) {
      throw new Error('Each suggestion must have text (string), reasoning (string), and confidence (number)');
    }
  }

  return suggestions as AiSuggestion[];
}
