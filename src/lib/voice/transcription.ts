// Transcribes audio using Groq's Whisper API
// WhatsApp sends audio as OGG/Opus — Whisper handles this natively (no ffmpeg needed)

export interface TranscriptionResult {
  text: string;
  language: string;
  isHinglish: boolean;
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<TranscriptionResult> {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) throw new Error("GROQ_API_KEY is not set");

  const formData = new FormData();
  const audioBlob = new Blob([audioBuffer], { type: "audio/ogg" });
  formData.append("file", audioBlob, "audio.ogg");
  formData.append("model", "whisper-large-v3-turbo");
  formData.append("response_format", "verbose_json");
  // No language specified — auto-detect Hindi, Tamil, Marathi, etc.

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqApiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq transcription failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const text: string = data.text ?? "";
  const language: string = data.language ?? "en";

  // Hinglish detection: Hindi detected but majority text is Roman script
  const romanChars = (text.match(/[a-zA-Z]/g)?.length ?? 0);
  const romanRatio = romanChars / Math.max(text.length, 1);
  const isHinglish = ["hi", "ur"].includes(language) && romanRatio > 0.35;

  return { text, language, isHinglish };
}
