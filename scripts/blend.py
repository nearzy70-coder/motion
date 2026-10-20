"""Moyenne des sous-images de chaque image (flou de mouvement) et envoi à FFmpeg en flux brut RGB.
Usage : python3 scripts/blend.py <dossier_images> '<arguments ffmpeg en JSON>'"""
import json
import os
import subprocess
import sys
from multiprocessing import Pool

import numpy as np
from PIL import Image

FRAMES = sys.argv[1]
ENC = json.loads(sys.argv[2])
COUNTS = json.load(open(os.path.join(FRAMES, "manifest.json")))


def blend(i):
    acc = None
    for s in range(COUNTS[i]):
        im = np.asarray(Image.open(os.path.join(FRAMES, f"f{i:05d}_{s:02d}.png")).convert("RGB"), dtype=np.uint16)
        acc = im if acc is None else acc + im
    n = COUNTS[i]
    return ((acc + n // 2) // n).astype(np.uint8).tobytes()


if __name__ == "__main__":
    ff = subprocess.Popen(["ffmpeg"] + ENC, stdin=subprocess.PIPE)
    with Pool(4) as pool:
        for k, buf in enumerate(pool.imap(blend, range(len(COUNTS)), chunksize=4)):
            ff.stdin.write(buf)
            if k % 300 == 0:
                print(f"mélange {k}/{len(COUNTS)}", flush=True)
    ff.stdin.close()
    sys.exit(ff.wait())
