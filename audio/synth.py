"""Instruments synthétisés partagés (batterie, basse, piano électrique FM, pluck, feutre, coup sourd).
Mêmes définitions que dans compose_v3.py, regroupées ici pour les films suivants (compose_v8.py)."""
import numpy as np

from dsp import SR, bp, hp, hz, lp, rng


def fin(x, ms=40):
    k = min(x.shape[-1], int(ms * 1e-3 * SR))
    x[..., -k:] *= (np.cos(np.linspace(0, np.pi / 2, k)) ** 2).astype(np.float32)
    return x


def kick(vel=1.0, decay=0.22):
    n = int(0.55 * SR)
    t = np.arange(n) / SR
    f = 46 + 105 * np.exp(-t / 0.028) + 60 * np.exp(-t / 0.005)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay) * np.minimum(1, t / 0.0008)
    body = np.tanh(1.8 * body) / np.tanh(1.8)
    click = hp(rng.standard_normal(n) * np.exp(-t / 0.002), 2500) * 0.18
    return fin(((body + click) * vel).astype(np.float32))


def clap(vel=1.0):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    out = []
    for _ in range(2):
        e = np.zeros(n)
        for k, d in enumerate([0.0, 0.011, 0.02, 0.031]):
            tt = np.maximum(0, t - d)
            e += (t >= d) * np.exp(-tt / (0.0045 if k < 3 else 0.11)) * (0.8 if k < 3 else 1.0)
        x = bp(rng.standard_normal(n) * e, 850, 4200) * 1.6
        out.append(x * vel)
    return fin(np.vstack(out).astype(np.float32))


HAT_F = np.array([205.3, 304.4, 369.6, 522.7, 540.0, 800.0]) * 1.9


def hat(vel=0.6, open_=False):
    n = int((0.45 if open_ else 0.09) * SR)
    t = np.arange(n) / SR
    metal = sum(np.sign(np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28))) for f in HAT_F) / 6
    x = 0.65 * metal + 0.5 * rng.standard_normal(n)
    x = hp(bp(x, 6500, 15000), 7000)
    x *= np.exp(-t / (0.16 if open_ else 0.022)) * np.minimum(1, t / 0.0005)
    return fin((x * vel).astype(np.float32))


def snare(vel=0.7):
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    tone = (np.sin(2 * np.pi * 186 * t) + 0.5 * np.sin(2 * np.pi * 332 * t)) * np.exp(-t / 0.045)
    nz = bp(rng.standard_normal(n), 1400, 9000) * np.exp(-t / 0.1)
    return fin((np.tanh(1.4 * (0.55 * tone + 0.9 * nz)) * vel).astype(np.float32))


def sub_boom(vel=1.0, f0=43.6, dur=1.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 + 30 * np.exp(-t / 0.05)
    return fin((np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.55) * np.minimum(1, t / 0.002) * vel).astype(np.float32))


def bass(midi, dur, vel=0.8):
    f0 = hz(midi)
    n = int((dur + 0.15) * SR)
    t = np.arange(n) / SR
    fc = 320 + 1100 * vel * np.exp(-t / 0.075)
    x = np.zeros(n)
    k = 1
    while k * f0 < 4500 and k < 40:
        x += (1 / k) / np.sqrt(1 + (k * f0 / fc) ** 4) * np.sin(2 * np.pi * k * f0 * t)
        k += 1
    x = 0.55 * x + 0.75 * np.sin(2 * np.pi * f0 * t)
    env = np.minimum(1, t / 0.004) * np.where(t < dur, 1.0, np.exp(-(t - dur) / 0.035))
    return fin((np.tanh(1.4 * x * env) * vel).astype(np.float32))


def ep(midi, dur, vel=0.6):
    """Piano électrique en synthèse FM (paire 1:1 à index décroissant + « lame » 14:1 très courte)."""
    f = hz(midi)
    rel = 0.16
    n = int((dur + rel * 5) * SR)
    t = np.arange(n) / SR
    idx = (0.7 + 2.0 * vel) * np.exp(-t / 0.32) + 0.22
    body = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    tine = np.sin(2 * np.pi * f * t + 1.6 * vel * np.exp(-t / 0.012) * np.sin(2 * np.pi * 14 * f * t)) * np.exp(-t / 0.04)
    decay = np.exp(-t / (2.4 - 0.012 * (midi - 48)))
    env = decay * np.minimum(1, t / 0.0025) * np.where(t < dur, 1.0, np.exp(-(t - dur) / rel))
    x = (0.85 * body + 0.35 * tine) * env * (0.55 + 0.6 * vel)
    trem = 0.18 * np.sin(2 * np.pi * 4.6 * t + rng.uniform(0, 6.28))
    return fin(np.vstack([x * (1 + trem), x * (1 - trem)]).astype(np.float32))


def pluck(midi, vel=0.6, decay=0.9):
    """Corde pincée (synthèse additive) : harmoniques amorties d'autant plus vite qu'elles sont aiguës."""
    f0 = hz(midi)
    n = int(decay * 2.5 * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for k in range(1, 18):
        fk = k * f0 * (1 + 0.0004 * k * k)
        if fk > 16000:
            break
        a = abs(np.sin(np.pi * k * 0.21)) / k ** 1.15
        x += a * np.sin(2 * np.pi * fk * t + rng.uniform(0, 6.28)) * np.exp(-t * (1 / decay + 0.9 * (k - 1)))
    x += hp(rng.standard_normal(n) * np.exp(-t / 0.0025), 1500) * 0.15
    x *= np.minimum(1, t / 0.0015)
    return fin((x * vel).astype(np.float32))


def marker(dur=0.24, vel=0.5):
    """Feutre sur papier : bruit filtré, grain irrégulier, attaque et relâchement du geste."""
    n = int((dur + 0.06) * SR)
    t = np.arange(n) / SR
    grain = 1 + 0.5 * np.sin(2 * np.pi * 37 * t + 3 * np.sin(2 * np.pi * 5 * t))
    env = np.minimum(1, t / 0.02) * np.where(t < dur, 1.0, np.exp(-(t - dur) / 0.02))
    x = bp(rng.standard_normal(n), 1800, 6500) * grain * env
    return fin((x * vel).astype(np.float32))


def thud(vel=0.5):
    """Mot qui tombe sur la pile : coup sourd et bref, un peu de matière."""
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    f = 52 + 70 * np.exp(-t / 0.02)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.085)
    knock = lp(rng.standard_normal(n), 1400) * np.exp(-t / 0.018)
    return fin(((0.9 * body + 0.6 * knock) * vel).astype(np.float32))


def whoosh(dur=0.35, vel=0.5, up=True, lo=500, hi=6000):
    """Souffle : bruit réparti en bandes fixes dont le gain suit une fréquence qui glisse (geste rapide, volet)."""
    n = int((dur + 0.08) * SR)
    t = np.arange(n) / SR
    k = np.clip(t / dur, 0, 1)
    fc = np.log2(lo) + (np.log2(hi) - np.log2(lo)) * (k if up else 1 - k)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    for c in np.linspace(np.log2(lo), np.log2(hi), 9):
        f = 2 ** c
        out += bp(x, f / 1.35, min(f * 1.35, SR / 2 - 100)) * np.exp(-((fc - c) / 0.45) ** 2)
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return fin((out * env * vel).astype(np.float32))
