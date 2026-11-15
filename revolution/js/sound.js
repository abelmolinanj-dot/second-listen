// Sound effects and music, all made in code with the Web Audio API: no recordings, nothing to license.
// Muskets and cannon are shaped noise; the music is a fife and drum playing "Yankee Doodle" (18th century, public domain).
// Browsers only allow sound after the player taps something, so the first tap calls unlock().

const PREFS_KEY = "dispatches76-sound";
let prefs = { sfx: true, music: true };
try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") }; } catch { /* storage unavailable */ }
const savePrefs = () => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ } };

let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;

function init() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.8;
  // A gentle compressor keeps a big volley from clipping.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4;
  master.connect(comp); comp.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = prefs.sfx ? 1 : 0; sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = prefs.music ? 0.32 : 0; musicBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return true;
}

export function unlock() {
  if (!init()) return;
  if (ctx.state === "suspended") ctx.resume();
}
// Unlock on the first tap anywhere.
window.addEventListener("pointerdown", unlock, { once: true, capture: true });

export const soundPrefs = () => ({ ...prefs });
export function setSfx(on) { prefs.sfx = on; savePrefs(); if (sfxBus) sfxBus.gain.value = on ? 1 : 0; }
export function setMusic(on) {
  prefs.music = on; savePrefs();
  if (musicBus) musicBus.gain.value = on ? 0.32 : 0;
  if (!on) stopMusic();
}

const ready = () => ctx && ctx.state === "running";
const now = () => ctx.currentTime;

// A burst of filtered noise with a sharp attack: the basis of every gunshot.
function noise(t, { dur, type = "bandpass", freq = 1000, q = 0.8, gain = 1, attack = 0.002, out = sfxBus, pan = 0 }) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = g;
  if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
  src.connect(f); f.connect(g); node.connect(out);
  src.start(t, Math.random() * 1.5, dur + 0.05);
}

function thump(t, { from = 120, to = 40, dur = 0.4, gain = 0.8, out = sfxBus }) {
  const o = ctx.createOscillator(); o.type = "sine";
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out);
  o.start(t); o.stop(t + dur + 0.05);
}

// ---------- effects ----------

function musketAt(t, loud = 1, pan = 0) {
  noise(t, { dur: 0.09, type: "highpass", freq: 1400, gain: 0.55 * loud, pan });  // crack
  noise(t, { dur: 0.35, type: "lowpass", freq: 900, gain: 0.45 * loud, pan });     // powder report
  noise(t + 0.02, { dur: 0.9, type: "lowpass", freq: 350, gain: 0.12 * loud, attack: 0.05, pan }); // echo
}

function cannonAt(t, loud = 1, pan = 0) {
  thump(t, { from: 90, to: 28, dur: 1.1, gain: 0.9 * loud });
  noise(t, { dur: 1.6, type: "lowpass", freq: 260, gain: 0.9 * loud, attack: 0.004, pan });
  noise(t, { dur: 0.25, type: "bandpass", freq: 700, gain: 0.35 * loud, pan });
  noise(t + 0.15, { dur: 2.2, type: "lowpass", freq: 140, gain: 0.25 * loud, attack: 0.2, pan }); // rolling echo
}

function snareAt(t, gain = 0.3, out = sfxBus) {
  noise(t, { dur: 0.12, type: "bandpass", freq: 1900, q: 0.6, gain, out });
  thump(t, { from: 210, to: 140, dur: 0.07, gain: gain * 0.6, out });
}

function volleyAt(t, men, pan = 0) {
  for (let i = 0; i < men; i++) musketAt(t + Math.random() * 0.28, 0.35 + Math.random() * 0.3, pan + (Math.random() - 0.5) * 0.8);
}

export const sfx = {
  musket() { if (ready()) musketAt(now()); },
  cannon() { if (ready()) cannonAt(now()); },
  // A short battle: drums, then volleys, with cannon for bigger fights. size is the number of men involved.
  battle(size = 5000) {
    if (!ready()) return;
    const t = now() + 0.05;
    for (let i = 0; i < 8; i++) snareAt(t + i * 0.055, 0.12 + i * 0.02);
    const volleys = size > 8000 ? 4 : size > 3000 ? 3 : 2;
    const cannons = size > 12000 ? 3 : size > 5000 ? 2 : size > 2000 ? 1 : 0;
    for (let v = 0; v < volleys; v++) volleyAt(t + 0.5 + v * 0.62, 7 + Math.floor(Math.random() * 6), v % 2 ? 0.4 : -0.4);
    for (let c = 0; c < cannons; c++) cannonAt(t + 0.8 + c * 0.75 + Math.random() * 0.2, 0.8, (Math.random() - 0.5) * 0.6);
  },
  // Paper and a wax seal: opening a letter.
  letter() {
    if (!ready()) return;
    const t = now();
    for (let i = 0; i < 3; i++) noise(t + i * 0.07, { dur: 0.09, type: "highpass", freq: 3000 + i * 600, gain: 0.08 });
    noise(t + 0.22, { dur: 0.05, type: "bandpass", freq: 900, gain: 0.15 });
  },
  // Coins on a table: the printing press and the treasury.
  coins() {
    if (!ready()) return;
    const t = now();
    for (let i = 0; i < 5; i++) {
      const o = ctx.createOscillator(); o.type = "triangle";
      o.frequency.value = 2600 + Math.random() * 1800;
      const g = ctx.createGain(); const s = t + i * 0.06 + Math.random() * 0.03;
      g.gain.setValueAtTime(0.06, s); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.18);
      o.connect(g); g.connect(sfxBus); o.start(s); o.stop(s + 0.2);
    }
  },
  // A drum flourish when the month ends.
  drumroll() {
    if (!ready()) return;
    const t = now();
    for (let i = 0; i < 14; i++) snareAt(t + i * 0.045, 0.06 + i * 0.012);
    snareAt(t + 14 * 0.045 + 0.05, 0.32);
  },
  tap() { if (ready()) noise(now(), { dur: 0.04, type: "bandpass", freq: 1600, gain: 0.06 }); },
};

// ---------- music: fife and drum ----------

// "Yankee Doodle", eighth notes. Numbers are MIDI pitches in D major (fife key); 0 holds the previous note.
const D5 = 74, E5 = 76, Fs5 = 78, G5 = 79, A4 = 69, B4 = 71, Cs5 = 73, Fs4 = 66, G4 = 67;
const YANKEE = [
  D5, D5, E5, Fs5, D5, Fs5, E5, A4,
  D5, D5, E5, Fs5, D5, 0, Cs5, 0,
  D5, D5, E5, Fs5, G5, Fs5, E5, D5,
  Cs5, A4, B4, Cs5, D5, 0, D5, 0,
  B4, Cs5, B4, A4, B4, Cs5, D5, 0,
  A4, B4, A4, G4, Fs4, 0, A4, 0,
  B4, Cs5, B4, A4, B4, Cs5, D5, B4,
  A4, D5, Cs5, E5, D5, 0, D5, 0,
];
// A slow muffled march for defeat and hard winters.
const DIRGE = [A4, 0, 0, 0, Fs4, 0, G4, 0, A4, 0, 0, 0, D5, 0, 0, 0, Cs5, 0, B4, 0, A4, 0, G4, 0, Fs4, 0, 0, 0, 0, 0, 0, 0];

let playing = null;

function fifeNote(t, midi, dur) {
  const f = 440 * Math.pow(2, (midi - 69) / 12);
  const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = f;
  const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = f * 2; // breathy overtone
  const vib = ctx.createOscillator(); vib.frequency.value = 5.5;
  const vg = ctx.createGain(); vg.gain.value = f * 0.006;
  vib.connect(vg); vg.connect(o.frequency);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
  g.gain.setValueAtTime(0.18, t + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.98);
  const g2 = ctx.createGain(); g2.gain.value = 0.12;
  o.connect(g); o2.connect(g2); g2.connect(g); g.connect(musicBus);
  noise(t, { dur: 0.05, type: "highpass", freq: 5000, gain: 0.015, out: musicBus }); // breath
  for (const x of [o, o2, vib]) { x.start(t); x.stop(t + dur); }
}

function playTune(notes, { eighth = 0.19, loops = 1, drum = true } = {}) {
  if (!ready() || !prefs.music) return;
  stopMusic();
  const token = {};
  playing = token;
  const t0 = now() + 0.1;
  const total = notes.length;
  for (let l = 0; l < loops; l++) {
    for (let i = 0; i < total; i++) {
      const n = notes[i];
      if (!n) continue;
      let len = 1;
      while (i + len < total && notes[i + len] === 0) len++;
      fifeNote(t0 + (l * total + i) * eighth, n, len * eighth);
    }
    if (drum) for (let i = 0; i < total; i += 2) {
      const t = t0 + (l * total + i) * eighth;
      snareAt(t, i % 8 === 0 ? 0.16 : 0.08, musicBus);
      if (i % 8 === 6) snareAt(t + eighth / 2, 0.06, musicBus);
    }
  }
  const ms = (loops * total * eighth + 0.5) * 1000;
  token.timer = setTimeout(() => { if (playing === token) playing = null; }, ms);
}

export function stopMusic() {
  if (!playing || !ctx) { playing = null; return; }
  clearTimeout(playing.timer);
  playing = null;
  // Fade the music bus out quickly, then restore its level for the next tune.
  const g = musicBus.gain, t = now();
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(0, t + 0.3);
  // Old notes are already scheduled, so swap in a fresh bus.
  const fresh = ctx.createGain(); fresh.gain.value = prefs.music ? 0.32 : 0; fresh.connect(master);
  const old = musicBus; musicBus = fresh;
  setTimeout(() => old.disconnect(), 400);
}

export const music = {
  march() { playTune(YANKEE, { loops: 2 }); },
  victory() { playTune(YANKEE, { eighth: 0.17, loops: 1 }); },
  dirge() { playTune(DIRGE, { eighth: 0.32, drum: true }); },
};
