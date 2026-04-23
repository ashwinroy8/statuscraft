export type ReplyType =
  | "PURCHASE_INTENT"
  | "QUESTION"
  | "QUIZ_ANSWER"
  | "POLL_VOTE"
  | "GENERAL"
  | "REACTION";

export interface ReplyClassification {
  type: ReplyType;
  confidence: number;
  answer?: string;
  vote?: string;
}

const PURCHASE_KEYWORDS = [
  "interested", "price", "order", "want", "buy", "book", "reserve", "available",
  "deliver", "cod", "payment", "kitna", "kaise", "chahiye", "lena", "bhejo",
  "how much", "rate", "cost", "khareedna", "quantity", "stock", "mil sakta",
  "bhej do", "send", "purchase",
];

const QUESTION_KEYWORDS = [
  "what", "when", "where", "how", "which", "kya", "kab", "kahan", "kaisa",
  "size", "color", "colour", "flavour", "flavor", "variant", "ingredient",
  "material", "delivery time", "?",
];

const PURCHASE_EMOJIS = ["👍", "🙋", "🙋‍♀️", "❤️", "😍", "🔥", "💰", "✋", "😮", "🤩", "👌", "💯", "🛒", "✅"];

export function classifyReply(text: string, postType: string): ReplyClassification {
  const lower = text.toLowerCase().trim();

  // Quiz answer
  if (postType === "QUIZ") {
    return { type: "QUIZ_ANSWER", confidence: 0.9, answer: text };
  }

  // Poll vote
  if (postType === "POLL") {
    return { type: "POLL_VOTE", confidence: 0.9, vote: text };
  }

  // Purchase intent keywords
  if (PURCHASE_KEYWORDS.some((k) => lower.includes(k))) {
    return { type: "PURCHASE_INTENT", confidence: 0.85 };
  }

  // Emoji reactions that signal interest
  if (PURCHASE_EMOJIS.some((e) => text.includes(e))) {
    return { type: "REACTION", confidence: 0.8 };
  }

  // Question
  if (QUESTION_KEYWORDS.some((k) => lower.includes(k))) {
    return { type: "QUESTION", confidence: 0.75 };
  }

  return { type: "GENERAL", confidence: 0.6 };
}
