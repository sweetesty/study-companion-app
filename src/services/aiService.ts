import { QuizQuestion } from '../constants/types';

const API_URL = 'https://api.anthropic.com/v1/messages';

async function callClaude(apiKey: string, messages: { role: string; content: string }[], system?: string): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `API error ${res.status}`);
  }

  const data = await res.json();
  return (data.content?.[0]?.text ?? '').trim();
}

export async function generateQuiz(
  apiKey: string,
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard',
  count: number
): Promise<QuizQuestion[]> {
  const system = `You are a quiz generator. Return ONLY valid JSON — no markdown, no explanation.`;
  const prompt = `Generate ${count} multiple-choice questions about "${topic}" at ${difficulty} difficulty.

Return exactly this JSON shape:
{
  "questions": [
    {
      "id": "1",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Brief explanation of the correct answer."
    }
  ]
}`;

  const text = await callClaude(apiKey, [{ role: 'user', content: prompt }], system);

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
  const system = `You are an encouraging AI study coach named Sage. You're helping ${userContext.name} with their goal: "${userContext.studyGoal}".
Their current study streak: ${userContext.streak} days.${userContext.recentMood ? `\nRecent mood: ${userContext.recentMood}.` : ''}${userContext.recentQuizTopic ? `\nRecently studied: ${userContext.recentQuizTopic}.` : ''}
Be warm, concise, and practical. Keep responses to 2-3 short paragraphs max. Use encouraging language.`;

  return callClaude(apiKey, messages as any, system);
}
