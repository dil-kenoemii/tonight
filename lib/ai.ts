import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { Category, QuizResponses, AiSuggestion } from '../types';

// Lazy-initialized client — only created when first needed
let bedrockClient: BedrockRuntimeClient | null = null;

function getClient(): BedrockRuntimeClient {
  if (!bedrockClient) {
    const region = process.env.AWS_REGION || 'us-west-2';

    // For local development with AWS SSO, the SDK will use AWS_PROFILE from env
    // For production, set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
    bedrockClient = new BedrockRuntimeClient({
      region,
      // Credentials are automatically loaded from:
      // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
      // 2. AWS profile (AWS_PROFILE)
      // 3. IAM role (if running on AWS)
    });
  }
  return bedrockClient;
}

const CATEGORY_LABELS: Record<Category, string> = {
  eat: 'where to eat',
  watch: 'what to watch',
  do: 'what to do',
};

/**
 * Generates 5 AI suggestions based on category and quiz responses.
 * Calls AWS Bedrock (Claude) and parses the JSON response.
 */
export async function generateSuggestions(
  category: Category,
  quizResponses: QuizResponses
): Promise<AiSuggestion[]> {
  const client = getClient();

  // Build location-aware prompt based on category
  const locationContext = category === 'eat' || category === 'do'
    ? 'Location: Budapest, Hungary\nCurrency: HUF (Hungarian Forint)\n'
    : '';

  const budgetContext = category === 'eat' || category === 'do'
    ? 'Budget is in HUF. Typical ranges: Budget ~2000-4000 HUF, Mid-range ~5000-10000 HUF, High-end 10000+ HUF.'
    : 'Budget context applies to the user\'s stated preferences.';

  const locationRequirement = category === 'eat'
    ? '- Suggest real restaurants, cafés, or food spots that exist in Budapest'
    : category === 'do'
    ? '- Suggest real activities, attractions, or venues that exist in Budapest'
    : '- Suggest real movie titles or shows (location not applicable for watching content)';

  // For movies, add current date context
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const watchContext = category === 'watch' ? `Current Date: ${currentDate}\n` : '';

  // Platform-specific guidance for streaming services
  const platform = quizResponses.platform as string;
  const platformGuidance = category === 'watch' && platform && platform !== 'Any streaming' && platform !== 'Don\'t care'
    ? `\nNote: User prefers ${platform}. Suggest content that would be available on this platform.`
    : '';

  const prompt = `You are helping a group in Budapest, Hungary decide ${CATEGORY_LABELS[category]}.

${locationContext}${watchContext}User preferences from quiz:
${JSON.stringify(quizResponses, null, 2)}
${platformGuidance}

Generate exactly 5 specific, realistic suggestions that match their stated preferences.

Requirements:
- Be specific: Real place names, movie titles, activity names (not generic)
${locationRequirement}
- Match their budget, cuisine/genre, style, dietary needs, and adventure level
- ${budgetContext}
- Provide variety while staying within their constraints
- Keep each suggestion under 50 characters
- Format as JSON array with: text, reasoning (one sentence), confidence (0.0-1.0)

Example output for restaurants in Budapest:
[
  {
    "text": "Bors GasztroBar",
    "reasoning": "Budget-friendly Hungarian soup bar in the Jewish Quarter",
    "confidence": 0.9
  }
]

Example output for movies/shows:
[
  {
    "text": "The Bear",
    "reasoning": "Acclaimed comedy-drama series, great for group watching",
    "confidence": 0.9
  }
]

Respond with ONLY the JSON array, no other text.`;

  // Prepare Bedrock API request for Claude
  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  };

  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0', // Claude 3.5 Sonnet
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  });

  // Invoke Bedrock model
  const response = await client.send(command);

  // Parse response body
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  // Extract text from Claude's response
  const textContent = responseBody.content?.find((block: { type: string; text?: string }) => block.type === 'text');
  if (!textContent || !textContent.text) {
    throw new Error('No text content in AI response');
  }

  const text = textContent.text;

  // Strip markdown code fences if present (Claude sometimes wraps JSON in ```json ... ```)
  const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  // Parse JSON from response
  let suggestions: unknown;
  try {
    suggestions = JSON.parse(cleaned);
  } catch {
    throw new Error('AI response was not valid JSON');
  }

  // Validate structure: must be array of 5 objects with text/reasoning/confidence
  if (!Array.isArray(suggestions) || suggestions.length !== 5) {
    throw new Error('AI response must be an array of exactly 5 suggestions');
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
