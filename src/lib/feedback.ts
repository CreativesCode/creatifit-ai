// Señal de "fin de descanso": vibración + beep corto. 100% web-native, sin assets
// ni dependencias ($0). Sirve para que el usuario no tenga que mirar la pantalla
// durante el descanso. Degrada en silencio si el dispositivo no lo soporta
// (p.ej. WKWebView de iOS ignora navigator.vibrate).

type AudioCtor = typeof AudioContext;

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const w = window as unknown as {
      AudioContext?: AudioCtor;
      webkitAudioContext?: AudioCtor;
    };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return null;
    if (!audioCtx) audioCtx = new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
}

// Un tono breve con envolvente suave (evita el "click" de cortar la onda en seco).
function beep(ctx: AudioContext, freq: number, startOffset: number, dur: number) {
  const t0 = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// Señal de fin de descanso: doble beep ascendente + patrón de vibración.
export function playRestEndCue() {
  try {
    navigator.vibrate?.([120, 60, 120]);
  } catch {
    // sin soporte de vibración: ignorar
  }
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    // El AudioContext puede estar suspendido hasta el primer gesto; en una sesión
    // el usuario ya ha interactuado (registrar series), así que se reanuda.
    if (ctx.state === "suspended") void ctx.resume();
    beep(ctx, 660, 0, 0.16);
    beep(ctx, 880, 0.18, 0.22);
  } catch {
    // fallo de audio: no es crítico
  }
}
