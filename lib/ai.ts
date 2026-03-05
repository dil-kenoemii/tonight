import Anthropic from '@anthropic-ai/sdk';
import { Category, QuizResponses, AiSuggestion } from '../types';

// Lazy-initialized client — only created when first needed
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

const CATEGORY_LABELS: Record<Category, string> = {
  eat: 'where to eat',
  watch: 'what to watch',
  do: 'what to do',
};

/**
 * Generates 3 AI suggestions based on category and quiz responses.
 * Calls Claude Sonnet and parses the JSON response.
 */
export async function generateSuggestions(
  category: Category,
  quizResponses: QuizResponses
): Promise<AiSuggestion[]> {
  const anthropic = getClient();

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

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  // Extract text from response
  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text content in AI response');
  }

  // Parse JSON from response
  let suggestions: unknown;
  try {
    suggestions = JSON.parse(textBlock.text);
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
