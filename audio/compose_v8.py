"""Bande-son du film v8 « Le Plan » : musique originale + nouvelle voix off ElevenLabs, mixées ensemble.

Musique écrite sur l'image (audio/cues-plan.json), 120 BPM, mi bémol majeur / do mineur :
- l'entreprise grandit : accords clairs, pulsation qui s'installe ;
- la recherche : groove mineur serré, tic-tac de claves, un coup par verbe, les allers-retours de la négociation ;
- pendant ce temps : il ne reste que l'horloge ;
- quatre murs : demi-tempo, un coup sourd par mur, une note par cote ; la tension monte, puis silence ;
- Desk to Desk : montée, drop sur le nom, groove majeur ; pause sur « Simple. Efficace. » ; résolution sur la signature.
Batterie, basse, piano électrique, pluck et souffles synthétisés note par note (audio/synth.py) ; piano droit,
glockenspiel, cymbales et bruitages réels : VSCO 2 CE (CC0).

Voix : audio/vo/voix-off-v8-elevenlabs.mp3, posée d'un bloc (timeline.js, VO). Musique atténuée sous la voix,
limiteur à -2 dBFS, sonie -14 LUFS. Sorties (48 kHz, 16 bits) : renders/audio/le-plan-v8-{mix,musique,voix}.wav
"""
import json
import os
import re
import subprocess

import numpy as np

from dsp import (Bus, Instrument, SR, bank, bp, compress, convolve, envelope_db, eq, hit, hp, make_ir, one, pingpong,
                 rng, smooth_gain, soft_limit, upright_piano, write_wav)
from synth import bass, clap, ep, fin, hat, kick, marker, pluck, snare, sub_boom, thud

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CUES = json.load(open(os.path.join(ROOT, "audio", "cues-plan.json")))
T = CUES["T"]
DUR = float(CUES["DURATION"])
N = int(SR * DUR)
BEAT = 60 / CUES["BPM"]
A0 = T["drop"]             # « Desk to Desk » : premier temps de la mesure 0


def at(bar, beat=0.0):
    return A0 + bar * 4 * BEAT + beat * BEAT


# ---------------------------------------------------------------- voix
def load_vo():
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, "audio", "vo", "voix-off-v8-elevenlabs.mp3"),
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


def whoosh(dur=0.35, vel=0.5, up=True, lo=500, hi=6000):
    """Souffle : bruit réparti en bandes fixes dont le gain suit une fréquence qui glisse (geste rapide, feuille qui passe)."""
    n = int((dur + 0.08) * SR)
    t = np.arange(n) / SR
    k = np.clip(t / dur, 0, 1)
    fc = np.log2(lo) + (np.log2(hi) - np.log2(lo)) * (k if up else 1 - k)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    bands = np.linspace(np.log2(lo), np.log2(hi), 9)
    for c in bands:
        f = 2 ** c
        y = bp(x, f / 1.35, min(f * 1.35, SR / 2 - 100))
        out += y * np.exp(-((fc - c) / 0.45) ** 2)
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return fin((out * env * vel).astype(np.float32))


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

# ---------------------------------------------------------------- harmonie (basse MIDI, voicing du piano électrique)
CH = {
    "Ebmaj9": (39, [55, 58, 62, 65]),
    "Abmaj9": (32, [55, 58, 60, 63]),
    "Cm9": (36, [51, 55, 58, 62]),
    "Bb13sus": (34, [56, 60, 63, 67]),
    "Fm9": (41, [56, 60, 63, 67]),
    "G7sus": (43, [53, 60, 62, 67]),
    "G7b9": (43, [53, 56, 59, 62]),
    "Ebsus": (39, [56, 58, 63, 65]),
}
GROOVE = ["Ebmaj9", "Cm9", "Abmaj9", "Bb13sus"]
GRIND = ["Cm9", "Abmaj9", "Fm9", "G7sus"]

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


def bassline(t, name, pattern, vel=0.85, t_end=None):
    root = CH[name][0]
    for beat, iv, d in pattern:
        tt = t + beat * BEAT
        if t_end is not None and tt >= t_end - 0.01:
            continue
        bass_b.add(bass(root + iv + (12 if root < 31 else 0), d, vel * float(np.clip(1 + rng.normal(0, 0.05), 0.85, 1.1))), tt)


def pianochord(t, name, vel=0.4, dur=1.6, gain=0.55, bass_note=True):
    for i, m in enumerate(CH[name][1]):
        piano.play(pno_b, t + i * 0.02, m, vel, gain, pan=-0.2 + 0.13 * i, dur=dur + 0.4, rel=0.9)
    if bass_note:
        piano.play(pno_b, t, CH[name][0] + 12, vel, gain * 0.9, pan=-0.1, dur=dur + 0.4, rel=1.0)


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


BASS_GROOVE = [(0, 0, 0.42), (0.75, 0, 0.18), (1.5, 12, 0.2), (2.0, 0, 0.3), (2.75, 0, 0.16), (3.0, 7, 0.2), (3.5, 12, 0.22)]
BASS_GRIND = [(0, 0, 0.22), (0.5, 0, 0.2), (1.0, 12, 0.18), (1.5, 0, 0.2), (2.0, 0, 0.22), (2.5, 7, 0.2), (3.0, 0, 0.2), (3.5, 10, 0.2)]
BASS_HALF = [(0, 0, 1.3), (2.5, 7, 0.4), (3.25, 12, 0.3)]
COMP_GROOVE = [(0, 0.42, 0.62), (0.75, 0.18, 0.5), (1.5, 0.28, 0.56), (2.5, 0.2, 0.5), (3.0, 0.24, 0.48), (3.5, 0.34, 0.58)]
COMP_GRIND = [(0, 0.2, 0.5), (0.75, 0.14, 0.4), (1.5, 0.14, 0.42), (2.0, 0.2, 0.46), (2.75, 0.14, 0.4), (3.5, 0.14, 0.42)]
# Motif de pluck (mi bémol majeur pentatonique), joué seulement dans les silences de la voix
MOTIF = [
    [(0.5, 70), (0.75, 74), (1.0, 77), (1.5, 79), (2.25, 77), (2.5, 75), (3.0, 74), (3.5, 70)],
    [(0.5, 67), (1.0, 70), (1.25, 72), (2.0, 75), (2.5, 74), (3.5, 72)],
    [(0.5, 72), (0.75, 75), (1.0, 79), (1.5, 77), (2.0, 75), (3.0, 72), (3.5, 70)],
    [(0.5, 70), (1.0, 72), (1.5, 74), (2.0, 77), (2.5, 79), (3.0, 82)],
]


def motif(t, bar_i, vel=0.5, t_end=None):
    for beat, m in MOTIF[bar_i % 4]:
        tt = t + beat * BEAT
        if t_end is not None and tt > t_end:
            continue
        if not voice_at(tt - 0.06, tt + 0.22):
            pl_b.add(pluck(m, vel * float(np.clip(1 + rng.normal(0, 0.08), 0.8, 1.2)), 0.7), tt, pan=0.22 if beat % 1 else -0.18)


def groove_bar(t0, name, i, vel=1.0, t_end=None, claps=True, motif_on=True):
    stop = t_end if t_end is not None else t0 + 4 * BEAT
    bassline(t0, name, BASS_GROOVE, 0.85 * vel, stop)
    for beat, d, v in COMP_GROOVE:
        tt = t0 + beat * BEAT
        if tt < stop - 0.01:
            comp(tt, name, d, v * vel, 0.78)
    for b in range(4):
        tt = t0 + b * BEAT
        if tt >= stop - 0.01:
            continue
        K(tt, (1.0 if b == 0 else 0.92) * vel)
        if claps and b in (1, 3):
            clap_b.add(clap(0.75 * vel), tt, pan=0.05)
        hat_b.add(hat(0.42 * vel, True), tt + BEAT / 2, pan=-0.12)
        hit(perc_b, SHAKER, tt + BEAT / 4, 0.22 * vel, -0.4)
        hit(perc_b, SHAKER, tt + 3 * BEAT / 4, 0.17 * vel, -0.4)
    hats16(t0, stop, 0.36 * vel)
    if motif_on:
        motif(t0, i, 0.5 * vel, stop)


# ================================================================ 1. L'entreprise grandit (0 → 11,35 s)
pianochord(T["imag"], "Ebmaj9", 0.32, 1.8, 0.5)               # « Imaginez. »
pl_b.add(pluck(87, 0.3, 1.0), T["imag"] + 0.05, pan=0.3)
pl_b.add(pluck(82, 0.34, 0.8), 1.55, pan=-0.1)                 # le point apparaît
foley_b.add(marker(0.3, 0.05), 1.95, pan=0.05)                 # le bureau se dessine
for k in range(4):                                             # les murs se posent
    hit(foley_b, CLACK, 2.35 + k * 0.26 + 0.25, 0.32, (-0.3, 0.3, 0.2, -0.2)[k], semis=-3)
for i, name in enumerate(["Ebmaj9", "Abmaj9", "Cm9"]):         # mesures -21 à -19 : la pulsation s'installe
    t0 = at(-21 + i)
    comp(t0, name, 1.6 if i == 0 else 0.5, 0.42 + 0.05 * i, 0.8)
    if i >= 1:
        for beat, d, v in [(1.5, 0.22, 0.4), (2.5, 0.3, 0.42), (3.5, 0.2, 0.4)]:
            comp(t0 + beat * BEAT, name, d, v, 0.75)
        bassline(t0, name, BASS_HALF, 0.6 + 0.08 * i)
        K(t0, 0.6 + 0.15 * i)
        K(t0 + 2 * BEAT, 0.5 + 0.15 * i)
    if i == 2:
        hats16(t0, t0 + 4 * BEAT, 0.24, accent=(0.9, 0.3, 0.6, 0.3))
        for b in (1, 3):
            clap_b.add(clap(0.32), t0 + b * BEAT, pan=0.05)
for k, tp in enumerate(T["teamPops"]):                         # les équipes : une note par îlot
    pl_b.add(pluck((70, 74, 77, 82)[k], 0.4, 0.7), tp, pan=(-0.35, 0.35, -0.2, 0.2)[k])
for k, tp in enumerate(T["projPops"] + [T["projects"] + 0.15 + i * 0.055 for i in range(5, 22)]):   # les projets : petits clics
    hit(foley_b, CLACK, tp, 0.12 if k > 4 else 0.22, rng.uniform(-0.5, 0.5), semis=6 + (k % 5), dur=0.07, rel=0.03)
# « Et puis un jour… » : tout se suspend
t_sus = at(-18)
comp(t_sus, "Bb13sus", 3.6, 0.42, 0.8)
pianochord(T["oneDay"], "Bb13sus", 0.3, 2.0, 0.45)
bass_b.add(bass(34, 3.5, 0.5), t_sus)
for i in range(6):                                              # la pièce se remplit
    hit(foley_b, CLACK, T["oneDay"] + 0.3 + i * 0.2, 0.14, rng.uniform(-0.4, 0.4), semis=2, dur=0.07, rel=0.03)
hit(foley_b, GUIRO, T["need"] + 0.1, 0.16, -0.1, semis=-9, dur=0.85, rel=0.15)     # les murs se resserrent
foley_b.add(thud(0.7), T["newOffices"], 0.6)                    # ils cèdent
fx_b.add(sub_boom(0.5, 46, 1.0), T["newOffices"])
hit(fx_b, CYM_SOFT, T["newOffices"], 0.35, 0.1)
comp(T["newOffices"], "G7b9", 0.7, 0.5, 0.8)
reverse_swell(at(-16), "Cm9", 0.7, 0.35)

# ================================================================ 2. La recherche (11,35 → 21,9 s)
STOP1 = T["meanwhile"] - 0.05
for i in range(6):
    t0 = at(-16 + i)
    name = GRIND[i % 4]
    if i == 3:
        name = "G7sus"
    bassline(t0, name, BASS_GRIND, 0.62 + 0.05 * i, STOP1)
    for beat, d, v in COMP_GRIND:
        tt = t0 + beat * BEAT
        if tt < STOP1:
            comp(tt, "G7b9" if (name == "G7sus" and beat >= 2) else name, d, v + 0.02 * i, 0.72)
    for b in range(4):
        tt = t0 + b * BEAT
        if tt >= STOP1:
            continue
        if i >= 1 or b in (0, 2):
            K(tt, 0.72 + 0.05 * i)
        if i >= 2 and b in (1, 3):
            clap_b.add(clap(0.45 + 0.06 * i), tt, pan=0.05)
    hats16(t0, min(t0 + 4 * BEAT, STOP1), 0.24 + 0.04 * i)
    # le tic-tac : des claves sur les croches
    tt = t0
    k = 0
    while tt < min(t0 + 4 * BEAT, STOP1):
        hit(perc_b, CLAVES, tt, 0.3 if k % 2 == 0 else 0.2, (-0.45, 0.45)[k % 2])
        k += 1
        tt = t0 + k * BEAT / 2
# un accent par verbe
for k, key in enumerate(["search", "compare", "visits", "terms"]):
    comp(T[key], ("Cm9", "Abmaj9", "Fm9", "G7sus")[k], 0.25, 0.6, 0.8)
    pl_b.add(pluck((75, 77, 79, 82)[k], 0.42, 0.6), T[key], pan=0.25)
sheets_in = sorted(CUES["sheetsIn"])
for k, ts in enumerate(sheets_in[::3]):                        # les annonces se posent
    foley_b.add(whoosh(0.22, 0.05, True, 900, 5000), ts, pan=rng.uniform(-0.5, 0.5))
for k, th in enumerate(CUES["hops"]):                          # la loupe saute d'annonce en annonce
    foley_b.add(whoosh(0.2, 0.06, k % 2 == 0, 800, 4500), th, pan=(-0.4, 0.4)[k % 2])
foley_b.add(whoosh(0.4, 0.08, True), T["compare"] - 0.05, pan=0.0)
foley_b.add(marker(0.9, 0.05), T["visits"] + 0.05, pan=-0.2)    # le parcours de visite
for k, tc in enumerate(CUES["calendar"]):                      # les créneaux se remplissent
    hit(foley_b, CLAVES, tc, 0.22, 0.3, semis=9 + k, dur=0.1, rel=0.04)
foley_b.add(whoosh(0.35, 0.08, True, 600, 4000), T["terms"] - 0.05, pan=0.1)
for th in (T["terms"] + 0.45, T["terms"] + 0.8, T["terms"] + 1.1):   # surlignage
    foley_b.add(marker(0.25, 0.05), th, pan=0.15)
for k, t0 in enumerate(CUES["throws"]):                        # négocier, encore, et encore : la balle passe de l'un à l'autre
    foley_b.add(whoosh(max(0.12, 0.34 - 0.025 * k), 0.08 + 0.004 * k, k % 2 == 0, 700, 5000), t0, pan=(0.5 if k % 2 == 0 else -0.5))
    hit(perc_b, CLAVES, t0, 0.18, (0.5, -0.5)[k % 2], semis=3 + k)
for j in range(8):                                             # roulement qui monte sur « et encore »
    clap_b.add(snare(0.18 + 0.06 * j), T["encore2"] + j * BEAT / 4, pan=0.0)
for j in range(6):
    clap_b.add(snare(0.5 + 0.04 * j), T["encore2"] + 1.0 + j * BEAT / 8, pan=0.0)

# ================================================================ 3. Pendant ce temps : il ne reste que l'horloge (21,95 → 26,4 s)
tt, k = T["meanwhile"] + 0.05, 0
while tt < T["because"] - 0.05:
    hit(perc_b, CLAVES, tt, 0.34 if k % 2 == 0 else 0.24, (-0.3, 0.3)[k % 2], semis=0 if k % 2 == 0 else -2)
    k += 1
    tt = T["meanwhile"] + 0.05 + k * BEAT
bass_b.add(bass(36, 4.2, 0.4), T["meanwhile"])
pianochord(T["meanwhile"], "Cm9", 0.26, 2.2, 0.45)
pianochord(T["could"], "Abmaj9", 0.28, 2.0, 0.45)
for k, m in enumerate([67, 70, 75, 79, 82]):                   # ce qu'elle pourrait devenir : une montée douce
    pl_b.add(pluck(m, 0.3, 0.8), T["could"] + 0.5 + k * 0.12, pan=-0.3 + 0.15 * k)
foley_b.add(whoosh(0.6, 0.06, True), T["avancer"], pan=0.3)

# ================================================================ 4. Quatre murs (26,8 → 40,3 s) : demi-tempo
pianochord(T["because"], "Abmaj9", 0.34, 2.0, 0.5)
foley_b.add(whoosh(0.35, 0.08, True), T["because"] - 0.3, pan=0.4)
REFLECT = ["Abmaj9", "Ebmaj9", "Cm9", "Bb13sus", "Abmaj9", "Fm9"]
for i, name in enumerate(REFLECT):
    t0 = at(-8 + i)
    comp(t0, name, 1.7, 0.42 + 0.03 * i, 0.75)
    comp(t0 + 2.5 * BEAT, name, 0.3, 0.36, 0.7)
    bassline(t0, name, BASS_HALF, 0.62)
    K(t0, 0.7)
    clap_b.add(snare(0.22), t0 + 2 * BEAT, pan=0.05)
    hats16(t0, t0 + 4 * BEAT, 0.16, accent=(0.8, 0.3, 0.55, 0.3))
    if i >= 4:
        hit(perc_b, SHAKER, t0 + BEAT, 0.2, -0.3)
        hit(perc_b, SHAKER, t0 + 3 * BEAT, 0.2, -0.3)
for k, tw in enumerate(CUES["walls"]):                         # quatre murs : quatre coups sourds
    hit(foley_b, BDRUM, tw + 0.05, 0.7, (-0.3, 0.3, 0.15, -0.15)[k])
    hit(foley_b, SLAP, tw + 0.055, 0.2, (-0.3, 0.3, 0.15, -0.15)[k])
for td in CUES["deskDrops"]:                                   # quelques bureaux
    foley_b.add(thud(0.35), td + 0.1, 0.3, pan=rng.uniform(-0.3, 0.3))
for k, tl in enumerate(CUES["labels"]):                        # une note par cote
    glock.play(fx_b, tl, (87, 89, 91, 94)[k], 0.5, 0.45, pan=(0.0, 0.35, 0.0, -0.35)[k], dur=1.4, rel=0.6)
hit(foley_b, GUIRO, T["moment"] + 0.1, 0.14, -0.3, semis=4, dur=0.6, rel=0.1)       # la porte tourne comme une aiguille
# Tout repose sur vous : la tension monte, puis tout se complique
foley_b.add(thud(0.55), T["onYou"] + 0.85, 0.45)
comp(at(-2), "G7b9", 1.9, 0.45, 0.8)
reverse_swell(T["hush"], "G7b9", 1.5, 0.4)
for k in range(5):
    hit(foley_b, RATCHET, T["complex"] + 0.1 + k * 0.26, 0.18 + 0.05 * k, rng.uniform(-0.5, 0.5), semis=-2 + k, dur=0.3, rel=0.05)
for k, m in enumerate([62, 63, 66, 68, 71]):                   # grappe dissonante qui enfle
    keys_b.add(ep(m, T["hush"] - T["complex"] - 0.4 - 0.12 * k, 0.25 + 0.08 * k), T["complex"] + 0.3 + 0.12 * k, 0.6, pan=-0.4 + 0.2 * k)
for j in range(10):
    clap_b.add(snare(0.12 + 0.05 * j), T["complex"] + 0.5 + j * BEAT / 4, pan=0.0)
STOP2 = T["hush"]                                              # silence net jusqu'à « C'est précisément »

# ================================================================ 5. Desk to Desk (41,7 → 60,8 s)
pl_b.add(pluck(82, 0.38, 1.2), T["exists"] + 0.05, pan=0.1)   # l'anneau menthe se trace
pl_b.add(pluck(87, 0.3, 1.2), T["exists"] + 0.25, pan=-0.1)
comp(T["exists"] + 0.05, "Bb13sus", 1.4, 0.3, 0.6)
reverse_swell(A0, "Ebmaj9", 1.4, 0.55)
for j in range(16):                                            # roulement de montée vers le drop
    tt = at(-1) + j * BEAT / 4 if j < 8 else at(-1, 2) + (j - 8) * BEAT / 8
    if tt < A0:
        clap_b.add(snare(0.1 + 0.03 * j), tt, pan=0.0)
hats16(at(-1, 2), A0, 0.3)
fx_b.add(sub_boom(0.95), A0)                                   # le drop
hit(fx_b, CYM, A0, 0.55, 0.15)
foley_b.add(whoosh(0.4, 0.1, True, 400, 7000), A0 - 0.05, pan=0.0)
foley_b.add(whoosh(0.45, 0.09, False, 400, 6000), 44.62, pan=0.0)     # l'aplat menthe remonte
STOP3 = T["simple"] - 0.04
bar_i = 0
while at(bar_i) < STOP3:
    groove_bar(at(bar_i), GROOVE[bar_i % 4], bar_i, 1.0, STOP3)
    bar_i += 1
for k, ts in enumerate(T["stations"]):                         # les quatre étapes
    glock.play(fx_b, ts, (87, 91, 94, 99)[k], 0.5, 0.45, pan=(-0.3, -0.1, 0.1, 0.3)[k], dur=1.4, rel=0.6)
foley_b.add(marker(0.5, 0.05), T["stations"][3] + 0.05, pan=0.2)        # la signature
pl_b.add(pluck(82, 0.35, 0.8), T["needs"] + 0.1, pan=-0.2)            # la bulle
foley_b.add(marker(0.6, 0.04), T["needs"] + 0.4, pan=-0.1)
for k, tc in enumerate(CUES["cands"][:3]):                    # les candidats glissent sous le gabarit
    foley_b.add(whoosh(0.3, 0.06, k % 2 == 0, 700, 4500), tc, pan=0.3 - 0.2 * k)
for k, m in enumerate([82, 86, 89, 94]):                       # ça correspond
    glock.play(fx_b, T["match"] + k * 0.035, m, 0.5, 0.42, pan=-0.2 + 0.13 * k, dur=1.6, rel=0.7)
pl_b.add(pluck(94, 0.4, 0.9), T["really"], pan=0.25)
for k, key in enumerate(["select", "compare2", "nego2"]):      # sélectionner, comparer, négocier
    comp(T[key], ("Cm9", "Abmaj9", "Bb13sus")[k], 0.3, 0.62, 0.8)
    foley_b.add(whoosh(0.3, 0.07, True, 700, 5000), T[key] - 0.15, pan=(-0.3, 0.0, 0.3)[k])
foley_b.add(marker(0.3, 0.05), T["nego2"] + 0.2, pan=0.2)
foley_b.add(marker(0.3, 0.05), T["nego2"] + 0.45, pan=0.25)
reverse_swell(T["bout"], "Bb13sus", 1.2, 0.35)                # jusqu'au bout
hit(foley_b, GUIRO, T["bout"] - 0.4, 0.12, 0.2, semis=-12, dur=0.45, rel=0.1)
hit(fx_b, CYM_SOFT, T["bout"], 0.35, -0.1)

# ================================================================ 6. Simple. Efficace. (60,8 → 63,7 s) : coupure, trois accents
for t_, name, kk in [(T["simple"] + 0.18, "Ebmaj9", 1.0), (T["efficient"] + 0.08, "Abmaj9", 0.95), (T["noWaste"] + 0.05, "Bb13sus", 0.9)]:
    comp(t_, name, 0.6 if name != "Bb13sus" else 1.2, 0.62, 0.85)
    K(t_, kk, 0.3)
    bass_b.add(bass(CH[name][0], 0.5, 0.7), t_)
    clap_b.add(clap(0.5), t_ + 0.005, pan=0.05)
pianochord(T["noWaste"] + 0.05, "Bb13sus", 0.3, 1.2, 0.45)
# Votre temps : l'aiguille fait le tour du cadran
tt, k = T["yourTime"] + 0.2, 0
while tt < T["devote"] - 0.05:
    hit(perc_b, CLAVES, tt, 0.3 if k % 2 == 0 else 0.22, (-0.3, 0.3)[k % 2], semis=2)
    k += 1
    tt = T["yourTime"] + 0.2 + k * BEAT / 2
glock.play(fx_b, T["devote"], 99, 0.5, 0.45, pan=0.1, dur=1.6, rel=0.7)
pianochord(T["yourTime"], "Cm9", 0.3, 1.4, 0.45)
# L'entreprise grandit à nouveau : le groove revient, plus léger
STOP4 = T["notSearch"] + 1.0
b11 = 11
while at(b11) < STOP4:
    groove_bar(at(b11), GROOVE[b11 % 4], b11, 0.8, STOP4, claps=b11 > 11)
    b11 += 1
for k in range(6):
    pl_b.add(pluck((70, 74, 77, 79, 82, 86)[k], 0.32, 0.6), T["devote"] + 0.1 + k * 0.16, pan=-0.4 + 0.16 * k)
for k in range(2):                                             # pas à chercher des bureaux : les annonces s'envolent
    foley_b.add(whoosh(0.35, 0.08, True, 600, 5000), T["notSearch"] + 0.02 + k * 0.1, pan=(-0.5, 0.5)[k])
    foley_b.add(whoosh(0.45, 0.08, False, 600, 6000), T["notSearch"] + 0.6 + k * 0.08, pan=(0.5, -0.5)[k])
# Suspension avant la signature
pianochord(STOP4 + 0.02, "Abmaj9", 0.32, 2.2, 0.5)
comp(STOP4 + 0.02, "Abmaj9", 1.8, 0.35, 0.65)

# ================================================================ 7. Signature (69,8 → 76,5 s)
pianochord(T["vous1"], "Cm9", 0.32, 1.2, 0.5)
comp(T["vous1"] + 1.0, "Bb13sus", 0.8, 0.35, 0.6)
reverse_swell(T["sig"], "Ebmaj9", 0.9, 0.45)
fx_b.add(sub_boom(0.8, 43.6, 1.6), T["sig"])
hit(fx_b, CYM, T["sig"], 0.42, 0.15)
pianochord(T["sig"], "Ebmaj9", 0.42, 2.4, 0.55)
t_g = T["sig"]
for bi in range(2):                                            # le groove repart sous la signature et l'appel à l'action
    groove_bar(t_g + bi * 4 * BEAT, ("Ebmaj9", "Abmaj9")[bi], bi, 0.72, None, claps=True, motif_on=False)
glock.play(fx_b, T["dot"], 94, 0.55, 0.5, pan=0.2, dur=1.6, rel=0.8)      # le point final
pl_b.add(pluck(87, 0.3, 0.8), T["cta"] + 0.05, pan=-0.2)
t_last = t_g + 8 * BEAT
comp(t_last, "Ebmaj9", 2.6, 0.5, 0.85)
pianochord(t_last, "Ebmaj9", 0.42, 2.4, 0.5)
bass_b.add(bass(39, 1.6, 0.7), t_last)
K(t_last, 0.85, 0.45)
hit(fx_b, CYM_SOFT, t_last, 0.32, -0.1)
for i, m in enumerate([82, 87, 91]):
    pl_b.add(pluck(m, 0.36, 0.9), t_last + 0.6 + i * BEAT / 2, pan=(-0.25, 0.25, 0.0)[i])

# ================================================================ mixage
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


def silence(a, b, buses):
    s0, s1 = int(a * SR), int(b * SR)
    fade = np.linspace(1, 0, int(0.03 * SR))
    for b_ in buses:
        b_.x[:, s0:s0 + len(fade)] *= fade
        b_.x[:, s0 + len(fade):s1] = 0


# « Et pendant ce temps » : la musique s'arrête net, l'horloge reste ; silence avant « C'est précisément »
silence(STOP1, T["meanwhile"] + 0.05, (kick_b, clap_b, hat_b, bass_b, keys_b, pl_b))
silence(STOP2, T["exists"] - 0.01, (kick_b, clap_b, hat_b, perc_b, bass_b, keys_b, pl_b, pno_b, fx_b, foley_b))

GAIN = dict(kick=0.72, clap=1.05, hat=1.05, perc=3.2, bass=0.52, keys=0.46, pl=0.66, pno=3.0, fx=0.62, foley=2.0)
STEMS = dict(kick=kick_b, clap=clap_b, hat=hat_b, perc=perc_b, bass=bass_b, keys=keys_b, pl=pl_b, pno=pno_b, fx=fx_b, foley=foley_b)
SEND = dict(kick=0.0, clap=0.22, hat=0.05, perc=0.12, bass=0.0, keys=0.2, pl=0.3, pno=0.3, fx=0.35, foley=0.15)
dry = sum(GAIN[k] * b.x for k, b in STEMS.items())
wet = convolve(sum(GAIN[k] * SEND[k] * b.x for k, b in STEMS.items()), make_ir(1.5, 2.4))
echo = pingpong(GAIN["pl"] * pl_b.x, 3 * BEAT / 4, 0.32, 4)
music = dry + 0.28 * wet + 0.5 * echo
# le silence avant « C'est précisément » reste un vrai silence (pas de traîne de réverbération)
i0, i1 = int((STOP2 + 0.25) * SR), int((T["exists"] - 0.01) * SR)
music[:, int(STOP2 * SR):i0] *= np.linspace(1, 0, i0 - int(STOP2 * SR))
music[:, i0:i1] = 0
music = eq(music, [(60, -2.0, 0.7), (320, -1.5, 0.8), (1500, 2.0, 1.0), (2800, -1.5, 0.8), (6000, 2.5, 1.2)], hpf=30)
music = compress(music, -20, 2.0, 0.01, 0.15)

v = hp(vo, 75)
v = eq(np.vstack([v, v]), [(220, -1.5, 0.8), (3200, 2.5, 0.9), (7500, -1.0, 0.7)])
v = compress(v, -26, 2.2, 0.006, 0.12)

on = VO_ON
rms = lambda x, m: np.sqrt(np.mean(x[:, m] ** 2))
v *= 10 ** (-18 / 20) / rms(v, on)
music *= 10 ** (-24 / 20) / rms(music, ~on & (np.arange(N) > int(0.5 * SR)))

dk = np.clip((envelope_db(vo, 0.03) - (vo_db.max() - 34)) / 14, 0, 1) * -6.5
dk = np.concatenate([dk[int(0.06 * SR):], np.zeros(int(0.06 * SR))])
duck = 10 ** (smooth_gain(dk, 0.05, 0.38) / 20)
music_d = music * duck

fade = np.ones(N, dtype=np.float32)
i0 = int((DUR - 1.5) * SR)
fade[i0:] = np.cos(np.linspace(0, np.pi / 2, N - i0)) ** 2
mix = (music_d + v) * fade
music_out = music * fade


def lufs(x):
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                        "-af", "ebur128", "-f", "null", "-"], input=np.ascontiguousarray(x.T, dtype="<f4").tobytes(), capture_output=True)
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", p.stderr.decode())[-1])


for _ in range(3):
    mix *= 10 ** ((-14.0 - lufs(soft_limit(mix, -2.0))) / 20)
mix = soft_limit(mix, -2.0)

out = os.path.join(ROOT, "renders", "audio")
write_wav(os.path.join(out, "le-plan-v8-mix.wav"), mix)
write_wav(os.path.join(out, "le-plan-v8-musique.wav"), soft_limit(music_out * 10 ** (-3 / 20) / np.max(np.abs(music_out)), -1.0))
write_wav(os.path.join(out, "le-plan-v8-voix.wav"), soft_limit(v * fade, -1.0))
print(f"OK {DUR:.2f} s, {lufs(mix):.1f} LUFS, crête {20 * np.log10(np.max(np.abs(mix))):.2f} dBFS")
