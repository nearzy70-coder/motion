"""Chargement des échantillons VSCO 2 CE (CC0) : décodage FFmpeg → float32 48 kHz stéréo, cache .npy."""
import hashlib
import os
import re
import subprocess

import numpy as np

SR = 48000
VSCO = os.environ.get("VSCO_DIR", "/home/user/sgossner/vsco-2-ce")
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".cache")
NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}


def load(rel):
    path = os.path.join(VSCO, rel)
    os.makedirs(CACHE, exist_ok=True)
    key = os.path.join(CACHE, hashlib.md5(rel.encode()).hexdigest() + ".npy")
    if os.path.exists(key):
        return np.load(key)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype="<f4").reshape(-1, 2).T.copy()
    # Démarrage : on retire le silence initial (seuil -50 dBFS), en gardant 2 ms
    env = np.abs(x).max(0)
    above = np.nonzero(env > 10 ** (-50 / 20))[0]
    if len(above):
        x = x[:, max(0, above[0] - int(0.002 * SR)):]
    np.save(key, x)
    return x


def note_num(name, octave_offset=0):
    """'A#0' → numéro MIDI (convention C4 = 60), décalé si la banque utilise une autre convention."""
    m = re.match(r"([A-G][#b]?)(-?\d)", name)
    return NOTE[m.group(1)] + 12 * (int(m.group(2)) + 1) + octave_offset


def f0(x, fmin=40, fmax=2000):
    """Estimation de la fondamentale (autocorrélation sur la partie tenue)."""
    m = x.mean(0)
    seg = m[int(0.05 * SR):int(0.45 * SR)]
    seg = seg - seg.mean()
    n = len(seg)
    spec = np.fft.rfft(seg * np.hanning(n), 2 * n)
    ac = np.fft.irfft(np.abs(spec) ** 2)[:n]
    lo, hi = int(SR / fmax), int(SR / fmin)
    lag = lo + np.argmax(ac[lo:hi])
    return SR / lag


def midi_of_hz(hz):
    return 69 + 12 * np.log2(hz / 440.0)
