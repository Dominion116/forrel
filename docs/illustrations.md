# Landing page illustrations

The landing page uses five generated images. Four are drawn at runtime by
`components/illustration/dither-figure.tsx`: it turns a grayscale image into a 1-bit ordered
dither in the current theme's ink color, so one file works in dark and light mode. The fifth
(`og-art.png`) is used as-is in the share card.

Drop each file into `apps/web/public/illustrations/` with the exact name below. No code change
is needed. Until a file exists, its slot shows a dashed "Illustration slot" box.

## Rules for every runtime image (1–4)

- **Format:** PNG, 8-bit grayscale or RGB, no transparency needed. JPEG/WebP output: convert to PNG.
- **Background:** pure black `#000000`, flat. No vignette, gradient, fog, floor, pedestal or shadow.
  Anything not black becomes dots.
- **Tone:** smooth continuous-tone grayscale. **Do not** dither, halftone or stipple it yourself; the
  code does that. Highlights around 85–90% white, shadows dark grey. Large areas of pure white turn
  into solid blocks.
- **Content:** one subject only. No text, logos, watermarks, frames or borders.
- **Lighting:** hard key light from the upper left, so the form reads clearly in silhouette.

**Shared style line** (paste at the start of each prompt):

> Classical white Carrara marble sculpture, museum studio photograph, isolated on a pure flat black
> background, dramatic hard key light from upper left, deep shadows, high contrast, smooth polished
> stone, sharp focus, monochrome grayscale, no color.

**Shared negative prompt:**

> color, background texture, gradient background, vignette, fog, floor, pedestal, plinth, shadow on
> ground, text, letters, logo, watermark, frame, border, multiple subjects, extra fingers, deformed
> hands, blur, depth of field, halftone, dithering, stipple, noise, grain, jpeg artifacts.

---

## 1. `hero-hand-left.png`

| | |
|---|---|
| **Where** | Hero, left edge, at headline height. Shown on screens ≥1024 px wide, about 30% of the viewport wide, bleeding off the left edge. |
| **Size** | 1600 × 1200 px (4:3), PNG |
| **Motion** | Assembles from scattered pixels on load. Pixels push away from the cursor and spring back. The whole figure drifts slightly toward the cursor (parallax). |
| **Story** | The maintainer's hand, holding out the release. |

**Prompt:**

> [shared style line] A single right human hand and forearm entering the frame from the left edge,
> reaching horizontally toward the right. The wrist and forearm are cut off by the left edge of the
> frame. Between the thumb and index finger it delicately holds a small square microchip, about the
> size of a coin, held up like an offering. The fingertips and the chip sit at about 80% of the image
> width, vertically centred. Elegant Renaissance proportions, relaxed fingers, the gesture echoing a
> fresco of two reaching hands. The right 15% of the frame is empty black.

## 2. `hero-hand-right.png`

| | |
|---|---|
| **Where** | Hero, right edge, mirroring image 1. |
| **Size** | 1600 × 1200 px (4:3), PNG |
| **Motion** | Same as image 1, with the parallax drift in the opposite direction, so the two hands seem to reach toward each other. |
| **Story** | The device's hand, receiving the release. |

**Prompt:**

> [shared style line] A single left human hand and forearm entering the frame from the right edge,
> reaching horizontally toward the left, palm turned up and open, fingers gently curved as if about
> to receive a small object. The wrist and forearm are cut off by the right edge of the frame. The
> fingertips sit at about 20% of the image width, vertically centred. Same scale, marble and
> lighting as a matching left-hand sculpture, Renaissance proportions. The left 15% of the frame is
> empty black.

> Tip: generate 1 and 2 in the same session (or with the same seed and style reference) so the scale
> and marble match.

## 3. `problem-statue.png`

| | |
|---|---|
| **Where** | "The problem" section, to the right of "Signed today, Forged tomorrow." (above the three cards on phones). About 340 px wide on desktop. Caption [2]. |
| **Size** | 1200 × 1600 px (3:4), PNG |
| **Motion** | Assembles on view. Then, as you scroll past, it **crumbles from the bottom up** into falling pixels (Q-Day) and rebuilds when you scroll back. Also scatters around the cursor. |
| **Story** | Today's classical signatures: they look solid now. |

**Prompt:**

> [shared style line] A classical Greek guardian statue, a helmeted hoplite sentinel in a draped
> cloak, shown from head to mid-thigh in three-quarter view, holding a large ornate antique key
> upright against his chest with both hands like a sword. Calm, watchful pose. The figure is
> completely intact: no cracks, no damage, no missing parts. The figure fills about 85% of the
> frame height and is horizontally centred, with clear black space all around.

> Keep it intact. The breaking-apart effect is done in code; a pre-cracked statue looks broken
> even before the effect starts.

## 4. `closer-figure.png`

| | |
|---|---|
| **Where** | The closing "Verify it." block on the dot grid, to the right of the headline. About 320 px wide on desktop. Caption [3]. |
| **Size** | 1200 × 1500 px (4:5), PNG |
| **Motion** | Assembles on view. Pixels scatter around the cursor and spring back. |
| **Story** | The verdict: the same answer in ten years as today. |

**Prompt:**

> [shared style line] A single marble hand and forearm rising vertically from the bottom edge of the
> frame, holding up a classical balance scale by its top ring. The two pans hang perfectly level, in
> exact equilibrium, with thin chains. The forearm is cut off by the bottom edge. The scale is
> centred horizontally and its beam sits at about 30% of the image height. Symmetrical, calm,
> monumental.

## 5. `og-art.png` (share card, used as-is)

| | |
|---|---|
| **Where** | The right half of the 1200 × 630 Open Graph / Twitter card (`app/opengraph-image.tsx`). The left half holds the headline. |
| **Size** | 1260 × 1260 px (square, shown at 630 × 630), PNG |
| **Motion** | None (a static image). |

This one is **not** dithered by code, so ask for the finished 1-bit look.

**Prompt:**

> Two classical marble hands reaching toward each other from the left and right edges, the left
> hand holding a small square microchip between thumb and index finger, the right hand open and
> palm up about to receive it, a small gap between them, rendered as a 1-bit ordered-dither
> (Bayer) pixel illustration: white square dots on a pure black background, coarse visible pixel
> grid, high contrast, no grey, no color. Square composition, hands centred vertically, empty black
> margin on all sides. No text.

**Negative prompt:** color, grey tones, gradient background, text, logo, watermark, border, blur,
extra fingers, deformed hands.

---

## Checking a new image

1. Put the file in `apps/web/public/illustrations/`.
2. Run `npm run dev` and open `/`.
3. If the figure looks too dense or washed out, adjust its `gamma` prop on `<DitherFigure>`
   (above 1 gives fewer dots, below 1 more). For chunkier pixels raise `cell` (default 4).
