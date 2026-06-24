import { QuizQuestion } from '../constants/types';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const ENV_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';

function resolveKey(userKey: string): string {
  return userKey.trim() || ENV_KEY;
}

async function callGroq(
  apiKey: string,
  messages: { role: string; content: string }[],
  systemPrompt?: string,
  jsonMode = false
): Promise<string> {
  const allMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: allMessages,
      max_tokens: 2048,
      temperature: 0.7,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `Groq API error ${res.status}`);
  }

  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? '').trim();
}

export async function generateQuiz(
  apiKey: string,
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard',
  count: number
): Promise<QuizQuestion[]> {
  const key = resolveKey(apiKey);
  if (!key) throw new Error('No Groq API key configured');
  const system = `You are a quiz generator. Return ONLY valid JSON — no markdown, no extra text.`;

  const prompt = `Generate ${count} multiple-choice questions about "${topic}" at ${difficulty} difficulty.

Return exactly this JSON shape:
{
  "questions": [
    {
      "id": "1",
      "question": "...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Brief explanation of the correct answer."
    }
  ]
}`;

  const text = await callGroq(key, [{ role: 'user', content: prompt }], system, true);
  const cleaned = text.replace(/```json?|```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return parsed.questions as QuizQuestion[];
}

export async function chatWithCoach(
  apiKey: string,
  messages: { role: string; content: string }[],
  userContext: {
    name: string;
    studyGoal: string;
    streak: number;
    recentMood?: string;
    recentQuizTopic?: string;
  }
): Promise<string> {
  const key = resolveKey(apiKey);
  if (!key) throw new Error('No Groq API key configured');

  const system = `You are Sage, an encouraging AI study coach. You're helping ${userContext.name} achieve their goal: "${userContext.studyGoal}".
Current study streak: ${userContext.streak} days.${userContext.recentMood ? `\nRecent mood: ${userContext.recentMood}.` : ''}${userContext.recentQuizTopic ? `\nRecently studied: ${userContext.recentQuizTopic}.` : ''}
Be warm, concise, and practical. Keep responses to 2-3 short paragraphs. Use encouraging language.`;

  return callGroq(key, messages, system);
}
