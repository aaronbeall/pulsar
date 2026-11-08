"""Generates home/nebula.jpg, the galactic backdrop behind the homepage's pulsar hero.

A procedural space scene: a diagonal galactic band of dense stars, purple / magenta / red
nebula clouds with dark dust lanes through them, and a scattered star field. It's baked to
a JPEG (instead of drawn live) so it costs phones nothing per frame and also shows when
WebGL isn't available.

Usage: python3 scripts/generate-home-nebula.py [seed]   (needs numpy and Pillow)
"""
import sys

import numpy as np
from PIL import Image, ImageFilter

SIZE = 1800
SEED = int(sys.argv[1]) if len(sys.argv) > 1 else 7
OUT = "home/nebula.jpg"

rng = np.random.default_rng(SEED)
yy, xx = np.mgrid[0:SIZE, 0:SIZE].astype(np.float32) / SIZE  # 0..1


def octave(cells: int) -> np.ndarray:
    """Smooth value noise: a random grid upsampled with bicubic interpolation."""
    grid = rng.random((cells + 3, cells + 3)).astype(np.float32)
    img = Image.fromarray((grid * 255).astype(np.uint8)).resize(
        (SIZE + SIZE * 3 // cells, SIZE + SIZE * 3 // cells), Image.BICUBIC
    )
    a = np.asarray(img, dtype=np.float32)[:SIZE, :SIZE] / 255.0
    return a


def fbm(base: int, octaves: int = 6, gain: float = 0.52) -> np.ndarray:
    total = np.zeros((SIZE, SIZE), np.float32)
    amp, norm, cells = 1.0, 0.0, base
    for _ in range(octaves):
        total += octave(cells) * amp
        norm += amp
        amp *= gain
        cells *= 2
    return total / norm


def sample(field: np.ndarray, x: np.ndarray, y: np.ndarray) -> np.ndarray:
    """Bilinear lookup of field at fractional pixel coordinates (clamped)."""
    x = np.clip(x, 0, SIZE - 1.001)
    y = np.clip(y, 0, SIZE - 1.001)
    x0, y0 = x.astype(np.int32), y.astype(np.int32)
    fx, fy = x - x0, y - y0
    a = field[y0, x0] * (1 - fx) + field[y0, x0 + 1] * fx
    b = field[y0 + 1, x0] * (1 - fx) + field[y0 + 1, x0 + 1] * fx
    return a * (1 - fy) + b * fy


def warped(base: int, amount: float) -> np.ndarray:
    """Domain-warped fbm, for wispy, flowing cloud shapes."""
    qx, qy = fbm(3, 4), fbm(3, 4)
    f = fbm(base)
    px = xx * SIZE + (qx - 0.5) * amount * SIZE
    py = yy * SIZE + (qy - 0.5) * amount * SIZE
    return sample(f, px, py)


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


# The galactic band: a soft diagonal stripe, its edge roughened by noise.
angle = np.deg2rad(-28)
cx, cy = xx - 0.5, yy - 0.42
dist = np.abs(cx * np.sin(angle) + cy * np.cos(angle))
wobble = (fbm(2, 4) - 0.5) * 0.22
band = np.exp(-((dist + wobble) ** 2) / (2 * 0.12 ** 2))

clouds_a = warped(3, 0.55)
clouds_b = warped(4, 0.7)
clouds_c = warped(5, 0.45)
ridge = 1 - np.abs(warped(4, 0.6) * 2 - 1)  # thin ridges → dust filaments

img = np.zeros((SIZE, SIZE, 3), np.float32)

# Deep space base: indigo near the middle (where the star sits), near black at the edges.
r = np.hypot(xx - 0.5, yy - 0.4)
img += np.array([0.035, 0.02, 0.075]) * (1 - smooth(0.0, 0.75, r))[..., None]
img += np.array([0.012, 0.008, 0.025])

# Nebula layers, mostly inside the band.
violet = smooth(0.5, 0.92, clouds_a) * (0.12 + 0.9 * band)
magenta = smooth(0.55, 0.92, clouds_b) * (0.05 + 0.9 * band)
red = smooth(0.62, 0.92, clouds_c) * band
blue = smooth(0.4, 0.85, clouds_b * 0.6 + clouds_a * 0.4) * (0.15 + 0.5 * band)
img += violet[..., None] * np.array([0.20, 0.08, 0.44])
img += magenta[..., None] * np.array([0.38, 0.06, 0.32])
img += red[..., None] * np.array([0.5, 0.06, 0.1])
img += blue[..., None] * np.array([0.06, 0.08, 0.30])

# Diffuse glow of unresolved stars along the band.
img += (band ** 1.5)[..., None] * np.array([0.13, 0.09, 0.2]) * (0.6 + 0.6 * fbm(6, 5))[..., None]

# Dark dust lanes cut through the band.
dust = smooth(0.7, 0.96, ridge) * smooth(0.4, 0.7, fbm(3, 5)) * band
img *= (1 - 0.9 * dust)[..., None]

# Stars: a uniform scatter plus a denser population in the band, in a few sizes.
stars = np.zeros((SIZE, SIZE, 3), np.float32)


def add_stars(count: int, weight: np.ndarray | None, size_bias: float):
    if weight is None:
        ys = rng.integers(0, SIZE, count)
        xs = rng.integers(0, SIZE, count)
    else:
        p = (weight / weight.sum()).ravel()
        idx = rng.choice(SIZE * SIZE, size=count, p=p)
        ys, xs = np.divmod(idx, SIZE)
    bright = 0.06 + rng.random(count) ** (6 - size_bias) * 1.8
    tint = rng.random(count)
    colors = np.stack(
        [0.75 + 0.25 * tint, 0.72 + 0.1 * rng.random(count), 1.0 - 0.25 * tint], axis=1
    )
    np.add.at(stars, (ys, xs), colors * bright[:, None] * 2.2)


add_stars(5000, None, 0)
add_stars(13000, band ** 2 * (0.4 + fbm(5, 4)), 1)

# A few bright stars with a soft halo.
halo = np.zeros((SIZE, SIZE, 3), np.float32)
for _ in range(70):
    y, x = rng.integers(0, SIZE, 2)
    c = np.array([0.85 + 0.15 * rng.random(), 0.8, 1.0]) * (1.5 + 3 * rng.random())
    halo[y, x] += c

star_img = Image.fromarray(np.clip(stars * 255, 0, 255).astype(np.uint8))
stars = np.asarray(star_img.filter(ImageFilter.GaussianBlur(0.6)), np.float32) / 255 * 2.4
halo_img = Image.fromarray(np.clip(halo * 60, 0, 255).astype(np.uint8))
halo_soft = np.asarray(halo_img.filter(ImageFilter.GaussianBlur(5)), np.float32) / 255 * 1.2
halo_core = np.asarray(halo_img.filter(ImageFilter.GaussianBlur(1.1)), np.float32) / 255 * 3
img += (stars + halo_soft + halo_core) * (1 - 0.7 * dust)[..., None]

# Tone map and darken a little toward the edges so the page blends into the background.
img = 1 - np.exp(-img * 1.6)
img *= (1 - 0.55 * smooth(0.35, 0.8, r))[..., None]
img = np.clip(img ** 0.95, 0, 1)

Image.fromarray((img * 255).astype(np.uint8)).save(OUT, quality=74, optimize=True, progressive=True)
print("wrote", OUT)
