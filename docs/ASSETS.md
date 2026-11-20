# Rezorb — Art Direction & Asset Brief

Direction: **Vogue in orbit.** A fashion magazine shot in deep space. Planets are the models,
lit with hard flash; chrome and liquid metal; film grain; cut-out collage; a deep black void with
magenta / violet / cyan rim light. It extends the system in [DESIGN.md](../DESIGN.md) (palette,
type, Calm mode); it does not replace it.

> **Reference note.** The brief was requested "like polecat.agency", but that site could not be
> fetched from the build environment (blocked by the network allowlist), so nothing here is derived
> from it. If you want the look matched to it, share screenshots or add the domain to the allowlist.

## What already exists (code, no generation needed)

| Asset | Where | Notes |
|-------|-------|-------|
| Logo set (outlined SVG) | `public/brand/*.svg` | `rezorb-wordmark` (+ `-ink`, `-mono`), `rezorb-editorial` (italic serif "re" + ZORB, + `-ink`), `rezorb-mark` (+ `-mono`), `rezorb-stacked`. Rebuild with `scripts/brand/build-logo.mjs`. |
| Wordmark component | `Wordmark` in `components/cosmos/Orb.tsx` | Swaps light/ink art with the theme; `editorial` prop for the serif lockup |
| Favicon / touch icon | `src/app/icon.svg`, `src/app/apple-icon.tsx` | |
| OG image | `src/app/opengraph-image.tsx` | Replace with generated art later (see §5) |
| 3D hero | `components/cosmos/HeroScene.tsx` | three.js: shader planet, banded ring, chrome torus lit by a baked studio env, orbiting glass cards, twinkling stars. No image downloads. |

## Rules for every generated image

1. **No text, logos or UI in the image.** Type is set in HTML. Generators garble letters.
2. **Black or transparent background**, subject cut out cleanly, so it layers over the live nebula.
3. Generate at **≥ 3000 px** on the long side; export **AVIF + WebP** at 1× and 2×, **< 200 KB** each.
4. Keep one **seed / style reference** across the set so it reads as one shoot.
5. Anything that plays on the landing must respect Calm mode and `prefers-reduced-motion` (they get the flat fallback), and every `<img>` needs `alt` text or `aria-hidden`.
6. Save to `public/art/<name>.{avif,webp}`; tell me the names and I'll wire them in.

### Style suffix (append to every prompt)

> editorial fashion photography meets deep space, hard direct flash, glossy chrome and liquid metal, film grain, deep black void background, magenta and violet rim light with cyan accents, high contrast, centered negative space, no text, no logos, no watermark

### Negative prompt (where supported)

> text, letters, logo, watermark, signature, UI, people's faces, cartoon, flat vector, low contrast, washed out, blurry, jpeg artifacts, extra rings, deformed planet

---

## 1. Key art (landing, 3000 px+, transparent or black)

| # | File | Size | Prompt (prepend to the style suffix) |
|---|------|------|---------------------------------------|
| 1 | `hero-planet` | 3200×3200 | A giant glossy magenta-and-violet gas planet with a thin chrome ring cutting across it, photographed like a magazine cover, specular flash highlight upper left |
| 2 | `chrome-ring` | 3000×1200 | A single thin liquid-chrome ring floating alone, mirror finish reflecting pink and cyan softboxes, product-shot lighting |
| 3 | `glass-card-hand` | 2400×3000 | A gloved astronaut hand holding a glowing translucent glass card, cropped at the wrist, fashion editorial pose, cyan edge light |
| 4 | `two-worlds` | 3200×1800 | A small planet and a huge planet facing each other, a single thin beam of light arcing between them, symmetrical composition |
| 5 | `torn-nebula` | 3200×2000 | Torn-paper collage of galaxy fragments with strips of masking tape, magenta and violet, tactile paper edges, flash-lit |
| 6 | `moon-lipstick` | 2400×2400 | A moon close-up lit like a beauty shot, crater shadows deep lipstick red, glossy highlights, extreme macro |
| 7 | `satellite-luxe` | 3000×2000 | A satellite photographed as a luxury product, gold foil panels, black seamless backdrop, studio strobe |
| 8 | `comet-streak` | 3200×1200 | A long-exposure comet streak, pink and cyan light trails sweeping diagonally across black |
| 9 | `glass-pods` | 3200×2000 | A cluster of three translucent glass capsules floating at different sizes, refractive, soft inner glow, one pink, one violet, one cyan |
| 10 | `halftone-planet` | 2400×2400 | A flat print-style halftone-dot planet, magenta ink on black, screen-printed texture, no gradient |
| 11 | `orbit-diagram` | 3200×1800 | An editorial technical illustration of concentric elliptical orbits with tiny labelled-looking tick marks (no readable text), thin white lines on black |
| 12 | `star-atlas` | 3200×1800 | A vintage star-atlas plate, fine linework constellations, aged paper turned dark, gold ink on black |

## 2. Textures and backgrounds (seamless where noted)

| File | Size | Prompt |
|------|------|--------|
| `nebula-dark` | 3840×2160 | Deep nebula, near-black with magenta and violet clouds, sparse stars, soft and dark so UI text stays readable |
| `nebula-daylight` | 3840×2160 | Pastel pink-lavender nebula on a very light warm background, soft, low contrast (for the Daylight theme) |
| `grain-tile` | 512×512, **seamless** | Fine monochrome film grain, neutral grey, tileable |
| `halftone-tile` | 512×512, **seamless** | Regular halftone dot field, white dots on black |
| `paper-tile` | 1024×1024, **seamless** | Warm off-white paper texture with faint fibres (for the cargo cards) |
| `light-leaks` | 3000×2000 | Film light-leak streaks, pink and amber, on black, for screen-blend overlays |

## 3. UI illustrations (2000 px, transparent)

| File | Prompt |
|------|--------|
| `empty-orbit` | A lone dashed orbit ring around a tiny glowing point, minimal, chrome and pink, lots of empty space |
| `lost-in-space` | A small astronaut helmet drifting alone, visor reflecting a pink planet, quiet and slightly funny, 404 mood |
| `two-devices-linked` | Two abstract glass slabs (a laptop and a phone shape) connected by a glowing orbital arc, translucent, cyan and pink |
| `locked-space` | A glass sphere with a small chrome padlock floating inside, rim-lit magenta |
| `burn-up` | A glowing capsule breaking up on re-entry into ember particles, amber and red, dramatic |
| `error-static` | A cracked glass planet with pink light leaking from the fracture |

## 4. 3D (three.js) assets

The hero is procedural. Only these are optional extras:

| Asset | Format | Notes |
|-------|--------|-------|
| `studio.hdr` | HDRI, 2k | Dark space studio with pink and cyan softboxes, to replace the baked env on the chrome. Currently built in code. |
| `satellite.glb` | glTF, < 1.5 MB, Draco | Optional second hero object. Generate with an image-to-3D tool from `satellite-luxe`. |

Tooling in use: `three`, `@react-three/fiber`. Candidates if needed: `@react-three/drei` (helpers),
`postprocessing` (bloom / chromatic aberration), `gsap` + ScrollTrigger and `lenis` (scroll choreography).
Each adds weight on laptops we don't control, so add them only for a visible gain.

## 5. Marketing and social

| File | Size | Prompt / notes |
|------|------|----------------|
| `og-cover` | 1200×630 | Hero planet at the right edge, black left two-thirds for the title (set in code) |
| `twitter-banner` | 1500×500 | Comet streak across a nebula, quiet center |
| `launch-poster` | 3000×4000 | Portrait magazine-cover composition: planet + chrome ring, black space at the top for the masthead |
| `hero-loop.mp4` / `.webm` | 1920×1080, 6–8 s, silent, < 2 MB | The hero planet rotating slowly with the ring; used only as a poster/fallback, never autoplayed in Calm mode |
| `app-icon-1024` | 1024×1024 | The mark on void, no transparency (store listings / PWA) |

## 6. Typography pairing (reference for any layout work)

Wide heavy sans (**Unbounded Black**) against an italic display serif (**Instrument Serif Italic**):
the "re" in the editorial lockup is the one place the serif leads. Body in **Space Grotesk**,
data in **JetBrains Mono**.

## 7. Performance and accessibility budget

- 3D hero: lazy-loaded, desktop-width only, ≥ 4 cores and ≥ 4 GB memory when reported, WebGL required, DPR ≤ 1.5, pauses off-screen and in hidden tabs, and **falls back to the flat halftone planet if frames average worse than 30 fps for ~2 s**.
- Off entirely in Calm mode and under `prefers-reduced-motion`; never mounted on phones. (Tested in `e2e/hero.spec.ts`.)
- Decorative art is `aria-hidden`; content imagery gets real `alt` text.
- Total hero imagery on first load: **< 400 KB** (the 3D scene downloads no images).
