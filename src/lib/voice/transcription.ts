// Transcribes audio using Groq's Whisper API
// WhatsApp sends audio as OGG/Opus — Whisper handles this natively (no ffmpeg needed)

export interface TranscriptionResult {
  text: string;
  language: string;
  isHinglish: boolean;
}

// Map any input mime/extension to one Groq accepts
function normaliseAudio(buffer: Buffer, originalName = "audio.ogg"): { blob: Blob; filename: string } {
  const ext = originalName.split(".").pop()?.toLowerCase() ?? "ogg";

  // AAC and M4A are the same codec — Groq accepts m4a
  if (ext === "aac") {
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    return { blob: new Blob([ab], { type: "audio/m4a" }), filename: "audio.m4a" };
  }

  // Supported types pass through unchanged
  const supported = ["flac", "mp3", "mp4", "mpeg", "mpga", "m4a", "ogg", "opus", "wav", "webm"];
  const safExt = supported.includes(ext) ? ext : "ogg";
  const mimeMap: Record<string, string> = {
    flac: "audio/flac", mp3: "audio/mpeg", mp4: "audio/mp4", mpeg: "audio/mpeg",
    mpga: "audio/mpeg", m4a: "audio/m4a", ogg: "audio/ogg", opus: "audio/opus",
    wav: "audio/wav", webm: "audio/webm",
  };
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  return { blob: new Blob([ab], { type: mimeMap[safExt] ?? "audio/ogg" }), filename: `audio.${safExt}` };
}

export async function transcribeAudio(audioBuffer: Buffer, originalName?: string): Promise<TranscriptionResult> {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) throw new Error("GROQ_API_KEY is not set");

  const { blob: audioBlob, filename } = normaliseAudio(audioBuffer, originalName);
  const formData = new FormData();
  formData.append("file", audioBlob, filename);
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
