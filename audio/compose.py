"""Bande-son originale de « Le Fil » v2 : instruments réels échantillonnés, aucun son de synthèse.

Échantillons : Versilian Studios Chamber Orchestra 2 Community Edition (licence CC0),
https://github.com/sgossner/VSCO-2-CE — piano droit (Simon Dalzell / Ivy Audio), cordes,
harpe, marimba, glockenspiel, timbales, percussions et bruitages acoustiques.

Ré majeur, 96 BPM, 30 mesures (75 s), synchronisé sur audio/cues.json
(exporté depuis le film par scripts/export-cues.mjs).
Sortie : renders/audio/le-fil-v2-mix.wav (48 kHz, stéréo, 16 bits).
"""
import glob
import json
import os
import re
import wave

import numpy as np

from samples import SR, VSCO, load, note_num

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CUES = json.load(open(os.path.join(ROOT, "audio", "cues.json")))
T = CUES["T"]
DUR = float(CUES["DURATION"])
N = int(SR * DUR)
BEAT = 60 / CUES["BPM"]
BAR = 4 * BEAT
rng = np.random.default_rng(2026)


def bar(n, beat=0.0):
    """Instant (s) du temps `beat` (0 à 3,99) de la mesure n (1-indexée)."""
    return (n - 1) * BAR + beat * BEAT


# ---------------------------------------------------------------- bus et outils
class Bus:
    def __init__(self):
        self.x = np.zeros((2, N), dtype=np.float32)

    def add(self, sig, t0, gain=1.0, pan=0.0):
        a = (pan + 1) * np.pi / 4
        g = np.array([np.cos(a), np.sin(a)], dtype=np.float32)[:, None] * np.sqrt(2) * gain
        i0 = int(round(t0 * SR))
        s0 = max(0, -i0)
        i0 = max(0, i0)
        n = min(sig.shape[1] - s0, N - i0)
        if n > 0:
            self.x[:, i0:i0 + n] += sig[:, s0:s0 + n] * g


def shift(x, semis):
    """Transposition par rééchantillonnage (variation de hauteur et de durée, comme un instrument)."""
    if abs(semis) < 1e-3:
        return x
    r = 2 ** (semis / 12)
    n = int(x.shape[1] / r)
    pos = np.arange(n) * r
    return np.vstack([np.interp(pos, np.arange(x.shape[1]), x[c]) for c in range(2)]).astype(np.float32)


def shape(x, dur=None, rel=0.3, fade_in=0.0):
    """Note tenue `dur` secondes puis relâchée (fondu exponentiel sur `rel`)."""
    x = x.copy()
    if fade_in > 0:
        k = min(x.shape[1], int(fade_in * SR))
        x[:, :k] *= np.linspace(0, 1, k, dtype=np.float32) ** 1.5
    if dur is not None:
        i = int(dur * SR)
        if i < x.shape[1]:
            m = min(x.shape[1] - i, int(rel * 4 * SR))
            env = np.exp(-np.arange(m) / (rel * SR)).astype(np.float32)
            x = x[:, :i + m]
            x[:, i:] *= env
    return x


class Instrument:
    """Banque multi-échantillons : choix de la note la plus proche, de la dynamique et du round-robin."""

    def __init__(self, entries, maxdur=8.0):
        self.entries = entries  # (midi, couche, rr, chemin)
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

    def play(self, bus, t, midi, vel=0.5, gain=1.0, pan=0.0, dur=None, rel=0.3, fade_in=0.0):
        li = min(len(self.layers) - 1, int(vel * len(self.layers)))
        x = shape(self.sample(midi, self.layers[li]), dur, rel, fade_in)
        # Jeu humain : quelques millisecondes de flottement et de légères variations de nuance
        jitter = float(np.clip(rng.normal(0, 0.006), -0.012, 0.012))
        bus.add(x, t + jitter, gain * float(np.clip(1 + rng.normal(0, 0.07), 0.8, 1.2)), pan)


def bank(pattern, rx, offset=12, layer_group=2, rr_group=None):
    out = []
    for p in sorted(glob.glob(os.path.join(VSCO, pattern))):
        m = re.search(rx, os.path.basename(p))
        if not m:
            continue
        rel = os.path.relpath(p, VSCO)
        layer = m.group(layer_group) if layer_group else "x"
        rr = m.group(rr_group) if rr_group else "1"
        out.append((note_num(m.group(1), offset), layer, rr, rel))
    return out


def one(rel_glob):
    return [os.path.relpath(p, VSCO) for p in sorted(glob.glob(os.path.join(VSCO, rel_glob)))]


def hit(bus, files, t, gain=1.0, pan=0.0, semis=0.0, dur=None, rel=0.2, pick=None):
    f = files[pick if pick is not None else rng.integers(len(files))]
    bus.add(shape(shift(load(f), semis), dur, rel), t, gain, pan)


# ---------------------------------------------------------------- banques
piano_entries = []
for p in sorted(glob.glob(os.path.join(VSCO, "Keys/Upright Piano/Player_dyn*_rr1_*.wav"))):
    m = re.search(r"dyn(\d)_rr1_(\d+)", p)
    piano_entries.append((21 + 2 * int(m.group(2)), m.group(1), "1", os.path.relpath(p, VSCO)))
piano = Instrument(piano_entries, maxdur=9.0)
vln_pizz = Instrument(bank("Strings/Violin Section/Pizz/*.wav", r"Pizz_([A-G]#?\d)_v(\d)_rr(\d)", rr_group=3), 2.0)
vla_pizz = Instrument(bank("Strings/Viola Section/pizz/*.wav", r"pizz_([A-G]#?\d)_v(\d)_rr(\d)", rr_group=3), 2.0)
vc_pizz = Instrument(bank("Strings/Cello Section/pizzT/*.wav", r"pizzT_([A-G]#?\d)_v(\d)_RR(\d)", rr_group=3), 3.0)
cb_pizz = Instrument(bank("Strings/Solo Contrabass/Pizz/*.wav", r"Pizz_([A-G]#?\d)_v(\d)_rr(\d)", rr_group=3), 3.0)
vln_sus = Instrument(bank("Strings/Violin Section/susVib/*.wav", r"susVib_([A-G]#?\d)_v(\d)"), 10.0)
vla_sus = Instrument(bank("Strings/Viola Section/susvib/*.wav", r"susvib_([A-G]#?\d)_v(\d)"), 10.0)
vc_sus = Instrument(bank("Strings/Cello Section/susvib/*.wav", r"susvib_([A-G]#?\d)_v(\d)"), 10.0)
harp = Instrument(bank("Strings/Harp/*.wav", r"KSHarp_([A-G]#?\d)_(\w+)\.wav", offset=0), 6.0)
marimba = Instrument(bank("Percussion/Marimba/*.wav", r"Outrigger_([A-G]#?\d)_(\w+)_01", offset=12), 3.0)
glock = Instrument(bank("Percussion/Glock/*.wav", r"medium_([A-G]#?\d)\.wav", offset=12, layer_group=None), 5.0)

P = "VSCO 1 Percussion/"
TIMP = one("Percussion/Timpani/Timpani1_Hit_v3_*.wav")       # ~ fa#1 : transposé en ré
TIMP_ROLL = one("Percussion/Timpani/Rolls/Timpani1_Roll_v5*.wav")
BDRUM = one("Percussion/BDrumNewhit_v5_*.wav")
BDRUM_SOFT = one("Percussion/BDrumNewhit_v2_*.wav")
KICK = one(P + "drums/bass/bdrum_muted_mf_*.wav") + one(P + "drums/bass/bdrum_muted_mp_*.wav")
TAMB = one("Percussion/Tamb1-Hit_v1_*.wav")
SHAKER = one(P + "varWood/Camo's Shaker/shake*.wav")
WOOD = one(P + "varWood/wood_click_mp.wav") + one(P + "varWood/wood_click_pp*.wav")
WOOD_F = one(P + "varWood/wood_click_f*.wav")
SLAP = one(P + "varWood/slapstick_quiet*.wav")
CLAVES = one(P + "varWood/claves_pp*.wav") + one(P + "varWood/claves_mp.wav")
GUIRO = one(P + "varWood/guiro_long*.wav")
CABASA_ROLL = one(P + "varMetal/various/cabasa_roll*.wav")
SUSP_CRESC = one(P + "varMetal/Cymbals/susp/susp_hit_softmall_roll2_cresc.wav")
SUSP_P = one(P + "varMetal/Cymbals/susp/susp_hit_softmall_p.wav")
SLEIGH = one("Miscellania Raw/*/sleighbell1_hit_quiet.wav") + one("Miscellania Raw/*/sleighbell1_hit_[12].wav")
TRIANGLE = one("Percussion/Triangle3-Hit_v1_*.wav")
CHIMES_DESC = one(P + "varMetal/various/windchimes_slowDesc*.wav")

# ---------------------------------------------------------------- harmonie (ré majeur)
CH = {  # basse, accord (notes pour le pad / piano), arpège (pizzicato)
    "D": (38, [62, 66, 69, 74], [62, 66, 69, 74, 78, 81]),
    "Dadd9": (38, [62, 64, 66, 69], [62, 66, 69, 76, 78, 81]),
    "Bm": (35, [59, 62, 66, 69], [59, 62, 66, 71, 74, 78]),
    "Bm7": (35, [57, 62, 66, 69], [59, 62, 66, 69, 74, 78]),
    "G": (31, [59, 62, 67, 71], [62, 67, 71, 74, 79, 83]),
    "GD": (38, [59, 62, 67, 71], [62, 67, 71, 74, 79, 83]),
    "A": (33, [57, 61, 64, 69], [61, 64, 69, 73, 76, 81]),
    "Asus": (33, [57, 62, 64, 69], [62, 64, 69, 74, 76, 81]),
    "AC#": (37, [57, 61, 64, 69], [61, 64, 69, 73, 76, 81]),
    "Em": (40, [59, 64, 67, 71], [64, 67, 71, 76, 79, 83]),
}
SONG = {1: "Dadd9", 2: "Bm7", 3: "Bm", 4: "G", 5: "Asus", 6: "D", 7: "GD", 8: "Bm7", 9: "D", 10: "AC#", 11: "Bm", 12: "G",
        13: "D", 14: "AC#", 15: "Bm", 16: "G", 17: "D", 18: "AC#", 19: "Bm", 20: "G", 21: "A", 22: "G", 23: "A",
        24: "Bm", 25: "G", 26: "D", 27: "A", 28: "D", 29: "GD", 30: "D"}

pno, strp, strs, hrp, perc, fx, send = Bus(), Bus(), Bus(), Bus(), Bus(), Bus(), Bus()


def piano_chord(b, ch, beat=0.0, vel=0.35, gain=0.5, dur=None, low=True):
    vel = max(vel, 0.4)  # couche « mezzo » : la plus douce est trop feutrée sur haut-parleur de téléphone
    bass, notes, _ = CH[ch]
    t = bar(b, beat)
    d = dur if dur is not None else BAR - beat * BEAT
    for k, m in enumerate(notes):
        piano.play(pno, t + k * 0.012, m, vel, gain * 0.55, pan=-0.15 + 0.1 * k, dur=d, rel=0.5)
    if low:
        piano.play(pno, t, bass + 12, vel, gain * 0.6, pan=-0.3, dur=d, rel=0.6)


def melody(b, notes, vel=0.6, gain=0.75):
    for (beat, m, ln) in notes:
        piano.play(pno, bar(b, beat), m, vel, gain, pan=0.12, dur=ln * BEAT, rel=0.45)


def pizz_ostinato(b, ch, density=1.0, gain=0.5, pattern=(0, 2, 4, 2, 1, 3, 5, 3)):
    _, _, arp = CH[ch]
    for k, idx in enumerate(pattern):
        if density < 1.0 and rng.random() > density:
            continue
        t = bar(b, k * 0.5)
        accent = k in (0, 4)
        vln_pizz.play(strp, t, arp[idx], 0.75 if accent else 0.2, gain * (1.0 if accent else 0.72), pan=0.3)


def cello_bass(b, ch, beats=(0, 1.5, 2), gain=0.75):
    # Contrebasse sur la fondamentale, violoncelles une octave au-dessus
    bass = CH[ch][0]
    for be in beats:
        v = 0.6 if be == 0 else 0.3
        cb_pizz.play(strp, bar(b, be), bass, v, gain, pan=-0.2)
        vc_pizz.play(strp, bar(b, be) + 0.008, bass + 12, v, gain * 0.55, pan=-0.3)


def strings_pad(b0, b1, ch, gain=0.35, cresc=False, fade_in=0.4):
    bass, notes, _ = CH[ch]
    t0, d = bar(b0), (b1 - b0) * BAR
    vc_sus.play(strs, t0, bass + 12 if bass + 12 >= 48 else bass + 24, 0.3, gain * 0.9, pan=-0.35, dur=d, rel=0.8, fade_in=fade_in)
    vla_sus.play(strs, t0, notes[1] + (0 if notes[1] >= 60 else 12), 0.3, gain * 0.7, pan=0.0, dur=d, rel=0.8, fade_in=fade_in)
    vln_sus.play(strs, t0, notes[-1] + 12, 0.3, gain * 0.6, pan=0.35, dur=d, rel=0.8, fade_in=fade_in)


def harp_run(t, ch, n=6, step=0.07, up=True, gain=0.45, start=0):
    _, _, arp = CH[ch]
    seq = (arp + [x + 12 for x in arp])[start:start + n]
    if not up:
        seq = seq[::-1]
    for k, m in enumerate(seq):
        harp.play(hrp, t + k * step, m, 0.5, gain * (0.8 + 0.2 * k / max(1, n - 1)), pan=-0.4 + 0.8 * k / max(1, n - 1))


def kick(t, g=0.8):
    hit(perc, KICK, t, g, 0.0)


# ---------------------------------------------------------------- 1. Accroche (mesures 1-2)
piano_chord(1, "Dadd9", vel=0.2, gain=0.3)
melody(1, [(0, 69, 0.5), (0.5, 74, 0.5), (1, 78, 1.5), (2.5, 76, 1.5)], vel=0.35, gain=0.6)
vc_pizz.play(strp, T["strike"], 50, 0.9, 0.9, pan=-0.1)            # « ploc » de la rature
vln_pizz.play(strp, T["strike"] + 0.02, 81, 0.9, 0.55, pan=0.25)
hit(fx, WOOD, T["strike"], 0.5, 0.1)
hit(fx, CABASA_ROLL, T["cordIn"], 0.16, -0.2, dur=1.2, rel=0.25)    # la corde glisse
piano_chord(2, "Bm7", beat=0.0, vel=0.2, gain=0.35, low=False)
melody(2, [(1, 78, 0.5), (1.5, 76, 0.5), (2, 74, 0.5), (2.5, 71, 1.5)], vel=0.3, gain=0.55)   # « Sur le papier. »

# ---------------------------------------------------------------- 2. La pelote (mesures 3-5)
for b in (3, 4, 5):
    ch = SONG[b]
    pizz_ostinato(b, ch, gain=0.52 + 0.08 * (b - 3))
    cello_bass(b, ch, beats=(0, 2), gain=0.7)
    piano_chord(b, ch, vel=0.2, gain=0.3, low=False)
    for s in range(8):
        hit(perc, SHAKER, bar(b, s * 0.5 + 0.25), 0.1 + 0.03 * (b - 3), 0.35)
# Une note de marimba par étiquette nouée
TAG_NOTES = [74, 78, 81, 76, 83, 79, 86, 81, 88, 83, 90, 86]
for k, m in enumerate(TAG_NOTES):
    marimba.play(perc, T["tag0"] + k * T["tagStep"], m, 0.9, 0.42, pan=-0.5 + (k % 5) * 0.25)
# « Et le temps file » : claves comme une horloge, montée de cymbale et de timbale
for k in range(int((T["pull"] - 0.2 - T["timeFlies"]) / (BEAT / 2))):
    hit(perc, CLAVES, T["timeFlies"] + k * BEAT / 2, 0.16 + 0.08 * k / 8, -0.4)
hit(fx, SUSP_CRESC, T["pull"] - 3.6, 0.55, 0.2, dur=3.6, rel=0.05)
hit(fx, TIMP_ROLL, T["tension"], 0.32, -0.1, semis=-3.5, dur=T["pull"] - T["tension"], rel=0.05)
strings_pad(5, 6, "Asus", gain=0.32, fade_in=2.0)
hit(fx, GUIRO, T["pull"] - 0.55, 0.32, 0.3, dur=0.6, rel=0.08)       # la corde file entre les doigts

# ---------------------------------------------------------------- 3. On tire le fil (mesures 6-8)
hit(perc, TIMP, T["pull"], 0.6, -0.1, semis=-3.6)
hit(perc, BDRUM, T["pull"], 0.45, 0.0)
send.add(load(BDRUM[0]), T["pull"], 0.25)
piano.play(pno, T["pull"], 38, 0.9, 0.22, pan=-0.2, dur=BAR * 2, rel=0.8)
piano.play(pno, T["pull"], 50, 0.9, 0.2, pan=-0.1, dur=BAR * 2, rel=0.8)
strings_pad(6, 7, "D", gain=0.5, fade_in=0.05)
strings_pad(7, 8, "GD", gain=0.42)
strings_pad(8, 9, "Bm7", gain=0.42)
harp_run(T["blind"] - 0.05, "D", n=10, step=0.05, gain=0.5)           # le store se lève
for b in (6, 7, 8):
    piano_chord(b, SONG[b], vel=0.3, gain=0.42, low=False)
    cello_bass(b, SONG[b], beats=(0, 2), gain=0.55)
melody(6, [(2, 78, 1), (3, 81, 1)])
melody(7, [(0, 83, 1.5), (1.5, 81, 0.5), (2, 79, 1), (3, 78, 1)])
melody(8, [(0, 76, 1.5), (1.5, 74, 0.5), (2, 76, 1), (3, 73, 1)])

# ---------------------------------------------------------------- 4-5. Corde à linge (mesures 9-21) : le groove
for b in range(9, 22):
    ch = SONG[b]
    pizz_ostinato(b, ch, gain=0.42)
    cello_bass(b, ch, gain=0.72)
    piano_chord(b, ch, vel=0.3, gain=0.36, low=False)
    if b % 4 == 1:
        piano_chord(b, ch, beat=2.5, vel=0.2, gain=0.22, dur=BEAT * 1.5, low=False)
    for be in (0, 2):
        kick(bar(b, be), 0.75 if be == 0 else 0.6)
    if b % 2 == 0:
        kick(bar(b, 3.5), 0.38)
    for be in (1, 3):
        hit(perc, TAMB, bar(b, be), 0.2, 0.3)
    for s in range(8):
        hit(perc, SHAKER, bar(b, s * 0.5 + 0.25), 0.07, 0.4)
strings_pad(17, 21, "D", gain=0.18, fade_in=2.5)
hit(fx, WOOD_F, T["line"], 0.45, 0.0)                                 # la fiche tombe sur la corde
marimba.play(perc, T["line"], 62, 0.9, 0.5)
# Petits glissés de harpe sur chaque travelling
for ta in (T["fmt2"], T["fmt3"], T["s1"], T["s2"], T["s3"], T["s4"], T["s5"], T["reneg"], T["day"]):
    b = int(ta / BAR) + 1
    harp_run(ta - 0.36, SONG.get(b, "D"), n=4, step=0.09, gain=0.38, start=1)
# Étape 1 : chaque ligne du cahier des charges
for k in range(6):
    marimba.play(perc, T["s1"] + 0.25 + k * 0.3, [74, 76, 78, 81, 83, 86][k], 0.9, 0.3, pan=0.3)
glock.play(perc, T["s1"] + 2.4, 86, 0.5, 0.3, pan=0.2)
# Étape 2 : les punaises, puis le fil
for k in range(3):
    hit(fx, WOOD_F, T["s2"] + 1.85 + k * 0.25, 0.55, -0.2 + 0.2 * k)
harp_run(T["s2"] + 2.55, "Bm", n=8, step=0.12, gain=0.3)
# Étape 3 : la maquette se déplie, le parcours de visite
hit(fx, TIMP_ROLL, T["s3"] + 1.0, 0.25, 0.0, semis=-3.5, dur=1.3, rel=0.3)
harp_run(T["s3"] + 1.15, "G", n=9, step=0.08, gain=0.4)
for k, m in enumerate([86, 88, 90, 93]):
    glock.play(perc, T["s3"] + 2.3 + k * 0.28, m, 0.5, 0.22, pan=-0.3 + 0.2 * k)
hit(perc, TRIANGLE, T["s3"] + 3.25, 0.3, 0.3)
# Étape 4 : soulignements, puis le coup de tampon sur le temps fort
for k in range(4):
    vln_pizz.play(strp, T["s4"] + 0.45 + k * 0.42, [81, 83, 85, 86][k], 0.9, 0.42, pan=0.35)
hit(perc, BDRUM, T["s4"] + 2.5, 0.85, 0.0)
hit(fx, SLAP, T["s4"] + 2.5, 0.55, 0.05)
send.add(load(BDRUM[1]), T["s4"] + 2.5, 0.2)
# Étape 5 : le trousseau tombe et tinte
hit(fx, SLEIGH, T["s5"] + 0.22, 0.38, 0.1)
hit(perc, TRIANGLE, T["s5"] + 0.25, 0.22, 0.2)
hit(fx, SLEIGH, T["s5"] + 0.9, 0.12, -0.1)
hit(fx, SLEIGH, T["s5"] + 1.5, 0.07, 0.1)

# ---------------------------------------------------------------- 6. Services (mesures 22-23) : respiration
for b in (22, 23):
    ch = SONG[b]
    piano_chord(b, ch, vel=0.25, gain=0.4)
    pizz_ostinato(b, ch, gain=0.34, density=0.75)
    cello_bass(b, ch, beats=(0,), gain=0.6)
melody(22, [(0, 79, 1), (1, 78, 1), (2, 76, 2)], vel=0.4, gain=0.55)
melody(23, [(0, 76, 1), (1, 78, 1), (2, 81, 2)], vel=0.4, gain=0.55)

# ---------------------------------------------------------------- 7. Couverture (mesures 24-25)
for b in (24, 25):
    ch = SONG[b]
    for s in range(8):
        harp.play(hrp, bar(b, s * 0.5), CH[ch][2][[0, 2, 4, 3, 1, 3, 5, 2][s]], 0.5, 0.32, pan=-0.3 + 0.08 * s)
    cello_bass(b, ch, beats=(0, 2), gain=0.6)
    piano_chord(b, ch, vel=0.25, gain=0.3, low=False)
    for be in (0, 2):
        kick(bar(b, be), 0.45)
strings_pad(24, 26, "Bm", gain=0.3, fade_in=1.5)
for k, c in enumerate(CUES.get("cities", [])):
    glock.play(perc, c["t"], [74, 78, 81, 83, 86, 88, 90][k % 7], 0.5, 0.26, pan=-0.4 + 0.12 * k)

# ---------------------------------------------------------------- 8. Gratuité (mesures 26-27)
hit(fx, SUSP_CRESC, T["free"] - 1.9, 0.35, 0.0, dur=1.9, rel=0.05)
hit(perc, TIMP, T["free"], 0.7, -0.1, semis=-3.6)
harp_run(T["free"] + 0.02, "D", n=10, step=0.05, gain=0.45)
for b in (26, 27):
    ch = SONG[b]
    pizz_ostinato(b, ch, gain=0.46)
    cello_bass(b, ch, gain=0.75)
    piano_chord(b, ch, vel=0.4, gain=0.42)
    for be in (0, 2):
        kick(bar(b, be), 0.8)
    for be in (1, 3):
        hit(perc, TAMB, bar(b, be), 0.24, 0.3)
    for s in range(8):
        hit(perc, SHAKER, bar(b, s * 0.5 + 0.25), 0.09, 0.4)
strings_pad(26, 28, "D", gain=0.42, fade_in=0.6)
glock.play(perc, bar(26, 2), 90, 0.5, 0.3)
glock.play(perc, bar(26, 2) + 0.01, 86, 0.5, 0.22)

# ---------------------------------------------------------------- 9. Conclusion (mesures 28-30)
strings_pad(28, 31, "D", gain=0.4, fade_in=0.3)
piano.play(pno, bar(28), 38, 0.6, 0.55, pan=-0.2, dur=BAR * 2, rel=1.0)
harp_run(T["end"] + 0.15, "D", n=8, step=0.11, up=False, gain=0.32, start=3)   # la corde s'enroule
melody(28, [(0, 74, 1), (1, 76, 1), (2, 78, 1)], vel=0.4, gain=0.6)
# Signature sonore : le point se pose
for m, g in ((74, 0.55), (78, 0.45), (81, 0.45)):
    harp.play(hrp, T["dot"], m, 0.6, g, pan=0.1)
glock.play(perc, T["dot"], 86, 0.6, 0.42, pan=0.15)
piano_chord(28, "D", beat=3, vel=0.45, gain=0.5, dur=BAR * 2.2)
vln_pizz.play(strp, T["cta"], 86, 0.8, 0.42, pan=0.3)                       # le bouton apparaît
vla_pizz.play(strp, T["cta"] + 0.01, 74, 0.8, 0.35, pan=-0.2)
piano.play(pno, bar(30), 26, 0.4, 0.5, pan=-0.2, dur=4.0, rel=1.2)          # dernière note grave, qui résonne
piano_chord(30, "D", beat=0, vel=0.25, gain=0.38, dur=4.0, low=False)
hit(fx, CHIMES_DESC, bar(29, 2), 0.06, 0.4)

# ---------------------------------------------------------------- mixage
def make_ir(rt60=2.3, dur=3.2, pre=0.025):
    n = int(dur * SR)
    t = np.arange(n) / SR
    chans = []
    for _ in range(2):
        noise = rng.standard_normal(n)
        X = np.fft.rfft(noise)
        f = np.fft.rfftfreq(n, 1 / SR)
        lo = np.fft.irfft(X / np.sqrt(1 + (f / 3500) ** 4), n) * np.exp(-6.9 * t / rt60)
        hi = np.fft.irfft(X * (f > 3500) / np.sqrt(1 + (f / 10000) ** 4), n) * np.exp(-6.9 * t / (rt60 * 0.4))
        ir = lo + 0.4 * hi
        ir *= np.minimum(1, t / 0.012)
        ir = np.concatenate([np.zeros(int(pre * SR)), ir])[:n]
        chans.append(ir / np.sqrt(np.sum(ir ** 2)))
    return np.vstack(chans)


def convolve(x, ir):
    out = np.zeros_like(x)
    nfft = 1 << int(np.ceil(np.log2(x.shape[1] + ir.shape[1])))
    for c in range(2):
        out[c] = np.fft.irfft(np.fft.rfft(x[c], nfft) * np.fft.rfft(ir[c], nfft), nfft)[: x.shape[1]]
    return out


GAINS = dict(pno=2.4, strp=1.0, strs=1.1, hrp=0.95, perc=0.85, fx=0.9)
buses = dict(pno=pno, strp=strp, strs=strs, hrp=hrp, perc=perc, fx=fx)
dry = sum(GAINS[k] * b.x for k, b in buses.items())
wet_in = 0.35 * pno.x + 0.25 * strp.x + 0.45 * strs.x + 0.4 * hrp.x + 0.2 * perc.x + 0.25 * fx.x + send.x
wet = convolve(wet_in, make_ir())
mix = dry + 0.32 * wet

if os.environ.get("STEMS"):
    secs = [(0, 5), (5, 12.5), (12.5, 20), (20, 27.5), (27.5, 52.5), (52.5, 57.5), (57.5, 62.5), (62.5, 67.5), (67.5, 75)]
    print("dBFS RMS        " + " ".join(f"{a:>5.1f}" for a, _ in secs))
    for k, b in list(buses.items()) + [("wet", 0.32 * wet)]:
        x = b.x * GAINS[k] if k in GAINS else b
        row = [20 * np.log10(np.sqrt(np.mean(np.asarray(x)[:, int(a * SR):int(c * SR)] ** 2)) + 1e-9) for a, c in secs]
        print(f"{k:6s}          " + " ".join(f"{v:5.1f}" for v in row))


def master_eq(x):
    # Pensé pour le téléphone : grave contenu, bas-médium allégé, présence et air
    n = len(x)
    nfft = 1 << int(np.ceil(np.log2(n)))
    f = np.maximum(np.fft.rfftfreq(nfft, 1 / SR), 1e-3)
    bell = lambda fc, g, bw: 1 + (10 ** (g / 20) - 1) * np.exp(-0.5 * (np.log2(f / fc) / bw) ** 2)
    H = 1 / np.sqrt(1 + (32 / f) ** 8)
    H *= 1 - 0.2 / (1 + (f / 95) ** 2)
    H *= bell(260, -2.5, 0.7) * bell(3000, 4.0, 0.9) * bell(9000, 2.5, 1.0)
    return np.fft.irfft(np.fft.rfft(x, nfft) * H, nfft)[:n]


def compress(x, thr_db=-24, ratio=2.5, att=0.012, rel=0.18):
    # Compresseur RMS doux (enveloppe lissée attaque / relâchement), commun aux deux canaux
    lvl = np.sqrt(np.convolve((x ** 2).mean(0), np.ones(int(0.02 * SR)) / int(0.02 * SR), mode='same') + 1e-12)
    db = 20 * np.log10(lvl)
    over = np.maximum(0, db - thr_db)
    gr = -over * (1 - 1 / ratio)
    # lissage asymétrique, vectorisé par blocs de 1 ms
    blk = int(0.001 * SR)
    g = gr[::blk]
    sm = np.empty_like(g)
    a_c, r_c = np.exp(-1e-3 / att), np.exp(-1e-3 / rel)
    s = 0.0
    for i, v in enumerate(g):
        c = a_c if v < s else r_c
        s = c * s + (1 - c) * v
        sm[i] = s
    gain = 10 ** (np.repeat(sm, blk)[: x.shape[1]] / 20)
    if len(gain) < x.shape[1]:
        gain = np.pad(gain, (0, x.shape[1] - len(gain)), mode='edge')
    return x * gain


for c in range(2):
    mix[c] = master_eq(mix[c])
mix = compress(mix)
# Fin naturelle : la dernière seconde s'éteint, sans coupure
fade = np.ones(N, dtype=np.float32)
i0 = int((DUR - 1.4) * SR)
fade[i0:] = np.cos(np.linspace(0, np.pi / 2, N - i0)) ** 2
mix *= fade
# Niveau visé ≈ -14 LUFS avant l'export : normalisation RMS puis limiteur doux à -1 dBFS
rms = np.sqrt(np.mean(mix ** 2))
mix *= 10 ** (-16.3 / 20) / rms
mix = np.sign(mix) * (1 - np.exp(-np.abs(mix) / 0.84)) * 0.84
mix *= min(1.0, 10 ** (-1 / 20) / np.max(np.abs(mix)))

out = os.path.join(ROOT, "renders", "audio")
os.makedirs(out, exist_ok=True)
path = os.path.join(out, "le-fil-v2-mix.wav")
pcm = np.clip(np.round((mix.T + rng.uniform(-1, 1, mix.T.shape) / 65536) * 32767), -32768, 32767).astype("<i2")
with wave.open(path, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(path, f"{N / SR:.2f} s")
