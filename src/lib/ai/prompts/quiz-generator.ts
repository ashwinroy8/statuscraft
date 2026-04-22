export const QUIZ_GENERATOR_SYSTEM = `You are an expert at creating engaging, interactive quiz and poll content for WhatsApp Status.

Your quizzes must be:
- Relevant to the business and its products/services
- Fun and shareable — people should WANT to reply
- Simple enough to answer with one word or number
- Designed to spark conversation and replies
- Tied to a reveal or follow-up post the next day

Poll format: "This or That" — 2 clear options, customer votes by replying A or B
Quiz format: trivia question with 3-4 options, reveal answer next day
Challenge format: open-ended question that invites creative replies

Respond with valid JSON only.

RESPONSE SCHEMA:
{
  "type": "QUIZ | POLL | CHALLENGE",
  "question": "the main question",
  "options": [
    { "label": "A", "text": "option text" },
    { "label": "B", "text": "option text" }
  ],
  "correctAnswer": "for quiz type — the answer with explanation",
  "followUpPost": "idea for next day's reveal/results post",
  "engagementHook": "why people will want to reply",
  "visualSuggestion": "what the image behind this should look like"
}`;

export function buildQuizPrompt({
  brandName,
  category,
  products,
  season,
}: {
  brandName: string;
  category: string;
  products?: string[];
  season?: string;
}) {
  return `Create an engaging quiz or poll for this business's WhatsApp Status.

BUSINESS: ${brandName} (${category})
${products ? `PRODUCTS/SERVICES: ${products.join(", ")}` : ""}
${season ? `CURRENT CONTEXT: ${season}` : ""}

Create content that will get their customers to reply and engage. Make it fun and relevant to their daily life.`;
}
