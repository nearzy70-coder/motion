"""Bande-son originale du film « Le Fil » (Desk to Desk), entièrement synthétisée.

Musique à 120 BPM (1 temps = 0,5 s) en fa majeur, avec sound design synchronisé sur
src/timeline.js. Aucun échantillon externe : pas de question de droits.

Sortie : renders/audio/le-fil-mix.wav (48 kHz, stéréo, 16 bits).
Usage   : python3 audio/compose.py
"""
import os
import wave

import numpy as np

SR = 48000
DUR = 33.0
N = int(SR * DUR)
BEAT = 0.5
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "renders", "audio")
rng = np.random.default_rng(20261020)

# Repères synchronisés avec src/timeline.js
T = dict(strike=1.0, strike_end=1.35, problem=3.0, chip_step=0.25, drop=8.0, brand=8.55, list=11.3,
         step1=12.0, collapse=13.75, step2=14.0, pick=16.4, zoom=16.85, step3=17.0, extrude=18.0,
         step4=20.0, step5=22.0, value=24.0, free=26.0, value_out=27.8, end=28.0, dot=29.0, cta=30.0)
CHIP_X = [262, 742, 520, 304, 742, 290, 842, 506, 836, 262, 762, 600]


# ---------------------------------------------------------------- utilitaires
def ts(n):
    return np.arange(n) / SR


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def fft_filter(x, lo=None, hi=None, order=2):
    """Filtre passe-haut / passe-bas à phase nulle (réponse de type Butterworth)."""
    n = len(x)
    nfft = 1 << int(np.ceil(np.log2(max(n, 2))))
    X = np.fft.rfft(x, nfft)
    f = np.fft.rfftfreq(nfft, 1 / SR)
    H = np.ones_like(f)
    if hi:
        H *= 1 / np.sqrt(1 + (f / hi) ** (2 * order))
    if lo:
        H *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    return np.fft.irfft(X * H, nfft)[:n]


def sweep_bp(x, fc, bw=1.0, block=2048):
    """Passe-bande glissant (STFT). fc(t) en Hz, bw en octaves."""
    hop = block // 2
    win = np.hanning(block + 1)[:-1]
    f = np.fft.rfftfreq(block, 1 / SR)
    pad = np.concatenate([np.zeros(block), x, np.zeros(block)])
    out = np.zeros_like(pad)
    for i in range(0, len(pad) - block, hop):
        seg = pad[i:i + block] * win
        c = max(30.0, fc((i - block + block / 2) / SR))
        H = np.exp(-0.5 * (np.log2(np.maximum(f, 1) / c) / bw) ** 2)
        out[i:i + block] += np.fft.irfft(np.fft.rfft(seg) * H, block)
    return out[block:block + len(x)]


def env_ar(n, a, r_tau, hold=0.0):
    t = ts(n)
    e = np.minimum(1.0, t / max(a, 1e-4))
    rel = np.where(t > a + hold, np.exp(-(t - a - hold) / r_tau), 1.0)
    return e * rel


def env_adsr(n, a, d, s, r, length):
    """length : durée tenue (s) avant relâchement."""
    t = ts(n)
    e = np.where(t < a, t / a, s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    e = np.where(t > length, e * np.exp(-(t - length) / r), e)
    return e


class Bus:
    def __init__(self):
        self.x = np.zeros((2, N))

    def add(self, sig, t0, gain=1.0, pan=0.0):
        sig = np.asarray(sig)
        if sig.ndim == 1:
            a = (pan + 1) * np.pi / 4
            sig = np.vstack([sig * np.cos(a), sig * np.sin(a)]) * np.sqrt(2)
        i0 = int(round(t0 * SR))
        s0 = max(0, -i0)
        i0 = max(0, i0)
        n = min(sig.shape[1] - s0, N - i0)
        if n > 0:
            self.x[:, i0:i0 + n] += sig[:, s0:s0 + n] * gain


def make_ir(rt60=2.2, dur=3.0, pre=0.022):
    n = int(dur * SR)
    t = ts(n)
    chans = []
    for _ in range(2):
        noise = rng.standard_normal(n)
        low = fft_filter(noise, hi=2800) * np.exp(-6.9 * t / rt60)
        high = fft_filter(noise, lo=2800, hi=11000) * np.exp(-6.9 * t / (rt60 * 0.45))
        ir = low + 0.6 * high
        ir *= np.minimum(1, t / 0.01)
        ir = np.concatenate([np.zeros(int(pre * SR)), ir])[:n]
        chans.append(ir / np.sqrt(np.sum(ir ** 2)))
    return np.vstack(chans)


def convolve(x, ir):
    out = np.zeros_like(x)
    nfft = 1 << int(np.ceil(np.log2(x.shape[1] + ir.shape[1])))
    for c in range(2):
        y = np.fft.irfft(np.fft.rfft(x[c], nfft) * np.fft.rfft(ir[c], nfft), nfft)
        out[c] = y[:x.shape[1]]
    return out


# ---------------------------------------------------------------- instruments
def saw(f, n, K=36, phase=0.0):
    t = ts(n)
    y = np.zeros(n)
    kmax = int(min(K, (SR * 0.45) / f))
    for k in range(1, kmax + 1):
        y += np.sin(2 * np.pi * k * f * t + phase * k) / k
    return y * 0.55


def pad_chord(notes, dur, attack=0.5, release=1.2, bright=2200):
    n = int((dur + release * 3) * SR)
    out = np.zeros((2, n))
    for m in notes:
        f = midi(m)
        for det, pan in ((-7, -0.55), (0, 0.0), (7, 0.55)):
            v = saw(f * 2 ** (det / 1200), n, phase=rng.uniform(0, 6.28))
            a = (pan + 1) * np.pi / 4
            out[0] += v * np.cos(a)
            out[1] += v * np.sin(a)
    e = env_adsr(n, attack, 1.0, 0.85, release, dur)
    for c in range(2):
        out[c] = fft_filter(out[c], lo=90, hi=bright) * e
    return out / (len(notes) * 2.2)


def fm(f, dur, ratio=2.0, index=2.5, idx_tau=0.12, amp_tau=0.35, attack=0.004):
    n = int(dur * SR)
    t = ts(n)
    I = index * np.exp(-t / idx_tau)
    y = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * ratio * t))
    return y * np.exp(-t / amp_tau) * np.minimum(1, t / attack)


def bell(f, dur=2.6):
    return 0.6 * fm(f, dur, ratio=3.51, index=1.8, idx_tau=0.5, amp_tau=0.9) + 0.4 * fm(f * 2, dur, ratio=1.0, index=0.6, idx_tau=0.3, amp_tau=0.6)


def bass_note(f, dur, drive=1.6):
    n = int((dur + 0.08) * SR)
    t = ts(n)
    y = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    y = np.tanh(drive * y) / np.tanh(drive)
    e = np.minimum(1, t / 0.006) * np.where(t < dur, np.exp(-t / (dur * 1.6)), np.exp(-dur / (dur * 1.6)) * np.exp(-(t - dur) / 0.02))
    return fft_filter(y * e, hi=900)


def kick(soft=1.0):
    n = int(0.5 * SR)
    t = ts(n)
    f = 46 + 110 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t / 0.16)
    y = np.tanh(1.8 * y) / np.tanh(1.8)
    click = fft_filter(rng.standard_normal(n), lo=1800) * np.exp(-t / 0.003) * 0.25 * soft
    return y + click


def clap():
    n = int(0.4 * SR)
    t = ts(n)
    noise = rng.standard_normal(n)
    e = np.zeros(n)
    for d in (0.0, 0.010, 0.021):
        e += np.where(t >= d, np.exp(-(t - d) / 0.006), 0)
    e += np.where(t >= 0.03, np.exp(-(t - 0.03) / 0.075), 0) * 0.55
    return fft_filter(noise * e, lo=900, hi=5200) * 0.8


def hat(open_=False):
    n = int((0.35 if open_ else 0.08) * SR)
    t = ts(n)
    y = fft_filter(rng.standard_normal(n), lo=7200, hi=15000)
    return y * np.exp(-t / (0.16 if open_ else 0.022))


def tick(f=2400, tau=0.018):
    n = int(0.08 * SR)
    t = ts(n)
    return np.sin(2 * np.pi * f * t) * np.exp(-t / tau) * np.minimum(1, t / 0.0008)


def whoosh(dur=0.55, f0=350, f1=2600, rev=False):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    y = sweep_bp(x, lambda s: f0 * (f1 / f0) ** min(1, max(0, s / dur)), bw=1.2)
    e = np.sin(np.pi * np.clip(ts(n) / dur, 0, 1)) ** 2
    y = y * e
    return y[::-1] if rev else y


def scratch(dur, rate=11.0, f0=2600):
    """Frottement de feutre / stylo."""
    n = int(dur * SR)
    t = ts(n)
    x = fft_filter(rng.standard_normal(n), lo=1500, hi=7000)
    am = 0.35 + 0.65 * np.abs(np.sin(np.pi * rate * t + 1.7 * np.sin(2 * np.pi * 2.3 * t)))
    edge = np.minimum(1, t / 0.02) * np.minimum(1, (dur - t) / 0.05)
    return x * am * np.clip(edge, 0, 1)


def riser(dur=2.0):
    n = int(dur * SR)
    t = ts(n)
    x = rng.standard_normal(n)
    y = sweep_bp(x, lambda s: 300 * (7000 / 300) ** (min(1, max(0, s / dur)) ** 1.6), bw=0.9)
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (2 * t / dur)) / SR) * 0.12
    return (y + tone) * (t / dur) ** 2.2


def impact():
    n = int(1.6 * SR)
    t = ts(n)
    low = np.sin(2 * np.pi * np.cumsum(38 + 40 * np.exp(-t * 9)) / SR) * np.exp(-t / 0.55)
    nz = fft_filter(rng.standard_normal(n), hi=1400) * np.exp(-t / 0.12) * 0.5
    return np.tanh(1.4 * (low + nz))


# ---------------------------------------------------------------- arrangement
pad, bass, drums, keys, sfx, send = Bus(), Bus(), Bus(), Bus(), Bus(), Bus()
kick_times = []

CHORDS = [  # (début, durée, notes du pad, basse)
    (0.0, 3.0, [50, 53, 57, 60, 64], 38),      # Dm9 : neutre, en suspens
    (3.0, 3.0, [50, 57, 62, 64, 65], 38),      # Dm(add9) avec frottement mi/fa : la complexité
    (6.0, 2.0, [50, 53, 57, 60, 64], 34),      # Bbmaj9 : montée
    (8.0, 4.0, [53, 57, 60, 64, 67], 41),      # Fmaj9 : le fil est tiré, soulagement
    (12.0, 4.0, [52, 57, 60, 64, 67], 45),     # Am7
    (16.0, 4.0, [50, 53, 57, 60, 64], 38),     # Dm9
    (20.0, 4.0, [55, 58, 62, 65, 69], 43),     # Gm9
    (24.0, 2.0, [50, 53, 57, 60, 65], 46),     # Bbmaj9
    (26.0, 2.0, [52, 55, 57, 60, 62], 48),     # C6/9
    (28.0, 5.0, [53, 57, 60, 64, 67, 72], 41),  # Fmaj9 : résolution finale
]

for (t0, d, notes, b) in CHORDS:
    att = 0.9 if t0 == 0 else (0.25 if t0 in (8.0, 28.0) else 0.45)
    bright = 1500 if t0 < 8 else (2600 if t0 < 24 else 3200)
    pad.add(pad_chord(notes, d + 0.25, attack=att, release=0.9, bright=bright), t0 - 0.02, gain=0.9 if t0 >= 8 else 0.75)

    # Basse
    if t0 < 3.0:
        bass.add(bass_note(midi(b), 2.8, drive=1.2), t0 + 0.0, gain=0.35)
    elif t0 < 8.0:
        # Pulsation de croches : la tension monte
        k = 0
        while t0 + k * 0.25 < t0 + d - 0.01:
            tt = t0 + k * 0.25
            if tt < 7.75:
                g = 0.30 + 0.25 * ((tt - 3.0) / 5.0)
                bass.add(bass_note(midi(b), 0.2), tt, gain=g * (1.0 if k % 2 == 0 else 0.7))
            k += 1
    elif t0 < 28.0:
        pattern = [(0.0, 0.42, 0), (0.75, 0.2, 0), (1.0, 0.42, 0), (1.5, 0.2, 12), (1.75, 0.2, 0)]
        bar = 0.0
        while bar < d - 0.01:
            for (o, ln, oct_) in pattern:
                bass.add(bass_note(midi(b + oct_), ln), t0 + bar + o, gain=0.55 if oct_ == 0 else 0.35)
            bar += 2.0
    else:
        bass.add(bass_note(midi(b), 3.6, drive=1.3), t0, gain=0.42)
        bass.add(bass_note(midi(b - 12), 3.6, drive=1.0), t0, gain=0.1)

# Batterie : entrée au temps fort de 8,0 s
for i in range(int((28.0 - 8.0) / BEAT)):
    tt = 8.0 + i * BEAT
    beat_in_bar = i % 4
    lift = tt >= 24.0
    if beat_in_bar in (0, 2) or (lift and beat_in_bar in (1, 3)):
        if not (27.5 <= tt < 28.0):
            drums.add(kick(), tt, gain=0.85 if beat_in_bar == 0 else 0.7)
            kick_times.append(tt)
    if beat_in_bar in (1, 3):
        drums.add(clap(), tt, gain=0.32, pan=0.05)
        send.add(clap(), tt, gain=0.12)
    for s in range(4):
        th = tt + s * 0.125
        if th >= 27.75:
            continue
        vel = (0.16, 0.07, 0.11, 0.07)[s] * (1.25 if lift else 1.0)
        drums.add(hat(open_=(lift and s == 2)), th, gain=vel, pan=0.25)
# Tic-tac discret avant le temps fort (le temps qui presse)
for i in range(int(8.0 / 0.25)):
    tt = i * 0.25
    if tt >= 7.75:
        break
    g = (0.05 if tt < 3.0 else 0.08) * (1.0 if i % 2 == 0 else 0.6)
    drums.add(hat(), tt, gain=g, pan=-0.2)
for t0 in (3.0, 4.0, 5.0):  # appuis des titres « Trop de… »
    drums.add(kick(soft=0.3), t0, gain=0.35)
kick_times += [3.0, 4.0, 5.0]

# Arpège pluck pendant la démonstration
ARP = {8.0: [65, 69, 72, 76], 12.0: [64, 69, 72, 76], 16.0: [62, 65, 69, 72], 20.0: [62, 67, 70, 74],
       24.0: [65, 70, 74, 77], 26.0: [64, 67, 72, 74]}
for t0, notes in ARP.items():
    span = 4.0 if t0 < 24 else 2.0
    k = 0
    while k * 0.25 < span - 0.01:
        tt = t0 + k * 0.25
        if tt >= 10.0 or t0 >= 12.0:
            m = notes[(k * 3) % len(notes)] + (12 if (t0 >= 24 and k % 4 == 2) else 0)
            g = 0.13 if t0 < 24 else 0.17
            keys.add(fm(midi(m), 0.6, ratio=2.0, index=1.6, idx_tau=0.06, amp_tau=0.18), tt, gain=g * (1.0 if k % 2 == 0 else 0.7), pan=0.35 * np.sin(k))
            send.add(fm(midi(m), 0.6, ratio=2.0, index=1.6, idx_tau=0.06, amp_tau=0.18), tt, gain=g * 0.5)
        k += 1

# Motif d'accroche « Trouver vos bureaux, c'est simple » (fa – la – do), puis rature
for tt, m in ((0.0, 65), (0.25, 69), (0.5, 72)):
    keys.add(fm(midi(m), 1.0, ratio=1.0, index=1.2, amp_tau=0.45), tt, gain=0.26, pan=-0.1)
    send.add(fm(midi(m), 1.0, ratio=1.0, index=1.2, amp_tau=0.45), tt, gain=0.16)
sfx.add(scratch(0.36, rate=7.0), T['strike'] - 0.01, gain=0.22, pan=0.1)
sfx.add(scratch(1.6, rate=12.0), T['strike_end'], gain=0.08, pan=0.2)

# Pastilles de critères : une note par pastille (pentatonique, spatialisée)
PENTA = [74, 77, 79, 81, 84, 86]
for k in range(12):
    tt = T['problem'] + T['chip_step'] * (k + 1)
    m = PENTA[(k * 5) % len(PENTA)]
    pan = (CHIP_X[k] - 540) / 540 * 0.7
    sfx.add(fm(midi(m), 0.4, ratio=3.0, index=1.0, idx_tau=0.03, amp_tau=0.09), tt, gain=0.11, pan=pan)
    sfx.add(tick(2600, 0.008), tt, gain=0.05, pan=pan)

# Montée et temps fort
sfx.add(riser(2.0), 6.0, gain=0.22)
rev_hit = convolve(np.vstack([impact(), impact()]) * 0.4, make_ir(2.0))
sfx.add(rev_hit[:, :int(0.9 * SR)][:, ::-1], T['drop'] - 0.9, gain=0.45)
sfx.add(impact(), T['drop'], gain=0.55)
send.add(impact(), T['drop'], gain=0.25)
sfx.add(whoosh(0.9, 2400, 300), T['drop'], gain=0.18, pan=-0.3)
kick_times.append(T['drop'])

# Marque
for m in (77, 81, 84):
    sfx.add(bell(midi(m), 2.0), T['brand'], gain=0.07)
    send.add(bell(midi(m), 2.0), T['brand'], gain=0.07)
# Frise : 5 nœuds
for i in range(5):
    sfx.add(tick(1800 + i * 220, 0.02), T['list'] + 0.05 + i * 0.08, gain=0.09, pan=-0.6)

# Transitions d'étapes
for tt in (T['step1'], T['step2'], T['step3'], T['step4'], T['step5'], T['value']):
    sfx.add(whoosh(0.5, 500, 3000), tt - 0.3, gain=0.07, pan=0.3)
# Brief : champs, choix du format, curseur
for i in range(4):
    sfx.add(tick(2200, 0.012), T['step1'] + 0.62 + i * 0.2, gain=0.08, pan=0.2)
sfx.add(fm(midi(84), 0.3, ratio=2.0, index=0.8, amp_tau=0.06), T['step1'] + 1.15, gain=0.08)
for i in range(6):
    sfx.add(tick(1500 + i * 180, 0.01), T['step1'] + 1.3 + i * 0.07, gain=0.04, pan=0.3)
# Sélection : repères, choix de l'offre, plongée dans la vignette
for i, m in enumerate((79, 83, 86)):
    sfx.add(fm(midi(m), 0.5, ratio=3.0, index=1.0, idx_tau=0.04, amp_tau=0.12), T['step2'] + 1.12 + i * 0.12, gain=0.1, pan=-0.2 + 0.3 * i)
for tt, m in ((T['pick'] + 0.05, 81), (T['pick'] + 0.15, 88)):
    sfx.add(fm(midi(m), 0.5, ratio=2.0, index=0.9, amp_tau=0.12), tt, gain=0.1)
sfx.add(whoosh(0.6, 300, 2400), T['zoom'], gain=0.12)
# Maquette 3D
sfx.add(whoosh(1.3, 150, 1200), T['extrude'] - 0.1, gain=0.14)
sfx.add(impact(), T['extrude'], gain=0.18)
for m in (69, 76, 81):
    send.add(bell(midi(m), 2.0), T['extrude'] + 0.95, gain=0.05)
# Négociation : 4 validations
for i, m in enumerate((76, 79, 81, 84)):
    sfx.add(fm(midi(m), 0.35, ratio=2.0, index=0.7, amp_tau=0.08), T['step4'] + 0.45 + i * 0.27, gain=0.11, pan=0.25)
# Signature puis clé
sfx.add(scratch(0.65, rate=9.0), T['step5'] + 0.3, gain=0.13, pan=0.15)
sfx.add(bell(midi(91), 1.4), T['step5'] + 1.2, gain=0.05, pan=-0.2)
sfx.add(fm(midi(98), 0.5, ratio=4.1, index=2.0, idx_tau=0.05, amp_tau=0.12), T['step5'] + 1.22, gain=0.05, pan=-0.2)
# Valeur : un appui par argument, accent sur la gratuité
for i in range(4):
    sfx.add(fm(midi(81 + (0, 2, 4, 7)[i]), 0.4, ratio=2.0, index=0.9, amp_tau=0.1), T['value'] + 0.5 + i * 0.35, gain=0.09, pan=-0.3)
for m in (77, 81, 84, 88):
    sfx.add(bell(midi(m), 1.8), T['free'], gain=0.05)
sfx.add(riser(0.5), T['value_out'] - 0.3, gain=0.1)
# Fin : le fil se replie, le point se pose (signature sonore), puis l'appel à l'action
sfx.add(whoosh(0.6, 2600, 400), T['end'], gain=0.1, pan=-0.4)
glide_n = int(0.55 * SR)
gt = ts(glide_n)
glide = np.sin(2 * np.pi * np.cumsum(midi(72) * 2 ** (gt / 0.55 * 5 / 12)) / SR) * np.sin(np.pi * gt / 0.55) ** 2
sfx.add(glide, T['dot'] - 0.55, gain=0.05, pan=0.2)
for m, g in ((77, 0.16), (81, 0.12), (84, 0.12), (89, 0.08)):
    sfx.add(bell(midi(m), 3.5), T['dot'], gain=g, pan=0.15)
    send.add(bell(midi(m), 3.5), T['dot'], gain=g * 0.8)
drums.add(kick(soft=0.4), T['end'], gain=0.6)
send.add(impact(), T['end'], gain=0.12)
sfx.add(tick(1900, 0.02), T['cta'], gain=0.07)

# ---------------------------------------------------------------- mixage
t_all = ts(N)
duck = np.ones(N)
for tk in kick_times:
    i0 = int(tk * SR)
    seg = t_all[i0:] - tk
    duck[i0:] *= 1 - 0.38 * np.exp(-seg / 0.11) * np.minimum(1, seg / 0.004 + 0.2)
pad.x *= duck
bass.x *= 0.6 + 0.4 * duck

ir = make_ir(2.4)
pad_wet = convolve(pad.x, ir)
wet = convolve(send.x + 0.35 * keys.x + 0.25 * sfx.x, ir)

mix = (0.78 * pad.x + 0.16 * pad_wet + 0.5 * bass.x + 0.76 * drums.x + 1.12 * keys.x + 0.9 * sfx.x + 0.32 * wet)
# Égalisation maître pensée pour le mobile : coupe-bas, grave contenu, présence légère
def master_eq(x):
    n = len(x)
    nfft = 1 << int(np.ceil(np.log2(n)))
    f = np.maximum(np.fft.rfftfreq(nfft, 1 / SR), 1e-3)
    H = 1 / np.sqrt(1 + (38 / f) ** 8)                       # passe-haut 38 Hz, 24 dB/oct
    H *= 1 - 0.5 / (1 + (f / 100) ** 2)                       # grave −6 dB sous ~90 Hz
    H *= 1 + 0.4 * np.exp(-0.5 * (np.log2(f / 2600) / 0.9) ** 2)   # présence +3 dB à 2,6 kHz
    return np.fft.irfft(np.fft.rfft(x, nfft) * H, nfft)[:n]


for c in range(2):
    mix[c] = master_eq(mix[c])

if os.environ.get("STEMS"):
    secs = [(0, 3), (3, 8), (8, 12), (12, 18), (18, 24), (24, 28), (28, 33)]
    stems = dict(pad=0.78 * pad.x + 0.16 * pad_wet, bass=0.5 * bass.x, drums=0.76 * drums.x, keys=1.12 * keys.x, sfx=0.9 * sfx.x, wet=0.32 * wet)
    print("dBFS RMS par section :", "  ".join(f"{a}-{b}s" for a, b in secs))
    for k, v in stems.items():
        row = []
        for a, b in secs:
            seg = v[:, int(a * SR):int(b * SR)]
            row.append(f"{20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9):7.1f}")
        print(f"{k:6s}", " ".join(row))

# Fondu final (aucune coupure sèche)
fade = np.ones(N)
f0, f1 = 31.6, 32.95
i0, i1 = int(f0 * SR), int(f1 * SR)
fade[i0:i1] = np.cos(np.linspace(0, np.pi / 2, i1 - i0)) ** 2
fade[i1:] = 0
mix *= fade
mix[:, :int(0.003 * SR)] *= np.linspace(0, 1, int(0.003 * SR))

# Bus maître : légère saturation, puis crête à -1 dBFS (la normalisation LUFS est faite à l'export)
mix = np.tanh(mix * 1.1) / 1.1
mix *= 10 ** (-1 / 20) / np.max(np.abs(mix))

os.makedirs(OUT, exist_ok=True)
path = os.path.join(OUT, "le-fil-mix.wav")
pcm = mix.T + rng.uniform(-0.5, 0.5, mix.T.shape) / 32768 * 2  # dither TPDF léger
pcm = np.clip(np.round(pcm * 32767), -32768, 32767).astype("<i2")
with wave.open(path, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(path, f"{N / SR:.2f} s", "crête", f"{20 * np.log10(np.max(np.abs(mix))):.2f} dBFS")
