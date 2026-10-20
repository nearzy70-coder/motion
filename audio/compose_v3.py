"""Bande-son de « Le Fil » v3 : musique moderne et rythmée + voix off ElevenLabs, mixées ensemble.

Musique originale, 120 BPM, fa majeur / ré mineur, écrite sur l'image (audio/cues.json) :
- batterie, basse, piano électrique (FM) et pluck synthétisés ici, note par note (aucune boucle ni préréglage) ;
- piano droit, glockenspiel, cymbale et bruitages réels (pinces à linge, tampon, clés) : VSCO 2 CE (CC0).
Le motif de pluck ne joue que dans les silences de la voix : il lui répond au lieu de la couvrir.

Voix : audio/vo/voix-off-elevenlabs.mp3, découpée et placée selon timeline.js (VO). La musique est atténuée
sous la voix (ducking à anticipation), puis l'ensemble est limité à -1 dBFS ; la sonie finale (-14 LUFS)
est réglée à l'export vidéo (scripts/render.mjs).

Sorties (48 kHz, 16 bits) dans renders/audio/ : le-fil-v3-mix.wav, le-fil-v3-musique.wav, le-fil-v3-voix.wav.
"""
import json
import os
import re
import subprocess
import sys

import numpy as np

from dsp import (Bus, Instrument, SR, bank, bp, compress, convolve, envelope_db, eq, hit, hp, hz, lp, make_ir,
                 one, pingpong, rng, smooth_gain, soft_limit, upright_piano, write_wav)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Variante d'ouverture : « pile » (v4, par défaut), « pelote » ou « enquete » (repères dans audio/cues-<variante>.json)
VARIANT = sys.argv[1] if len(sys.argv) > 1 else ""
CUES = json.load(open(os.path.join(ROOT, "audio", f"cues-{VARIANT}.json" if VARIANT else "cues.json")))
TAG = VARIANT or "v3"
T = CUES["T"]
DUR = float(CUES["DURATION"])
N = int(SR * DUR)
BEAT = 60 / CUES["BPM"]
A0 = T["blind"]            # le drop : premier temps de la mesure 0
E0 = T["write"]            # fin : la signature, premier temps de la grille finale


def at(bar, beat=0.0):
    return A0 + bar * 4 * BEAT + beat * BEAT


def at_end(bar, beat=0.0):
    return E0 + bar * 4 * BEAT + beat * BEAT


# ---------------------------------------------------------------- voix
def load_vo():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, "audio", "vo", "voix-off-elevenlabs.mp3"),
                          "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    src = np.frombuffer(raw, dtype="<f4").astype(np.float32)
    out = np.zeros(N, dtype=np.float32)
    fade = int(0.012 * SR)
    for s in CUES["VO"]:
        a, b = int(s["from"] * SR), min(len(src), int(s["to"] * SR))
        seg = src[a:b].copy()
        seg[:fade] *= np.linspace(0, 1, fade)
        seg[-fade:] *= np.linspace(1, 0, fade)
        i = int(round((s["from"] + s["off"]) * SR))
        n = min(len(seg), N - i)
        out[i:i + n] += seg[:n]
    return out


vo = load_vo()
vo_db = envelope_db(vo, 0.03)
VO_ON = vo_db > vo_db.max() - 32


def voice_at(t0, t1):
    a, b = max(0, int(t0 * SR)), min(N, int(t1 * SR))
    return b > a and VO_ON[a:b].any()


# ---------------------------------------------------------------- instruments synthétisés
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


# ---------------------------------------------------------------- échantillons réels
piano = upright_piano()
glock = Instrument(bank("Percussion/Glock/*.wav", r"medium_([A-G]#?\d)\.wav", offset=12, layer_group=None), 5.0)
P1 = "VSCO 1 Percussion/"
CYM = one(P1 + "varMetal/Cymbals/susp/susp_hit_softmall_ff.wav")
CYM_SOFT = one(P1 + "varMetal/Cymbals/susp/susp_hit_softmall_mp.wav")
SHAKER = one(P1 + "varWood/Camo's Shaker/shake*.wav")
CLACK = one(P1 + "varWood/wood_click_pp*.wav") + one(P1 + "varWood/wood_click_mp.wav")
CLAVES = one(P1 + "varWood/claves_pp*.wav") + one(P1 + "varWood/claves_mp.wav")
GUIRO = one(P1 + "varWood/guiro_long*.wav")
SLAP = one(P1 + "varWood/slapstick_quiet*.wav")
RATCHET = one(P1 + "varWood/ratchet*.wav")
BDRUM = one(P1 + "drums/bass/bdrum_muted_mf_*.wav")
SLEIGH = one("Miscellania Raw/*/sleighbell1_hit_quiet.wav") + one("Miscellania Raw/*/sleighbell1_hit_[12].wav")

# ---------------------------------------------------------------- harmonie (basse MIDI, voicing du piano électrique)
CH = {
    "F69": (41, [57, 62, 67, 72]),
    "Bbm6": (34, [61, 65, 67, 70]),
    "Dm9": (38, [53, 57, 60, 64]),
    "Bbmaj7": (34, [53, 57, 62, 65]),
    "Gm9": (31, [53, 57, 58, 62]),
    "A7sus": (33, [55, 62, 64, 69]),
    "A7b9": (33, [55, 58, 61, 64]),
    "Bbmaj9": (34, [57, 60, 62, 65]),
    "Am9": (33, [55, 59, 60, 64]),
    "C13sus": (36, [58, 62, 65, 69]),
    "C7b9": (36, [58, 61, 64, 67]),
    "Fmaj9": (29, [57, 60, 64, 67]),
}
GROOVE = ["Bbmaj9", "Am9", "Gm9", "C13sus"]
PROBLEM = ["Dm9", "Bbmaj7", "Gm9", "A7sus"]

kick_b, clap_b, hat_b, perc_b, bass_b, keys_b, pl_b, pno_b, fx_b, foley_b = (Bus(N) for _ in range(10))
KICKS = []


def K(t, vel=1.0, decay=0.22):
    kick_b.add(kick(vel, decay), t)
    KICKS.append((t, vel))


def hats16(t0, t1, vel=0.5, swing=0.014, pan=0.18, accent=(1.0, 0.45, 0.8, 0.5)):
    k = 0
    t = t0
    while t < t1 - 1e-6:
        v = vel * accent[k % 4] * float(np.clip(1 + rng.normal(0, 0.1), 0.7, 1.3))
        hat_b.add(hat(v), t + (swing if k % 2 else 0.0), pan=pan)
        k += 1
        t = t0 + k * BEAT / 4


def comp(t, name, dur, vel=0.55, gain=1.0, spread=0.012):
    for i, m in enumerate(CH[name][1]):
        keys_b.add(ep(m, dur, vel * float(np.clip(1 + rng.normal(0, 0.06), 0.85, 1.15))), t + i * spread * rng.uniform(0.3, 1.0), gain, pan=-0.25 + 0.17 * i)


def bassline(t, name, pattern, vel=0.85):
    root = CH[name][0]
    for beat, iv, d in pattern:
        bass_b.add(bass(root + iv + (12 if root < 31 else 0), d, vel * float(np.clip(1 + rng.normal(0, 0.05), 0.85, 1.1))), t + beat * BEAT)


BASS_GROOVE = [(0, 0, 0.42), (0.75, 0, 0.18), (1.5, 12, 0.2), (2.0, 0, 0.3), (2.75, 0, 0.16), (3.0, 7, 0.2), (3.5, 12, 0.22)]
BASS_HALF = [(0, 0, 0.7), (1.5, 0, 0.25), (2.5, 7, 0.3), (3.25, 12, 0.18), (3.5, 0, 0.3)]
COMP_GROOVE = [(0, 0.42, 0.62), (0.75, 0.18, 0.5), (1.5, 0.28, 0.56), (2.5, 0.2, 0.5), (3.0, 0.24, 0.48), (3.5, 0.34, 0.58)]
COMP_SPARSE = [(0, 0.8, 0.55), (1.5, 0.22, 0.42), (2.5, 0.22, 0.45)]

# Motif de pluck sur 4 mesures (fa majeur pentatonique + mi), joué seulement dans les silences de la voix
MOTIF = [
    [(0.5, 69), (0.75, 72), (1.0, 74), (1.5, 77), (2.25, 76), (2.5, 74), (3.0, 72), (3.5, 69)],
    [(0.5, 67), (1.0, 69), (1.25, 72), (2.0, 76), (2.5, 74), (3.5, 72)],
    [(0.5, 74), (0.75, 77), (1.0, 79), (1.5, 77), (2.0, 74), (3.0, 72), (3.5, 69)],
    [(0.5, 70), (1.0, 72), (1.5, 74), (2.0, 77), (2.5, 79), (3.0, 81)],
]


def motif(t, bar_i, vel=0.5):
    for beat, m in MOTIF[bar_i % 4]:
        tt = t + beat * BEAT
        if not voice_at(tt - 0.06, tt + 0.22):
            pl_b.add(pluck(m, vel * float(np.clip(1 + rng.normal(0, 0.08), 0.8, 1.2)), 0.7), tt, pan=0.22 if beat % 1 else -0.18)


def reverse_swell(t_end, name, length=1.0, gain=0.5):
    """Accord de piano électrique noyé de réverbération, joué à l'envers : il aspire vers le temps fort."""
    b = Bus(int(3.2 * SR))
    for m in CH[name][1]:
        b.add(ep(m, 1.2, 0.5), 0.05)
    wet = convolve(b.x, make_ir(2.4, 3.0))
    rev = wet[:, ::-1]
    n = int(length * SR)
    seg = rev[:, -n:] * np.linspace(0, 1, n) ** 2
    fx_b.add(seg, t_end - length, gain)


# ================================================================ 1. Accroche (0 → 5,25 s)
comp(0.25, "F69", 1.0, 0.5, 0.9)                              # « Trouver… »
pl_b.add(pluck(84, 0.35, 1.0), 0.25, pan=0.3)
bass_b.add(bass(41, 0.5, 0.5), at(-7))
for b, d, v in [(0, 0.3, 0.5), (0.5, 0.18, 0.42), (1.0, 0.3, 0.5)]:  # « c'est simple » : léger, sautillant
    comp(at(-7, b), "F69", d, v, 0.85)
for b in (0.5, 1.0, 1.5):
    clap_b.add(clap(0.22), at(-7, b) + 0.005, pan=0.1)
# « Enfin… » : la corde raye « simple », l'harmonie tourne au mineur et tout s'arrête
comp(T["strike"], "Bbm6", 1.6, 0.45, 0.9)
bass_b.add(bass(34, 1.2, 0.55), T["strike"])
for i, m in enumerate([84, 79, 77, 73]):
    pl_b.add(pluck(m, 0.22 - 0.03 * i, 0.5), T["strike"] + 0.06 + i * 0.07, pan=0.3 - 0.2 * i)
if not VARIANT:
    foley_b.add(marker(0.24, 0.15), T["strike"], pan=0.15)             # trait de feutre sur « simple »
if VARIANT == "pelote":
    pl_b.add(pluck(53, 0.45, 1.4), T["strike"], pan=0.0)                 # le fil pincé vibre
reverse_swell(at(-5), "Dm9", 0.9, 0.35)
hats16(at(-6, 3.0), at(-5), 0.25)

# ================================================================ 2. La pelote (5,25 → 14,25 s)
for i, name in enumerate(PROBLEM):
    t0 = at(-5 + i)
    bassline(t0, name, BASS_HALF if i < 2 else BASS_GROOVE, 0.75 + 0.05 * i)
    for beat, d, v in (COMP_SPARSE if i < 2 else COMP_GROOVE):
        if name == "A7sus" and beat >= 2:
            name_ = "A7b9"
        else:
            name_ = name
        comp(t0 + beat * BEAT, name_, d, v, 0.8)
    if i < 2:
        K(t0, 0.85); K(t0 + 2.5 * BEAT, 0.7)
    else:
        for b in range(4):
            K(t0 + b * BEAT, 0.9)
    if i >= 1:
        for b in (1, 3):
            clap_b.add(clap(0.55 + 0.1 * i), t0 + b * BEAT, pan=0.05)
    hats16(t0, t0 + 4 * BEAT, 0.3 + 0.07 * i)
    if i >= 2:
        for b in range(4):
            hit(perc_b, SHAKER, t0 + (b + 0.5) * BEAT, 0.25, -0.35)
# Les étiquettes : une note par critère, de plus en plus aiguë ; les mots dits par la voix plus marqués
TAG_NOTES = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89, 64]
if len(CUES["drops"]) == 5:                     # seuls les cinq critères dits : leurs notes de la gamme d'origine
    TAG_NOTES = [67, 72, 77, 81, 86]
for k, d in enumerate(CUES["drops"]):
    t, spoken = d["t"], d["spoken"]
    pl_b.add(pluck(TAG_NOTES[k], 0.5 if spoken else 0.3, 0.55), t, pan=(-0.35, 0.35)[k % 2])
# Chaque mot qui touche la pile : un coup sourd, proportionnel au choc
for p_ in CUES.get("pins", []):                 # tableau d'enquête : chaque punaise plantée
    hit(foley_b, CLACK, p_["t"], 0.55 * (0.5 + p_["s"]), rng.uniform(-0.3, 0.3), semis=-4)
    foley_b.add(thud(0.3 + 0.4 * p_["s"]), p_["t"], 0.22)
for k_, tp in enumerate(CUES.get("pops", [])):  # les punaises sautent l'une après l'autre
    hit(foley_b, CLAVES, tp, 0.32, (-0.4, 0.4)[k_ % 2], semis=6 + 0.4 * k_, dur=0.12, rel=0.05)
if "wind" in CUES:                              # la pelote s'enroule : un frottement continu, de plus en plus fourni
    w0, w1 = CUES["wind"]
    tt = w0
    while tt < w1:
        hit(foley_b, SHAKER, tt, 0.9 * (1 - 0.6 * (tt - w0) / (w1 - w0)), rng.uniform(-0.2, 0.2))
        tt += BEAT / 4
for pw in CUES.get("pen", []):                  # le trait : un feutre sur papier, plus nerveux quand il s'emballe
    d_ = pw["t1"] - pw["t0"]
    foley_b.add(marker(d_, 0.08 if pw["rush"] else 0.05), pw["t0"], pan=rng.uniform(-0.25, 0.25))
if "reveal" in CUES:                            # le recul révèle l'écheveau : un impact sourd et une cymbale douce
    fx_b.add(sub_boom(0.55, 46.2, 1.2), CUES["reveal"])
    hit(fx_b, CYM_SOFT, CUES["reveal"], 0.35, 0.1)
if "spin" in CUES:                              # l'aiguille de l'horloge file
    hit(foley_b, GUIRO, CUES["spin"][0], 0.2, 0.15, semis=5, dur=CUES["spin"][1] - CUES["spin"][0], rel=0.08)
if VARIANT == "trait" and "unravel" in CUES:    # tout le dessin se tend d'un coup : un zip qui monte
    u0, u1 = CUES["unravel"]
    hit(foley_b, GUIRO, u0, 0.3, -0.1, semis=-2, dur=(u1 - u0) * 0.55, rel=0.05)
    hit(foley_b, GUIRO, u0 + (u1 - u0) * 0.5, 0.3, 0.1, semis=4, dur=(u1 - u0) * 0.5, rel=0.05)
elif "unravel" in CUES:                         # la pelote se dévide d'un coup : une crécelle qui s'emballe
    u0, u1 = CUES["unravel"]
    for k_ in range(3):
        hit(foley_b, RATCHET, u0 + k_ * (u1 - u0) / 3, 0.5, (-0.3, 0.0, 0.3)[k_], semis=2 * k_, dur=(u1 - u0) / 3 + 0.05, rel=0.06)
for l in CUES.get("landings", []):
    foley_b.add(thud(0.25 + 0.75 * l["s"]), l["t"], 0.3, pan=rng.uniform(-0.25, 0.25))
# « Et pendant ce temps… le temps file » : le temps devient un tic-tac de claves, puis roulement et arrêt net
t_tick = T["timeFlies"]
k = 0
while t_tick + k * BEAT / 2 < at(-1, 2):
    hit(perc_b, CLAVES, t_tick + k * BEAT / 2, 0.35 if k % 2 == 0 else 0.22, (-0.4, 0.4)[k % 2])
    k += 1
t0 = at(-1)                             # deux temps de montée, puis deux temps de silence
comp(t0, "A7b9", 0.95, 0.5, 0.8)
bass_b.add(bass(33, 0.95, 0.7), t0)
for j in range(12):                     # roulement de caisse claire : doubles puis triples croches
    tt = t0 + j * BEAT / 4 if j < 4 else t0 + BEAT + (j - 4) * BEAT / 8
    clap_b.add(snare(0.2 + 0.055 * j), tt, pan=0.0)
for b in range(2):
    K(t0 + b * BEAT, 0.8)
hats16(t0, t0 + 2 * BEAT, 0.4)
STOP = t0 + 2 * BEAT                    # silence avant le drop : seule la corde se tend
if not VARIANT:
    hit(foley_b, GUIRO, T["thread"], 0.2, 0.1, semis=3, dur=0.36, rel=0.08)  # l'aiguille coud la pile
hit(foley_b, GUIRO, T["pull"] - 0.1, 0.22, -0.1, semis=-7, dur=0.7, rel=0.2)  # le fil se tend
reverse_swell(A0, "Bbmaj9", 0.95, 0.55)

# ================================================================ 3 à 7. Le groove (15,25 → 54,75 s)
END_GROOVE = T["free"]
bar_i = 0
while at(bar_i) < END_GROOVE:
    t0 = at(bar_i)
    name = GROOVE[bar_i % 4]
    nxt = GROOVE[(bar_i + 1) % 4]
    bassline(t0, name, BASS_GROOVE, 0.85)
    for beat, d, v in COMP_GROOVE:
        tt = t0 + beat * BEAT
        if tt < END_GROOVE - 0.01:
            comp(tt, name, d, v, 0.78)
    for b in range(4):
        tt = t0 + b * BEAT
        if tt < END_GROOVE - 0.01:
            K(tt, 1.0 if b == 0 else 0.92)
            if b in (1, 3):
                clap_b.add(clap(0.75), tt, pan=0.05)
            hat_b.add(hat(0.42, True), tt + BEAT / 2, pan=-0.12)
            hit(perc_b, SHAKER, tt + BEAT / 4, 0.22, -0.4)
            hit(perc_b, SHAKER, tt + 3 * BEAT / 4, 0.17, -0.4)
    hats16(t0, min(t0 + 4 * BEAT, END_GROOVE), 0.36)
    motif(t0, bar_i, 0.5)
    bar_i += 1

# Le drop : grosse caisse, infra-grave, cymbale
fx_b.add(sub_boom(0.9), A0)
hit(fx_b, CYM, A0, 0.55, 0.15)
# Accents de montage : coupe vers la corde à linge, vers la carte (petit roulement puis cymbale douce)
for tc in (T["line"], T["map"]):
    for j in range(4):
        clap_b.add(snare(0.2 + 0.08 * j), tc - BEAT + j * BEAT / 4, pan=0.0)
    hit(fx_b, CYM_SOFT, tc, 0.4, -0.15)
# Pinces à linge : un clac de bois à chaque arrivée de caméra
for key in ("line", "fmt2", "fmt3", "s1", "s2", "s3", "s4", "s5", "reneg", "day"):
    hit(foley_b, CLACK, T[key] - 0.02, 0.5, 0.25)
# Punaises sur la carte (étape 2)
for i in range(3):
    hit(foley_b, CLACK, T["s2"] + 1.75 + i * 0.2, 0.3, 0.1 + 0.15 * i, semis=4)
# Maquette qui se déplie (étape 3)
hit(foley_b, SLAP, T["s3"] + 0.42, 0.18, 0.0)
# Coup de tampon (étape 4) : la batterie se tait un temps, puis le tampon tombe avec la grosse caisse
mute = (T["stamp"] - BEAT, T["stamp"] - 0.005)
i0, i1 = int(mute[0] * SR), int(mute[1] * SR)
for b_ in (kick_b, clap_b, hat_b, perc_b):
    b_.x[:, i0:i0 + 480] *= np.linspace(1, 0, 480)
    b_.x[:, i0 + 480:i1] = 0.0
KICKS[:] = [(t, v) for t, v in KICKS if not (mute[0] <= t < mute[1])]
hit(foley_b, BDRUM, T["stamp"], 0.9, 0.0)
hit(foley_b, SLAP, T["stamp"] + 0.004, 0.35, 0.05)
fx_b.add(sub_boom(0.45, 48, 0.9), T["stamp"])
# Les clés tombent sur la corde (étape 5)
hit(foley_b, SLEIGH, T["s5"] + 0.02, 0.4, 0.2)
hit(foley_b, SLEIGH, T["s5"] + 0.42, 0.22, 0.25)
# Les villes : une note de glockenspiel par ville nommée
for (name, t), m in zip([(c["name"], c["t"]) for c in CUES["cities"]], [84, 86, 88, 91, 93, 96, 98]):
    glock.play(fx_b, t, m, 0.5, 0.42, pan=rng.uniform(-0.3, 0.3), dur=1.4, rel=0.6)

# ================================================================ 8. Gratuité : le groove s'efface, piano (54,75 → 59 s)
tf = T["free"]
for t, name, d in [(tf, "Bbmaj9", 1.8), (tf + 1.8, "Am9", 1.1), (tf + 2.9, "Dm9", 1.1), (T["end"], "Gm9", 0.8)]:
    for i, m in enumerate(CH[name][1]):
        piano.play(pno_b, t + i * 0.018, m, 0.38, 0.55, pan=-0.2 + 0.13 * i, dur=d + 0.4, rel=0.9)
    piano.play(pno_b, t, CH[name][0] + 12, 0.4, 0.5, pan=-0.1, dur=d + 0.4, rel=1.0)
    comp(t, name, d, 0.3, 0.45)
fx_b.add(sub_boom(0.5, 46.2, 1.4), tf)
for i, m in enumerate([58, 62, 65, 69, 72, 74, 77, 81]):     # le store remonte : arpège ascendant
    pl_b.add(pluck(m, 0.32, 0.8), tf + i * 0.06, pan=-0.4 + 0.1 * i)

# ================================================================ 9. Fin : on remonte vers la signature (59 → 68 s)
t_sus = at_end(-1, 1)          # do13sus4 puis do7(b9), résolution sur fa à la signature
comp(t_sus, "C13sus", 1.4, 0.45, 0.8)
piano.play(pno_b, t_sus, 48, 0.4, 0.5, dur=1.6, rel=0.8)
comp(at_end(-1, 2.5), "C7b9", 0.7, 0.5, 0.8)
hats16(at_end(-1, 2), E0, 0.28)
for b in (2, 3):
    K(at_end(-1, b), 0.6 + 0.15 * (b - 2))
reverse_swell(E0, "Fmaj9", 1.0, 0.5)
# La signature : résolution, puis le groove reprend sous l'appel à l'action
fx_b.add(sub_boom(0.85, 43.6, 1.6), E0)
hit(fx_b, CYM, E0, 0.45, 0.15)
for bi, name in enumerate(["Fmaj9", "Bbmaj9"]):
    t0 = at_end(bi)
    bassline(t0, name, BASS_GROOVE, 0.8)
    for beat, d, v in COMP_GROOVE:
        comp(t0 + beat * BEAT, name, d, v, 0.75)
    for b in range(4):
        K(t0 + b * BEAT, 0.95)
        if b in (1, 3):
            clap_b.add(clap(0.7), t0 + b * BEAT, pan=0.05)
        hat_b.add(hat(0.38, True), t0 + (b + 0.5) * BEAT, pan=-0.12)
    hats16(t0, t0 + 4 * BEAT, 0.33)
glock.play(fx_b, T["dot"], 93, 0.55, 0.5, pan=0.2, dur=1.6, rel=0.8)        # le point final se pose
# Dernier accord, qui résonne jusqu'au bout
t_last = at_end(2)
comp(t_last, "Fmaj9", 2.6, 0.55, 0.9)
for i, m in enumerate(CH["Fmaj9"][1] + [72]):
    piano.play(pno_b, t_last + i * 0.02, m, 0.45, 0.5, pan=-0.2 + 0.1 * i, dur=2.6, rel=1.2)
piano.play(pno_b, t_last, 29, 0.45, 0.6, dur=2.6, rel=1.4)
bass_b.add(bass(41, 1.6, 0.75), t_last)
K(t_last, 0.9, 0.45)
hit(fx_b, CYM_SOFT, t_last, 0.35, -0.1)
for i, m in enumerate([81, 84, 89]):                       # petite signature de pluck, après la voix
    tt = max(t_last + 0.75, 65.85) + i * BEAT / 2
    pl_b.add(pluck(m, 0.4, 0.9), tt, pan=(-0.25, 0.25, 0.0)[i])

# ================================================================ mixage
# Compression « pompe » de la grosse caisse sur la basse, les claviers et le pluck
pump = np.ones(N, dtype=np.float32)
for t, v in KICKS:
    i = int(t * SR)
    n = min(N - i, int(0.35 * SR))
    if n <= 0:
        continue
    tt = np.arange(n) / SR
    pump[i:i + n] = np.minimum(pump[i:i + n], 1 - 0.55 * v * np.exp(-tt / 0.085) * np.minimum(1, tt / 0.004 + 0.4))
bass_b.x *= pump
keys_b.x *= 0.45 + 0.55 * pump
pl_b.x *= 0.7 + 0.3 * pump

# Silence avant le drop
s0, s1 = int(STOP * SR), int((A0 - 0.004) * SR)
for b_ in (kick_b, clap_b, hat_b, perc_b, bass_b, keys_b, pl_b):
    fade = np.linspace(1, 0, int(0.03 * SR))
    b_.x[:, s0:s0 + len(fade)] *= fade
    b_.x[:, s0 + len(fade):s1] = 0

GAIN = dict(kick=0.72, clap=1.05, hat=1.05, perc=3.6, bass=0.52, keys=0.46, pl=0.66, pno=3.0, fx=0.62, foley=2.0)
STEMS = dict(kick=kick_b, clap=clap_b, hat=hat_b, perc=perc_b, bass=bass_b, keys=keys_b, pl=pl_b, pno=pno_b, fx=fx_b, foley=foley_b)
SEND = dict(kick=0.0, clap=0.22, hat=0.05, perc=0.12, bass=0.0, keys=0.2, pl=0.3, pno=0.3, fx=0.35, foley=0.15)
dry = sum(GAIN[k] * b.x for k, b in STEMS.items())
wet = convolve(sum(GAIN[k] * SEND[k] * b.x for k, b in STEMS.items()), make_ir(1.5, 2.4))
echo = pingpong(GAIN["pl"] * pl_b.x, 3 * BEAT / 4, 0.32, 4)
music = dry + 0.28 * wet + 0.5 * echo
# Égalisation de la musique : grave tenu, creux de présence pour laisser la place à la voix, air
music = eq(music, [(60, -2.0, 0.7), (320, -1.5, 0.8), (1500, 2.0, 1.0), (2800, -1.5, 0.8), (6000, 2.5, 1.2)], hpf=30)
music = compress(music, -20, 2.0, 0.01, 0.15)

# Voix : passe-haut, présence, compression douce
v = hp(vo, 75)
v = eq(np.vstack([v, v]), [(220, -1.5, 0.8), (3200, 2.5, 0.9), (7500, -1.0, 0.7)])
v = compress(v, -26, 2.2, 0.006, 0.12)

# Niveaux : voix à -18 dBFS RMS pendant la parole, musique 6 dB sous la voix hors parole
on = VO_ON
rms = lambda x, m: np.sqrt(np.mean(x[:, m] ** 2))
v *= 10 ** (-18 / 20) / rms(v, on)
music *= 10 ** (-24 / 20) / rms(music, ~on & (np.arange(N) > int(0.5 * SR)))

# Ducking : -6,5 dB sous la voix, anticipation de 60 ms, attaque 50 ms, relâchement 380 ms
dk = np.clip((envelope_db(vo, 0.03) - (vo_db.max() - 34)) / 14, 0, 1) * -6.5
dk = np.concatenate([dk[int(0.06 * SR):], np.zeros(int(0.06 * SR))])
duck = 10 ** (smooth_gain(dk, 0.05, 0.38) / 20)
music_d = music * duck

# Fin : la dernière seconde et demie s'éteint naturellement
fade = np.ones(N, dtype=np.float32)
i0 = int((DUR - 1.5) * SR)
fade[i0:] = np.cos(np.linspace(0, np.pi / 2, N - i0)) ** 2
mix = (music_d + v) * fade
music_out = music * fade


def lufs(x):
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                        "-af", "ebur128", "-f", "null", "-"], input=np.ascontiguousarray(x.T, dtype="<f4").tobytes(), capture_output=True)
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", p.stderr.decode())[-1])


# Sonie de diffusion (-14 LUFS) atteinte ici, sous un limiteur doux à -2 dBFS (marge pour l'encodage AAC)
for _ in range(3):
    mix *= 10 ** ((-14.0 - lufs(soft_limit(mix, -2.0))) / 20)
mix = soft_limit(mix, -2.0)

out = os.path.join(ROOT, "renders", "audio")
write_wav(os.path.join(out, f"le-fil-{TAG}-mix.wav"), mix)
write_wav(os.path.join(out, f"le-fil-{TAG}-musique.wav"), soft_limit(music_out * 10 ** (-3 / 20) / np.max(np.abs(music_out)), -1.0))
write_wav(os.path.join(out, f"le-fil-{TAG}-voix.wav"), soft_limit(v * fade, -1.0))

if os.environ.get("STEMS"):
    secs = [(0, 5.25), (5.25, 14.3), (15.25, 22.25), (22.25, 49.75), (49.75, 54.75), (54.75, 58.75), (58.75, 68)]
    print("dBFS RMS (avant ducking) " + " ".join(f"{a:>6.1f}" for a, _ in secs))
    norm = 10 ** (-24 / 20) / rms(dry + 0.28 * wet + 0.5 * echo, ~on & (np.arange(N) > int(0.5 * SR)))
    for k_, b_ in STEMS.items():
        row = [20 * np.log10(np.sqrt(np.mean((GAIN[k_] * norm * b_.x[:, int(a * SR):int(c * SR)]) ** 2)) + 1e-9) for a, c in secs]
        pk = [20 * np.log10(np.percentile(np.abs(GAIN[k_] * norm * b_.x[:, int(a * SR):int(c * SR)]).max(0), 99.9) + 1e-9) for a, c in secs]
        print(f"{k_:24s} " + " ".join(f"{x:6.1f}" for x in row) + "   crêtes " + " ".join(f"{x:6.1f}" for x in pk))
print("OK", f"{N / SR:.2f} s, {lufs(mix):.1f} LUFS, crête {20 * np.log10(np.max(np.abs(mix))):.2f} dBFS")
