type SonidoCofre = "abrir" | "revelar" | "legendaria" | "unica";

let audioContext: AudioContext | null = null;

export function prepararAudioCofre() {
  if (typeof window === "undefined") return;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") void audioContext.resume();
  } catch {
    // Opening the chest must still work when audio is unavailable or blocked.
  }
}

function nota(
  frecuencia: number,
  inicio: number,
  duracion: number,
  volumen: number,
  forma: OscillatorType = "sine",
  deslizamiento = 1.28
) {
  if (!audioContext || audioContext.state !== "running") return;
  const oscilador = audioContext.createOscillator();
  const ganancia = audioContext.createGain();
  oscilador.type = forma;
  oscilador.frequency.setValueAtTime(frecuencia, inicio);
  oscilador.frequency.exponentialRampToValueAtTime(frecuencia * deslizamiento, inicio + duracion);
  ganancia.gain.setValueAtTime(0.0001, inicio);
  ganancia.gain.exponentialRampToValueAtTime(volumen, inicio + 0.025);
  ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
  oscilador.connect(ganancia);
  ganancia.connect(audioContext.destination);
  oscilador.start(inicio);
  oscilador.stop(inicio + duracion + 0.01);
}

export function sonarCofre(tipo: SonidoCofre) {
  prepararAudioCofre();
  if (!audioContext || audioContext.state !== "running") return;
  const ahora = audioContext.currentTime;
  if (tipo === "abrir") {
    nota(150, ahora, 0.22, 0.045);
    nota(290, ahora + 0.11, 0.28, 0.055);
  } else if (tipo === "revelar") {
    nota(470, ahora, 0.13, 0.035);
    nota(700, ahora + 0.08, 0.2, 0.04);
  } else if (tipo === "legendaria") {
    nota(135, ahora, 0.52, 0.075, "triangle", 0.58);
    [392, 494, 587, 784].forEach((frecuencia, index) => {
      nota(frecuencia, ahora + 0.15 + index * 0.065, 0.9, 0.037, "sine", 1);
    });
  } else {
    [330, 440, 554, 740, 988].forEach((frecuencia, index) => {
      nota(frecuencia, ahora + index * 0.1, 0.48, 0.052);
    });
  }
}
