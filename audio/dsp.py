"""Outils audio communs : bus stéréo, filtres, réverbération, compresseur, banques d'échantillons VSCO, écriture WAV."""
import glob
import os
import re
import wave

import numpy as np
from scipy import signal

from samples import SR, VSCO, load, note_num

rng = np.random.default_rng(2026)


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


class Bus:
    """Piste stéréo de longueur fixe ; add() place un signal (2, n) à l'instant t0, avec gain et panoramique."""

    def __init__(self, n):
        self.x = np.zeros((2, n), dtype=np.float32)

    def add(self, sig, t0, gain=1.0, pan=0.0):
        if sig.ndim == 1:
            sig = np.vstack([sig, sig])
        a = (pan + 1) * np.pi / 4
        g = np.array([np.cos(a), np.sin(a)], dtype=np.float32)[:, None] * np.sqrt(2) * gain
        i0 = int(round(t0 * SR))
        s0 = max(0, -i0)
        i0 = max(0, i0)
        n = min(sig.shape[1] - s0, self.x.shape[1] - i0)
        if n > 0:
            self.x[:, i0:i0 + n] += sig[:, s0:s0 + n] * g


# ---------------------------------------------------------------- filtres (causals, comme du matériel)
def _sos(kind, f, order=2):
    return signal.butter(order, f, btype=kind, fs=SR, output="sos")


def hp(x, f, order=2):
    return signal.sosfilt(_sos("highpass", f, order), x, axis=-1).astype(np.float32)


def lp(x, f, order=2):
    return signal.sosfilt(_sos("lowpass", f, order), x, axis=-1).astype(np.float32)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(_sos("bandpass", [lo, hi], order), x, axis=-1).astype(np.float32)


def eq(x, bands, hpf=None):
    """Égaliseur à phase nulle (FFT) : bands = [(fc, gain_dB, largeur_en_octaves)], passe-haut optionnel."""
    n = x.shape[-1]
    nfft = 1 << int(np.ceil(np.log2(n)))
    f = np.maximum(np.fft.rfftfreq(nfft, 1 / SR), 1e-3)
    H = np.ones_like(f)
    for fc, g, bw in bands:
        H *= 1 + (10 ** (g / 20) - 1) * np.exp(-0.5 * (np.log2(f / fc) / bw) ** 2)
    if hpf:
        H /= np.sqrt(1 + (hpf / f) ** 8)
    return np.fft.irfft(np.fft.rfft(x, nfft, axis=-1) * H, nfft, axis=-1)[..., :n].astype(np.float32)


# ---------------------------------------------------------------- espace
def make_ir(rt60=1.5, dur=2.4, pre=0.018, damp=6000):
    n = int(dur * SR)
    t = np.arange(n) / SR
    chans = []
    for _ in range(2):
        noise = rng.standard_normal(n)
        X = np.fft.rfft(noise)
        f = np.fft.rfftfreq(n, 1 / SR)
        lo = np.fft.irfft(X / np.sqrt(1 + (f / damp) ** 4) / np.sqrt(1 + (180 / np.maximum(f, 1)) ** 2), n)
        ir = lo * np.exp(-6.9 * t / rt60) * np.minimum(1, t / 0.008)
        ir = np.concatenate([np.zeros(int(pre * SR)), ir])[:n]
        chans.append(ir / np.sqrt(np.sum(ir ** 2)))
    return np.vstack(chans).astype(np.float32)


def convolve(x, ir):
    out = np.zeros_like(x)
    nfft = 1 << int(np.ceil(np.log2(x.shape[1] + ir.shape[1])))
    for c in range(2):
        out[c] = np.fft.irfft(np.fft.rfft(x[c], nfft) * np.fft.rfft(ir[c], nfft), nfft)[: x.shape[1]]
    return out


def pingpong(x, delay, fb=0.35, taps=5, tone=4500):
    """Écho ping-pong (gauche puis droite), répétitions de plus en plus sombres."""
    out = np.zeros_like(x)
    d = int(delay * SR)
    src = x.mean(0)
    g = 1.0
    for k in range(1, taps + 1):
        g *= fb
        src = lp(src, tone, 1)
        c = (k + 1) % 2
        if k * d < x.shape[1]:
            out[c, k * d:] += g * src[: x.shape[1] - k * d]
    return out


# ---------------------------------------------------------------- dynamique
def smooth_gain(target_db, att, rel, blk_ms=1.0):
    """Lissage asymétrique d'une courbe de gain (dB), par blocs de 1 ms."""
    blk = int(blk_ms * 1e-3 * SR)
    g = target_db[::blk]
    sm = np.empty_like(g)
    a_c, r_c = np.exp(-blk_ms * 1e-3 / att), np.exp(-blk_ms * 1e-3 / rel)
    s = 0.0
    for i, v in enumerate(g):
        c = a_c if v < s else r_c
        s = c * s + (1 - c) * v
        sm[i] = s
    out = np.repeat(sm, blk)[: len(target_db)]
    if len(out) < len(target_db):
        out = np.pad(out, (0, len(target_db) - len(out)), mode="edge")
    return out


def envelope_db(x, win=0.02):
    m = (x ** 2).mean(0) if x.ndim == 2 else x ** 2
    k = int(win * SR)
    return 10 * np.log10(np.convolve(m, np.ones(k) / k, mode="same") + 1e-12)


def compress(x, thr_db=-24, ratio=2.5, att=0.012, rel=0.18):
    over = np.maximum(0, envelope_db(x) - thr_db)
    gain = 10 ** (smooth_gain(-over * (1 - 1 / ratio), att, rel) / 20)
    return (x * gain).astype(np.float32)


def soft_limit(x, ceil_db=-1.0, knee=0.86):
    c = 10 ** (ceil_db / 20)
    y = np.sign(x) * np.where(np.abs(x) < knee * c, np.abs(x), knee * c + (1 - knee) * c * np.tanh((np.abs(x) - knee * c) / ((1 - knee) * c)))
    return y.astype(np.float32)


# ---------------------------------------------------------------- échantillons (VSCO 2 CE, CC0)
def shift(x, semis):
    if abs(semis) < 1e-3:
        return x
    r = 2 ** (semis / 12)
    n = int(x.shape[1] / r)
    pos = np.arange(n) * r
    return np.vstack([np.interp(pos, np.arange(x.shape[1]), x[c]) for c in range(2)]).astype(np.float32)


def shape(x, dur=None, rel=0.3, fade_in=0.0):
    x = x.copy()
    if fade_in > 0:
        k = min(x.shape[1], int(fade_in * SR))
        x[:, :k] *= np.linspace(0, 1, k, dtype=np.float32) ** 1.5
    if dur is not None:
        i = int(dur * SR)
        if i < x.shape[1]:
            m = min(x.shape[1] - i, int(rel * 4 * SR))
            x = x[:, :i + m]
            x[:, i:] *= np.exp(-np.arange(m) / (rel * SR)).astype(np.float32)
    return x


class Instrument:
    """Banque multi-échantillons : note la plus proche, couche de nuance, round-robin, jeu humain."""

    def __init__(self, entries, maxdur=8.0):
        self.entries = entries
        self.maxdur = maxdur
        self.rr = 0
        self.layers = sorted({e[1] for e in entries})
        self.cache = {}

    def sample(self, midi, layer):
        cand = [e for e in self.entries if e[1] == layer] or self.entries
        best = min(abs(e[0] - midi) for e in cand)
        near = [e for e in cand if abs(e[0] - midi) == best]
        self.rr += 1
        e = near[self.rr % len(near)]
        key = (e[3], midi - e[0])
        if key not in self.cache:
            self.cache[key] = shift(load(e[3])[:, : int(self.maxdur * SR)], midi - e[0])
        return self.cache[key]

    def play(self, bus, t, midi, vel=0.5, gain=1.0, pan=0.0, dur=None, rel=0.3):
        li = min(len(self.layers) - 1, int(vel * len(self.layers)))
        x = shape(self.sample(midi, self.layers[li]), dur, rel)
        jitter = float(np.clip(rng.normal(0, 0.005), -0.01, 0.01))
        bus.add(x, t + jitter, gain * float(np.clip(1 + rng.normal(0, 0.06), 0.85, 1.15)), pan)


def bank(pattern, rx, offset=12, layer_group=2):
    out = []
    for p in sorted(glob.glob(os.path.join(VSCO, pattern))):
        m = re.search(rx, os.path.basename(p))
        if m:
            out.append((note_num(m.group(1), offset), m.group(layer_group) if layer_group else "x", "1", os.path.relpath(p, VSCO)))
    return out


def one(rel_glob):
    return [os.path.relpath(p, VSCO) for p in sorted(glob.glob(os.path.join(VSCO, rel_glob)))]


def hit(bus, files, t, gain=1.0, pan=0.0, semis=0.0, dur=None, rel=0.2, pick=None):
    f = files[pick if pick is not None else rng.integers(len(files))]
    bus.add(shape(shift(load(f), semis), dur, rel), t, gain, pan)


def upright_piano():
    entries = []
    for p in sorted(glob.glob(os.path.join(VSCO, "Keys/Upright Piano/Player_dyn*_rr1_*.wav"))):
        m = re.search(r"dyn(\d)_rr1_(\d+)", p)
        entries.append((21 + 2 * int(m.group(2)), m.group(1), "1", os.path.relpath(p, VSCO)))
    return Instrument(entries, maxdur=9.0)


def write_wav(path, x):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    pcm = np.clip(np.round((x.T + rng.uniform(-1, 1, x.T.shape) / 65536) * 32767), -32768, 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
