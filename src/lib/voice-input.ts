"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────

export type VoiceStatus = "idle" | "listening" | "processing" | "error" | "unsupported";

export interface VoiceResult {
  transcript: string;
  confidence: number;
}

// ── Hook ───────────────────────────────────────────────────────────────

const SpeechRecognition =
  (typeof window !== "undefined" &&
    (window.SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
  null;

export function useVoiceInput() {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<string>("");
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null);
  const resolveRef = useRef<((result: VoiceResult) => void) | null>(null);
  const rejectRef = useRef<((err: Error) => void) | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  const startListening = useCallback((): Promise<VoiceResult> => {
    return new Promise((resolve, reject) => {
      if (!SpeechRecognition) {
        setStatus("unsupported");
        reject(new Error("Speech recognition not supported in this browser"));
        return;
      }

      // Clean up previous instance
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognitionRef.current = recognition;
      resolveRef.current = resolve;
      rejectRef.current = reject;

      recognition.onstart = () => {
        setStatus("listening");
        setError("");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;
        setStatus("idle");
        resolve({ transcript, confidence });
      };

      recognition.onerror = (event: any) => {
        setStatus("error");
        const msg = event.error === "not-allowed"
          ? "Microphone access denied"
          : `Speech error: ${event.error}`;
        setError(msg);
        reject(new Error(msg));
      };

      recognition.onend = () => {
        if (status === "listening") {
          setStatus("idle");
        }
      };

      try {
        recognition.start();
      } catch (e) {
        setStatus("error");
        setError("Failed to start speech recognition");
        reject(e as Error);
      }
    });
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setStatus("idle");
  }, []);

  return { status, error, startListening, stopListening };
}
