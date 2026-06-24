/**
 * Browser-native voice dictation via the Web Speech API (SpeechRecognition).
 * Works in Chrome/Edge; gracefully reports `supported: false` elsewhere (e.g.
 * Firefox) so the UI can hide the mic. Finalized phrases are pushed to onText.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeechDictation(onText: (chunk: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<any>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      }
      if (finalText.trim()) onTextRef.current(finalText.trim() + " ");
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => { try { rec.stop(); } catch { /* noop */ } };
  }, []);

  const start = useCallback(() => { try { recRef.current?.start(); setListening(true); } catch { /* already started */ } }, []);
  const stop = useCallback(() => { try { recRef.current?.stop(); } catch { /* noop */ } setListening(false); }, []);
  const toggle = useCallback(() => { listening ? stop() : start(); }, [listening, start, stop]);

  return { listening, supported, toggle };
}
