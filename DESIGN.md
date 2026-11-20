# Rezorb — Design System

> **Throw it into space. Catch it on the other side.**

Rezorb is a private, floating space between your own devices. This document is the
single source of truth for how Rezorb **looks, moves, sounds, and speaks**. It
uses a **maximalist** look: layered, loud, textured, and full of personality. It
is never confusing, though. Every bit of decoration sits behind a clear
hierarchy, and every effect can be turned off.

Related: product scope in [`docs/PRD.md`](docs/PRD.md), vocabulary in
[`CONTEXT.md`](CONTEXT.md), engineering in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 1. Design principles

| # | Principle | What it means in practice |
|---|-----------|---------------------------|
| 1 | **Loud shell, quiet cargo** | The chrome (backgrounds, headers, empty states, buttons) is maximal. The *content* the user drops (text, code, images) always sits on a calm, high-contrast surface. Never put noise behind someone's text. |
| 2 | **Paste is the primary verb** | The whole Space is a paste target. No "click here to start". Ctrl/⌘+V anywhere in a Space beams the clipboard in. |
| 3 | **One keystroke to take it out** | Every Drop has a big, obvious Copy action. The latest Drop is always one key (`C`) away. |
| 4 | **Physics, not decoration** | Motion means something. Drops *arrive* (they fall in from orbit), *dock* (they settle), and *burn up* (they expire). Nothing moves just to move. |
| 5 | **Calm is a first-class mode** | Rezorb is often used on a work laptop, in a meeting, next to a colleague. **Calm mode** strips the visual layers down to a quiet, monochrome, still interface. It is the same app, just quieter. |
| 6 | **Trust is visible** | Locks, expiry countdowns, which devices are present, and lockout states are always on screen, never hidden in menus. |

---

## 2. Brand

### 2.1 Name & wordmark

- **Name:** Rezorb. It comes from *re-absorb*: things leave one device and get reabsorbed by another.
- **Wordmark:** `REZORB` set in **Unbounded Black**, tracking `-0.04em`, with the
  **O replaced by the Orb glyph** (a filled circle with a tilted elliptical ring,
  Saturn-like). The ring is drawn in `--plasma` and crosses in front of the orb
  on the lower half.
- **Monogram / favicon:** the Orb glyph alone, inside a rounded square of `--void`.
- **Lockups:**
  - Primary: Orb + `REZORB` horizontally.
  - Stacked: Orb above `REZORB` (landing hero, OG images).
  - Compact: Orb only (tab icon, app header on mobile).
- **Clear space:** at least the height of the Orb on all sides.
- **Don'ts:** don't outline the wordmark, don't put it on busy nebula without the
  `--void` plate, don't recolor the ring anything other than `--plasma`, `--flare`,
  or `--starlight`.

### 2.2 Taglines

- Primary: **"Throw it into space. Catch it on the other side."**
- Short: **"Your clipboard, in orbit."**
- Functional: **"Paste here. Copy there."**

### 2.3 Voice

Rezorb talks like a calm mission controller with a sense of humor: short,
confident, and a little cosmic, **but never cute when something went wrong.**

| Situation | Do | Don't |
|-----------|------|---------|
| Text arrived | "Docked." | "Yay!! Your text is here!!" |
| Copied to clipboard | "Copied. Go paste it." | "Successfully copied to clipboard." |
| Wrong PIN | "That PIN didn't open this Space. 3 tries left." | "Houston, we have a problem" |
| Locked out | "Too many tries. This Space is sealed for 15 minutes." | "Oops! You're locked out lol" |
| Expired | "Burned up on re-entry. (Expired 2h ago.)" | "Item not found." |
| Empty Space | "Nothing in orbit. Paste anything." | "No items to display." |

Rule: **space metaphors go in headlines and empty states. Errors and security
messages use plain words first.** Any metaphor comes after the plain sentence, if
at all.

---

## 3. Color

Maximalism here means **many saturated hues layered on a deep, near-black
void.** The palette is built so each neon color only meets dark surfaces or its own
tint. That keeps contrast high even when the screen is busy.

### 3.1 Core tokens

| Token | Hex | Role |
|-------|-----|------|
| `--void` | `#07040F` | Page background. Deepest layer. |
| `--abyss` | `#0F0A24` | Raised surfaces (panels, sheets). |
| `--hull` | `#1A1238` | Cards, inputs. |
| `--hull-2` | `#251A4D` | Hover / pressed surfaces. |
| `--starlight` | `#F5F1FF` | Primary text on dark. |
| `--moondust` | `#B9B0D9` | Secondary text. |
| `--dim` | `#8F86B5` | Tertiary text, helper text, disabled. Passes AA (≥ 4.5:1) on `--abyss` and `--hull`; verified with axe. *(Was `#7C72A3` at ~4.2:1, which failed on small text.)* |
| `--nebula` | `#FF3DB8` | Brand primary (hot magenta). Primary buttons, focus glow. |
| `--plasma` | `#8B5CFF` | Brand secondary (electric violet). Links, ring of the Orb, selection. |
| `--ion` | `#2DF5FF` | Live / realtime / presence. "Something is happening right now." |
| `--flare` | `#FFB627` | Warnings, expiry < 1h, attention. |
| `--aurora` | `#3DFFA8` | Success: docked, copied, unlocked. |
| `--redshift` | `#FF4D4D` | Danger: delete, lockout, error. |
| `--paper` | `#FFFCF5` | **Cargo surface** for text and code Drops (light mode of content). |
| `--ink` | `#14101F` | Text on `--paper`. |

### 3.2 Gradients (named, reusable)

| Token | Definition | Used for |
|-------|-----------|----------|
| `--grad-nebula` | `radial-gradient(120% 80% at 10% 0%, #FF3DB8 0%, transparent 55%), radial-gradient(90% 70% at 100% 20%, #8B5CFF 0%, transparent 60%), radial-gradient(80% 60% at 50% 100%, #2DF5FF33 0%, transparent 70%)` | Page backdrop layer 2 |
| `--grad-flare` | `linear-gradient(100deg, #FFB627, #FF3DB8 50%, #8B5CFF)` | Display headline fills, primary CTA border |
| `--grad-ion` | `conic-gradient(from 180deg, #2DF5FF, #8B5CFF, #3DFFA8, #2DF5FF)` | Presence rings, live pulses |
| `--grad-burn` | `linear-gradient(180deg, #FFB627, #FF4D4D)` | Expiry ring in its final hour |

### 3.3 Contrast rules (non-negotiable)

- Body text is always `--starlight` on `--void`/`--abyss`/`--hull` (≥ 13:1), or
  `--ink` on `--paper` (≥ 17:1).
- Neon colors (`--nebula`, `--ion`, `--flare`, `--aurora`) **may be used for text
  only at ≥ 18px bold or for single-word labels**. They all pass AA-large on `--void`.
- **Never** put text directly on `--grad-nebula`. Put it on a solid `--void` or `--abyss` surface.
- State is never conveyed by color alone. Every state color comes with an
  icon *and* a word.
- **These rules are enforced, not aspirational:** the Playwright suite runs axe (WCAG 2.2 AA)
  on the landing, auth, Launchpad, Space and Settings screens in **both** Dark and Daylight.
  Decorative large numerals (the "01 02 03" on the landing page) are `aria-hidden` and still
  meet large-text contrast.

### 3.4 Light theme ("Daylight")

The default is dark, but Rezorb ships a full light theme. Some offices make every
window bright, so a dark-only app would look out of place.

| Dark token | Daylight value |
|-----------|----------------|
| `--void` | `#FBF7FF` |
| `--abyss` | `#F1E9FF` |
| `--hull` | `#FFFFFF` |
| `--starlight` | `#14101F` |
| `--moondust` | `#4A4166` |
| `--nebula` | `#D6008A` |
| `--plasma` | `#5B2BE0` |
| `--ion` | `#007C8A` |
| `--flare` | `#A35F00` |
| `--aurora` | `#00805A` |

The nebula backdrop keeps its shapes in Daylight but drops to 25% opacity, and
the starfield is replaced by a faint dot grid.

### 3.5 Space accent colors

Each Space gets one of **8 accent hues** (user-pickable and auto-assigned on
creation). The accent tints the Space header, its Orb badge in the Launchpad, and
the arrival glow of its Drops. It never touches content surfaces.

`nebula · plasma · ion · flare · aurora · redshift · #FF8A3D (corona) · #C6FF3D (chartreuse)`

---

## 4. Typography

Maximalism means **typographic contrast**: a huge, wide, geometric display face, a
softly elegant italic serif for emphasis, a technical grotesk for UI, and a mono
for content. All four are free on Google Fonts and loaded with `next/font/google`
(self-hosted, no layout shift).

| Role | Family | Weights | Usage |
|------|--------|---------|-------|
| **Display** | **Unbounded** | 800, 900 | Hero, page titles, Space names, big numbers |
| **Accent** | **Instrument Serif** (italic) | 400 | One or two words of emphasis inside display lines ("Throw it *into space*.") |
| **UI / body** | **Space Grotesk** | 400, 500, 700 | Everything else |
| **Mono / cargo** | **JetBrains Mono** | 400, 600 | Text Drops, code, PINs, file sizes, timestamps |

### 4.1 Scale (fluid)

| Token | Size | Line height | Family |
|-------|------|------------|--------|
| `--fs-mega` | `clamp(3.5rem, 11vw, 9rem)` | 0.88 | Unbounded 900, uppercase |
| `--fs-display` | `clamp(2.5rem, 6vw, 4.5rem)` | 0.95 | Unbounded 800 |
| `--fs-h1` | `2rem` | 1.1 | Unbounded 800 |
| `--fs-h2` | `1.5rem` | 1.2 | Space Grotesk 700 |
| `--fs-h3` | `1.125rem` | 1.3 | Space Grotesk 700 |
| `--fs-body` | `1rem` | 1.55 | Space Grotesk 400 |
| `--fs-small` | `0.875rem` | 1.45 | Space Grotesk 500 |
| `--fs-micro` | `0.75rem` | 1.3 | Space Grotesk 700, uppercase, `letter-spacing: 0.12em` |
| `--fs-cargo` | `0.9375rem` | 1.6 | JetBrains Mono 400 |

### 4.2 Type treatments

- **Gradient display:** headlines may use `--grad-flare` via `background-clip: text`.
  Use it on at most **one headline per screen**.
- **Outline echo:** behind a mega headline, repeat the same word as a
  `-webkit-text-stroke: 1px var(--plasma)` outline, offset `8px 8px`, at 40%
  opacity. This is the signature maximalist layer.
- **Micro labels** (`--fs-micro`) are used as "mission stickers": `DOCKED`,
  `LIVE`, `EXPIRES 3H`, `LOCKED`.
- **Numbers** (countdown, sizes, PIN) always use JetBrains Mono with
  `font-variant-numeric: tabular-nums`.

---

## 5. Texture, depth & layers

A Rezorb screen is built from **up to six stacked layers**. That stacking is
where the maximalism comes from. Calm mode removes layers 1–3.

```
 6  Overlay      Toasts, command palette, PIN keypad sheet
 5  Content      Drops (cargo cards), forms, lists
 4  Chrome       Header, Dock, Launchpad grid, stickers
 3  Grain        SVG fractal-noise overlay, 6% opacity, mix-blend: overlay
 2  Nebula       --grad-nebula, slowly drifting (60s loop)
 1  Starfield    <Starfield/> canvas (twinkling, parallax on pointer)
 0  Void         --void solid
```

### 5.1 Surfaces

| Surface | Background | Border | Radius | Shadow |
|---------|-----------|--------|--------|--------|
| **Panel** | `--abyss`, solid | `1px solid --line` | `10px` (`lg`) | none |
| **Hull** | `--hull` | `1px solid --line` | `10px` (`lg`) | none |
| **Cargo card** (Drop) | `--paper` (text/code/link) or `--hull` (file/image) | `2px solid var(--space-accent)` | `10px` (`lg`) | **Hard offset shadow** `5px 5px 0 var(--space-accent)` |
| **Tag** | solid kind colour | none | `3px` (`sm`) | none |
| **Input** | `--hull` | `2px solid --line`, `--nebula` on focus | `6px` (`md`) | focus ring `0 0 0 4px` nebula @ 20% |

Surfaces are **solid**. There is no backdrop blur anywhere (see §17).

The **hard offset shadow** on cargo cards is a key recognisable detail. It is
neo-brutalist and contrasts with the soft glowing space behind it.

### 5.2 Ornaments

The restraint pass (§17) removed orbit lines, the fabricated coordinates, rotated stickers and the
marquee. What remains decorative is: the **halftone planet** (hero fallback), the **grain** and
**nebula** layers behind the app, and the **mark** on the auth panel. All are `aria-hidden`, and
Calm mode removes them.

---

## 6. Iconography

- **Library:** `lucide-react`, stroke width `1.75`, size 20 (UI) / 24 (actions).
- **Custom glyphs** (SVG, same stroke style): Orb (brand), Dock, Beam (arrow
  with three speed lines), Burn (flame inside a circle), Constellation (three
  joined dots), Pair (two devices linked by an orbit).
- Drop-kind icons: `Type` (text), `Code2` (code), `Link` (link),
  `Image` (image), `File` / `FileArchive` / `FileText` (file by MIME).

---

## 7. Motion

Motion uses **Framer Motion** (`motion` package). Everything respects
`prefers-reduced-motion` *and* Calm mode. In both cases durations drop to 0 and
the layered effects stop.

### 7.1 Tokens

| Token | Value | Use |
|-------|-------|-----|
| `--ease-orbit` | `cubic-bezier(0.22, 1, 0.36, 1)` | Default enter |
| `--ease-burn` | `cubic-bezier(0.55, 0, 1, 0.45)` | Exits |
| `--spring-dock` | `{ type: "spring", stiffness: 420, damping: 28, mass: 0.9 }` | Drops arriving |
| `--dur-fast` | `120ms` | Hover, press |
| `--dur-base` | `240ms` | Panels, sheets |
| `--dur-slow` | `520ms` | Arrival, page transitions |

### 7.2 Signature moments

| Moment | Motion |
|--------|--------|
| **Arrival** (a Drop comes in from another device) | Card starts 40px above, scale 0.9, rotate −3°, then springs into place with `--spring-dock`. An `--ion` glow ring pulses once around it. The other device's Constellation node flashes. |
| **Beam** (you paste) | The Dock flashes `--nebula`, a short streak (3 speed lines) shoots up from the Dock, and the card appears at the top. |
| **Copy** | Card does a quick 0.97 squash, `--aurora` border flash, `COPIED` sticker slaps onto the corner (rotate 8°, scale 1.3 → 1) and peels off after 1.2s. |
| **Burn-up** (expiry or delete) | Card desaturates, gets a `--grad-burn` edge, shrinks 0.85, and fades upward with 6–10 tiny ember particles. |
| **Unlock** | The PIN keypad's digits light up in sequence, the keypad splits open from the middle, and the Space zooms in from 0.96. |
| **Lockout** | Keypad shakes horizontally 3× (8px), turns `--redshift`, and a mono countdown appears. |
| **Idle drift** | In **Float view**, cards bob ±4px on independent 6–9s sine loops. |

---

## 8. Layout

### 8.1 Grid & spacing

- Spacing scale (px): `4, 8, 12, 16, 24, 32, 48, 64, 96, 128`.
- Max content width: `1280px`. Space view uses full width.
- Mobile gutter `16px`; desktop gutter `32px`.
- Breakpoints: `sm 640 · md 768 · lg 1024 · xl 1280`.

### 8.2 The Space (core screen)

```
┌──────────────────────────────────────────────────────────────────┐
│ ◉ REZORB   /  WORK-SWAP ●          ◎◎◎ 3 devices   24h  [L]  [S] │  ← Space header (accent-tinted)
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌────────────────────┐  ┌──────────────┐  ┌────────────────┐   │
│   │ TEXT · 2m · Laptop │  │ IMG · 5m     │  │ FILE · 1h      │   │  ← Drops (Grid view)
│   │ The function you   │  │ [thumbnail]  │  │ report.pdf     │   │
│   │ asked for is…      │  │              │  │ 2.4 MB         │   │
│   │      [ COPY ]      │  │ [COPY][SAVE] │  │ [ DOWNLOAD ]   │   │
│   └────────────────────┘  └──────────────┘  └────────────────┘   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  ⌁ Paste anything (Ctrl+V) · drop files · or type…     [ BEAM ↑ ]│  ← The Dock (sticky bottom)
└──────────────────────────────────────────────────────────────────┘
```

- **Header:** Space name (Unbounded, accent color), a live dot, Constellation
  (device avatars), default lifetime, lock button, settings.
- **Drops area:** newest first. Two views:
  - **Grid** (default): masonry, 1/2/3/4 columns at sm/md/lg/xl.
  - **Float**: the "floating space". Cards are placed loosely with slight
    rotation and idle drift. Desktop only, opt-in, and the setting is remembered
    per device.
- **The Dock:** sticky bottom bar on every screen size. It is a multi-line text
  input that grows to 8 lines, with an attach button and a Beam button. It is
  also the visible label for the page-wide paste and drop target.
- **Full-page drop zone:** dragging files anywhere over the Space shows a
  full-bleed overlay: `--void` @ 85%, a giant dashed Orb outline, and
  "**LET GO TO BEAM**" in mega type.

### 8.3 Launchpad (`/spaces`)

A utility screen, composed like one.

- **Title:** "Where to?" at page-title scale (not a poster headline).
- **Enter a Space** (left, the primary task): name input, the PIN keypad and Enter, in a single panel.
- **Your Spaces** (right): a plain ruled list. Each row has a 4px accent bar, the name, "N in orbit, last
  active X" (or "Empty"), and a text status ("Open here" or "PIN needed"). Clicking a row prefills the name.
  A final "New Space" row opens the create dialog. No thumbnails, no cards.

### 8.4 Landing (`/`)

Each section has its own composition on purpose:

1. **Hero:** the headline, one sentence, two buttons, one line of plain text for the terms, and the 3D planet.
2. **The product:** three real, working `DropCard`s as examples (copy works; nothing is sent anywhere).
3. **How it works:** a split. The heading sits on the left, the three numbered steps in a ruled list on the right.
4. **Who it's for:** four statements set large in the serif italic, two columns.
5. **Compared:** a split. The heading on the left, a ruled table on the right.
6. **Straight talk:** a narrow ruled list with a smaller heading, because it is fine print.
7. **Close:** one heading and one button, then the footer.

### 8.5 Other screens

- **Sign in / Sign up:** a split layout. On the left is a nebula panel with a
  mega wordmark. On the right is the form on `--abyss`. The left panel
  collapses on mobile.
- **Pair a device (`/pair`):** a giant 8-character code
  (`XKCD-7F2Q`, JetBrains Mono 600, 4rem) plus a QR code. Copy: "On a device
  that's already signed in, open **rezorb.app/link** and enter this code."
- **Settings:** tabs for Account, Devices, Appearance, and Lifetimes. The
  Devices tab lists each device with its name, last seen time, a
  "this device" sticker, and a Revoke button.

---

## 9. Components

Built on **shadcn/ui** primitives (Radix), restyled with the tokens above. Every
component lists its states.

### 9.1 `Button`

| Variant | Look |
|---------|------|
| `primary` | `--nebula` fill, `--void` text (Unbounded 800, uppercase, `--fs-small`), 2px `--void` border, hard shadow `4px 4px 0 --plasma`. Hover: translate(−2px,−2px), shadow 6px. Press: translate(2px,2px), shadow 0. |
| `secondary` | Transparent, 2px `--starlight` border, starlight text. Hover fills `--hull-2`. |
| `ghost` | Text only, `--moondust`. Hover `--starlight`. |
| `danger` | `--redshift` fill, `--void` text. Always requires confirmation. |
| `copy` | Special. Full-width on cargo cards, `--ink` fill on `--paper` cards, `--aurora` flash on success. |

Sizes: `sm 32px`, `md 40px`, `lg 52px`, `xl 64px` (landing CTA). Minimum touch target 44×44.

### 9.2 `DropCard` (the cargo)

Anatomy (top to bottom):
1. **Meta row:** kind sticker (`TEXT`, `CODE`, `LINK`, `IMG`, `FILE`), relative
   time, source device name, and a **burn ring** (a small circular countdown
   showing time left: `--aurora` → `--flare` under 1h → `--grad-burn` under 10m).
2. **Body:**
   - *Text:* on `--paper`, JetBrains Mono, clamped to 12 lines with "Show all".
     Whitespace is preserved and URLs are linkified. Content is always rendered
     as plain text, never as HTML.
   - *Code* (auto-detected): same, plus syntax highlighting (Shiki, a
     `github-light` palette tuned to `--paper`) and a language sticker.
   - *Link:* domain, favicon placeholder, and the full URL. No server-side
     unfurl in v1, for privacy.
   - *Image:* a thumbnail with `object-fit: contain` on a checkerboard
     `--hull`. Click opens the lightbox.
   - *File:* a large file-type icon, the filename (middle-truncated:
     `quarterly_re…port.pdf`), and the size in mono.
3. **Actions:** primary **Copy** (text/link/image) or **Download** (file), then
   a `⋯` menu with Pin, Extend lifetime, Download, and Delete.

States: `arriving`, `idle`, `hover` (lifts 2px, shadow grows), `copied`,
`pinned` (a pin sticker and a gold `--flare` border), `expiring` (<10m: the border
pulses `--flare`), `uploading` (a progress bar replaces the actions, showing %
and bytes), `failed` (`--redshift` border, Retry), `burning` (exit animation).

### 9.3 `Dock`

- Placeholder rotates every 4s through: "Paste anything (Ctrl+V)…", "Drop a file…",
  "Type a note to your other device…".
- `Enter` beams the text. `Shift+Enter` adds a newline. When the input is empty
  and unfocused, Ctrl/⌘+V anywhere on the page beams the clipboard immediately.
- Shows an **upload queue** above itself when files are in flight.
- On mobile, the attach button opens the native picker (camera, photos, files).

### 9.4 `PinKeypad`

- 6 slots, JetBrains Mono 2rem, each slot a `--hull` square with a 2px border.
- Desktop accepts keyboard digits and paste. Mobile shows a large 3×4 keypad
  (on-screen, `inputmode="numeric"` fallback).
- Shows remaining attempts after the first failure. In the lockout state the
  slots disable and a countdown appears.
- **Show/hide** toggle (an eye icon). The PIN is masked by default, using `●`
  glyphs in `--nebula`.

### 9.5 `Constellation` (presence)

A row of overlapping circular device avatars, each with a device-type icon
(laptop/phone/desktop) on a color derived from the device ID. Online devices
have a `--grad-ion` ring that slowly rotates; offline devices are dimmed. The
tooltip shows "Work laptop · online" or "Phone · seen 3h ago".

### 9.6 `BurnRing`

An SVG circle, 20px in cards and 28px in the header. The stroke dash shows the
fraction of lifetime left. The tooltip shows the absolute expiry time.

### 9.7 Toasts

These use the `sonner` library, pinned to the top center on desktop and the top
on mobile. Each is a sticker-style pill: an icon, then the message, then an
optional action. Types: `docked`, `copied`, `beamed`, `warning`, `error`.

### 9.8 Command palette (`⌘K` / `Ctrl+K`)

The palette offers these actions: switch Space, create Space, lock Space,
toggle Calm mode, toggle Float/Grid, copy latest Drop, and open settings. It uses
`cmdk`.

### 9.9 Empty states

- **Empty Space:** a large outline Orb with orbit lines and the headline "Nothing
  in orbit." Below it: "Paste anything (Ctrl/⌘+V) or drop a file. It'll appear
  on your other devices instantly." On desktop, also show a hint about the
  latest clipboard *type*, for example "You've got text on your clipboard". This
  only works if the clipboard is readable without prompting, otherwise the hint
  is hidden.
- **No Spaces yet:** "Launch your first Space", with a Create card that bounces
  gently.

---

## 10. Modes

### 10.1 Calm mode

Toggle it in the header (a moon icon; **hidden below 640px to give the Space title room**),
in Settings → Appearance, in the command palette, or with `Shift+C`. The setting is stored per
device, because you probably want it on your work laptop and off at home.

Calm mode:
- removes the Starfield, Nebula, Grain, ornaments, stickers on chrome, and Float view;
- replaces the gradients with flat `--abyss`;
- sets every motion duration to 0 except a 120ms opacity fade (this is the *only* animation
  allowed, and a test asserts it, including for a newly arrived Drop);
- keeps all functionality, keyboard shortcuts, and state indicators.

*Not built:* muting the accent to 40% saturation. Calm keeps the accent border but drops the
hard offset shadow, which already reads as much quieter.

### 10.2 Reduced motion

`prefers-reduced-motion: reduce` applies Calm mode's **motion** rules only. The
visual layers stay, but they hold still.

### 10.3 Themes

`Dark` (default), `Daylight`, and `System`. Stored per device.

---

## 11. Keyboard

| Key | Action |
|-----|--------|
| `Ctrl/⌘ + V` | Beam the clipboard into the current Space |
| `C` | Copy the latest Drop |
| `J` / `K` or `↓` / `↑` | Move focus between Drops |
| `Enter` / `Ctrl/⌘ + C` (on focused Drop) | Copy the focused Drop |
| `D` | Download the focused Drop |
| `Delete` / `Backspace` | Delete the focused Drop (with undo toast, 5s) |
| `P` | Pin/unpin the focused Drop |
| `/` | Focus the Dock |
| `Ctrl/⌘ + K` | Command palette |
| `Ctrl/⌘ + L` | Lock the Space |
| `Shift + C` | Toggle Calm mode |
| `?` | Shortcut cheat-sheet |

Single-key shortcuts are disabled while focus is in any input.

---

## 12. Accessibility

Target **WCAG 2.2 AA**.

- Every decorative layer (starfield, nebula, grain, ornaments) is
  `aria-hidden="true"` and `pointer-events: none`.
- Drops are a `role="feed"` (a `div`, not a `ul`; axe rejects `li` inside a feed) of `article`s. New arrivals are announced through a
  polite live region: "New text from Phone".
- Focus ring: `outline: 3px solid var(--ion); outline-offset: 3px` on all
  interactive elements. Never removed.
- The PIN keypad is a labelled group of inputs with an `aria-describedby`
  hint showing the attempts left.
- Color is never the only signal. Expiry has a ring *and* text, and presence
  has a ring *and* a label.
- Text resizes to 200% without loss. Cards reflow, and the Dock never covers
  focused content (`scroll-padding-bottom` matches the Dock height).
- The full flow (sign in, enter Space, paste, copy) must work keyboard-only and with
  VoiceOver/NVDA. This is a release gate (see `docs/TESTING.md`).

---

## 13. Implementation notes

- **Tokens** live in `src/styles/tokens.css` as CSS custom properties and are
  mapped into Tailwind v4 via `@theme inline`. Components never use raw hex.
- **Fonts** come through `next/font/google` in `src/app/fonts.ts` and are exposed
  as `--font-display`, `--font-accent`, `--font-ui`, and `--font-mono`.
- **Starfield** (`src/components/cosmos/Starfield.tsx`, ported from the legacy
  `AestheticsCanvas`): pauses when the tab is hidden, capped at 30 fps, ~1 star / 9,000 px²
  (60–260 stars), pointer parallax, and freezes on a still frame if frames stay slow for 3 s.
  Hidden in Calm mode; holds still under `prefers-reduced-motion`.
- **CSS layering matters.** `tokens.css` puts element defaults in `@layer base` and the
  `.panel/.hull/.cargo/.sticker/…` classes in `@layer components`, so Tailwind utilities
  (which come later) can override them (`outline-none`, `p-4`, …). Unlayered CSS silently
  beats every utility; an early version had this bug and needed `!important` hacks.
  Calm-mode overrides are deliberately `!important`.
- **Grain:** an inline SVG `feTurbulence` (baseFrequency 0.8, 2 octaves)
  rendered once as a CSS `background-image` data URI.
- **Performance budget for decoration:** ≤ 4ms main-thread time per frame on a
  mid-range laptop. If the frame rate drops below 40fps for 3 seconds, the app
  automatically falls back to static layers.
- **Decorative layers** (`Halftone`, the nebula, the grain) carry `.ornament` or sit in `.cosmos`, which Calm mode
  hides in one rule. They are `aria-hidden`. (Stickers, orbit lines, coordinates and the marquee were removed; see §17.)
- **Components are hand-written** (`Button`, `Input`/`Field`, `Dialog`) on the tokens rather than
  shadcn/ui: the look is too custom to be worth fighting a component library for.

---

## 14. Asset checklist

- [x] Orb glyph (inline SVG `Orb`, uses the tokens so it themes)
- [x] Wordmark (`Wordmark`: R-E-Z + Orb + R-B)
- [x] Favicon (`src/app/icon.svg`). *Not done:* `apple-icon.png`, `favicon.ico`
- [x] OG image (`opengraph-image.tsx`, `next/og`)
- [x] Halftone planet (CSS radial-gradient pattern, `Halftone`)
- [ ] Custom glyphs: Dock, Beam, Burn, Constellation, Pair (stock `lucide-react` icons are used)
- [x] Empty-state art (dashed spinning ring + orbit lines, in CSS/SVG)
- [ ] Stacked wordmark lockup and brand guidelines page

---

## 15. As built: notable differences from the spec above

| Spec | Built |
|------|-------|
| Cards: meta on one row | Two rows (kind sticker + burn ring, then "5m ago · Chrome on Windows") so nothing truncates on narrow cards |
| Dock: translucent panel | **Opaque** `--abyss` (translucent let card text bleed through on phones); the focus ring is drawn on the whole panel, not the textarea |
| Dock placeholder cycles Ctrl+V hints | Cycles on desktop; on touch devices it says "Type or paste a note…" / "Attach a photo or file…" |
| Space header: Calm toggle always visible | Hidden under 640px (see §10.1) |
| Float view: loose placement + drift | Wrapped cards with a deterministic per-card tilt and a 7 s bob; opt-in, desktop only |
| PIN keypad: 6 slots | 6 slots that grow to 8 as you type; on-screen 3×4 keypad only on `pointer: coarse` |
| Command palette | `cmdk`, with: copy latest, lock, Calm, view, settings, Launchpad, shortcuts |
| "Burn-up" particles / "slap" sticker | The card scales and fades with a grayscale shift on exit; the "COPIED" state is the button turning aurora. No ember particles yet |
| Unlock animation (keypad splits open) | Not built; the shake on a wrong PIN and the lockout countdown are |

---

## 16. Vogue in orbit: logo, art direction and the 3D hero

**Direction:** a fashion magazine shot in deep space. Planets are the models, lit with hard flash;
chrome and liquid metal; film grain; cut-out collage. It layers on top of §3–§5 and never overrides
them: content surfaces stay calm, and Calm mode removes all of it. Image prompts and the full asset
list are in [docs/ASSETS.md](docs/ASSETS.md).

### 16.1 Logo

| File (`public/brand/`) | Use |
|------------------------|-----|
| `rezorb-wordmark.svg` / `-ink` / `-mono` | Primary all-caps lockup, **REZ ● RB**: the orb is the O. Light art on Dark, ink art on Daylight, `currentColor` for single-colour use (inline only; `<img>` can't inherit colour) |
| `rezorb-editorial.svg` / `-ink` | The vogue lockup: a pink **italic serif "re"** (Instrument Serif) against heavy **ZORB** (Unbounded Black). Used in the landing header |
| `rezorb-mark.svg` / `-mono` | The orb and ring alone: favicon, app icon, loaders |
| `rezorb-stacked.svg` | Mark above the wordmark: posters, splash screens |

Text is **outlined** (no font dependency). Regenerate with `scripts/brand/build-logo.mjs`.
Clear space: the height of the orb on all sides. Don't recolour the ring (only `--plasma`), don't
outline the wordmark, don't put it on busy nebula without a `--void` plate.
In the app, `Wordmark` (`components/cosmos/Orb.tsx`) renders the right art for the theme and is sized
in `em` so `text-*` classes scale it.

### 16.2 The 3D hero (`HeroScene.tsx`, three.js via react-three-fiber)

All procedural, with no image or model downloads:

- **Planet:** a fragment-shader gas giant (fbm bands in pink / violet with cyan clouds), a Fresnel rim,
  and a hard specular "flash" highlight, lit from upper left.
- **Rings:** a banded shader ring on the planet's equator plus two thin **chrome tori** reflecting a
  studio environment baked in code (pink, cyan, white and violet softboxes via `PMREMGenerator`).
- **Glass Drop cards** orbit the planet, billboarded to the camera (a rounded-rect SDF shader with a
  tinted edge and three "text" lines).
- **Stars:** ~1,100 additive points that twinkle; a seeded generator keeps the sky identical each load.
- **Motion:** pointer parallax, scroll drift, and the planet sits right of the headline and below the
  amber "into" so the type stays legible.

**Gating** (`HeroBackdrop.tsx`): the scene mounts only if **not Calm**, **no `prefers-reduced-motion`**,
viewport ≥ 768 px, WebGL works, ≥ 4 cores, and (where reported) ≥ 4 GB device memory, and only after the
browser is idle. It pauses when off-screen or the tab is hidden, caps DPR at 1.5, and **falls back to
the flat halftone planet if frames average worse than 30 fps for ~2 s**. Otherwise (and always on
phones) the flat halftone planet is shown. Cost: one lazy chunk of about **239 KB gzipped**
(three.js + react-three-fiber), loaded on demand and not part of the page's initial JS.

### 16.3 Calm mode, tightened

Building the hero exposed that Calm hid the 2D starfield with CSS but left its animation loop running.
It now **unmounts** the starfield (and never mounts the 3D scene), so Calm means no animation work
at all, not just no visible animation. Tested in `e2e/hero.spec.ts`.

---

## 17. The restraint pass

A design audit found the first version leaned on decoration that said nothing. This section records what
was removed and the rules that replaced it. **When in doubt, remove it.**

### 17.1 What was removed, and why

| Removed | Why |
|---------|-----|
| **Fabricated telemetry** ("RA 16h 28m, DEC -39° 53′", derived from an ID) | It looked like data and was not. A meaningless metric is worse than none. |
| **Glassmorphism** (blurred translucent panels, headers, dialogs) | A default AI look, and it hurt legibility over the nebula. Surfaces are solid now. |
| **Rotated pill stickers** ("No install", "PIN locked", "Burns after 24h", "use case") | They repeated claims already on the page. The only labels left are functional (a Drop's kind, Pinned, This device) and they are square tags. |
| **Orbit lines, extra halftones, outline-echo headlines, the marquee** | Decoration with no job. |
| **Spinning rings** (empty state, presence, drop overlay) and the bouncing create button | Motion that carried no meaning. |
| **The 8rem "WHERE TO?" poster** on a form screen | Wrong scale for a utility page. |
| **Identical card grids** on the landing page and in the Launchpad | Replaced by ruled lists and varied compositions (§8.3, §8.4). |
| **Five competing radii** | One scale (§17.2). |

### 17.2 Tokens added or tightened

- **Radius scale:** `sm 3px` (tags), `md 6px` (controls), `lg 10px` (surfaces); `full` only for avatars and dots.
  Set in the Tailwind theme (`globals.css`), so `rounded-md` and `rounded-lg` mean the same everywhere.
- **Nebula opacity** 0.55 to 0.36. Ink black dominates; colour is for the product (cards, primary action).
- **Display face** (Unbounded) is for page titles, the primary button, and the large statements. UI labels,
  row titles and table text use the UI face.
- **Hard offset shadow** reduced from 6px to 5px (7px on hover). It stays the signature of a Drop.

### 17.3 Fixes the audit surfaced

- The auth panel's mark sat **behind** the headline and made it illegible. It now has its own region in a
  flex column, so it cannot collide at any height.
- The syntax highlighter's keyword red measured 4.46:1 on the paper card (AA needs 4.5). It now uses the
  `github-light-high-contrast` theme. The landing examples are scanned in both themes and a highlighted
  code Drop is scanned in the Space, so this cannot regress unnoticed.

### 17.4 What was kept, deliberately

The hard-shadow paper cards, the PIN keypad, the editorial wordmark, the 3D planet, Calm mode, and the
Dark and Daylight themes: they are specific to this product and carry real information or identity.

