// Transcribes audio using Groq's Whisper API
// WhatsApp sends audio as OGG/Opus — Whisper handles this natively (no ffmpeg needed)

export interface TranscriptionResult {
  text: string;
  language: string;
  isHinglish: boolean;
}

// Map any input mime/extension to one Groq accepts
function normaliseAudio(buffer: Buffer, originalName = ""): { blob: Blob; filename: string } {
  const ext = originalName.split(".").pop()?.toLowerCase() ?? "";
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;

  const mimeMap: Record<string, { mime: string; filename: string }> = {
    mp3:  { mime: "audio/mpeg",  filename: "audio.mp3"  },
    mpeg: { mime: "audio/mpeg",  filename: "audio.mp3"  },
    mpga: { mime: "audio/mpeg",  filename: "audio.mp3"  },
    mp4:  { mime: "audio/mp4",   filename: "audio.mp4"  },
    m4a:  { mime: "audio/mp4",   filename: "audio.mp4"  },
    aac:  { mime: "audio/mp4",   filename: "audio.mp4"  }, // AAC repackaged as mp4
    ogg:  { mime: "audio/ogg",   filename: "audio.ogg"  },
    opus: { mime: "audio/ogg",   filename: "audio.ogg"  },
    wav:  { mime: "audio/wav",   filename: "audio.wav"  },
    webm: { mime: "audio/webm",  filename: "audio.webm" },
    flac: { mime: "audio/flac",  filename: "audio.flac" },
  };

  const mapped = mimeMap[ext];
  // If extension is known, use it; otherwise default to mp4 (most universal)
  const { mime, filename } = mapped ?? { mime: "audio/mp4", filename: "audio.mp4" };
  return { blob: new Blob([ab], { type: mime }), filename };
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
