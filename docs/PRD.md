# Rezorb — Product Requirements (v1)

Status: **v1 built (not deployed)** · Owner: founder · Last updated: 2026-11-20

> **Implementation status:** every v1 user story in §6 is implemented and exercised by tests
> against local services, except where [ROADMAP.md](ROADMAP.md) marks a piece 🟡 (written, not
> yet run against the real service: email verification, magic link, passkeys, Ably, R2) or ⬜
> (account deletion, data export, CSP, CI). Where the build chose differently from this
> document, [ARCHITECTURE.md §9](ARCHITECTURE.md#9-decisions-that-departed-from-the-original-plan)
> says so.

## 1. Problem

People with more than one device (for example a work laptop and a personal
laptop) regularly need to move *their own* small things between them: a snippet
of text, an AI answer, a screenshot, a photo, a PDF. Today they:

- email it to themselves, or
- send it to themselves in Teams/Slack/WhatsApp, or
- use a USB stick.

Every one of these is slow (5–10 steps), clutters a real inbox or chat, and
often doesn't work. You can't install an app on a locked-down work machine, and
the two devices may not share an account or ecosystem (Windows ↔ Mac ↔ Android).

## 2. Solution

**Rezorb** is a web app that gives you private, PIN-locked **Spaces**. Open the
same Space on two devices. **Paste on one, and it appears on the other
instantly**, ready to copy or download. There is nothing to install, and the
only other thing you need is a browser.

## 3. Positioning

> For people who move their own stuff between devices that don't share an
> ecosystem, Rezorb is a browser-only shared clipboard that makes "paste here,
> copy there" take two keystrokes. Unlike emailing yourself, there's no inbox
> clutter, it works instantly, and it handles text, images, and files in one place.

### 3.1 Alternatives and why Rezorb wins

| Alternative | Gap Rezorb fills |
|-------------|------------------|
| Email / Teams to self | 5–10 steps, clutters real inboxes, slow for big files |
| Apple Universal Clipboard, Phone Link, KDE Connect | Requires one ecosystem and installed software |
| PairDrop / Snapdrop | Same-network or peer-to-peer only, both devices must be open at the same moment, nothing persists |
| Wormhole / Send Anywhere | One file per link, no running "space", awkward for text |
| Telegram/WhatsApp "Saved Messages" | Often blocked at work, mixes with personal chats, poor for files on desktop web |

### 3.2 Explicit stance on workplace use

Rezorb is positioned as **personal device sync**. We do **not** market it as a
way around employer controls. The UI shows a one-time notice the first time a
Device signs in, saying that your organization's data policies still apply.
End-to-end encryption (v2) is a privacy feature, not an evasion feature.

## 4. Users

- **Primary: "Two-laptop professional".** Has a work laptop (locked-down, no
  installs) and a personal laptop and/or phone. Moves text, AI output, and
  screenshots several times a day.
- **Secondary: "Phone-to-desktop".** Takes photos or screenshots on a phone and
  needs them on a desktop that isn't in the same ecosystem.

## 5. Decisions locked for v1

From the founder review on 2026-11-20:

| # | Decision |
|---|----------|
| D1 | **Self-transfer only.** A Space belongs to one User. No sharing with other people in v1. |
| D2 | **Personal-sync positioning** plus a policy notice. E2E encryption is planned for v2 (the data model is ready for it in v1). |
| D3 | **Drops auto-expire.** Lifetimes are 1h, 24h (default), or 7d. Manual delete, plus "Pin" to keep up to 7d. |
| D4 | **Name: Rezorb**, with short URLs `rezorb.app/s/{slug}` and a space-themed maximalist UI ([DESIGN.md](../DESIGN.md)). |
| D5 | **Full-stack Next.js on Vercel** (see [ARCHITECTURE.md](ARCHITECTURE.md) and the ADRs). |

### 5.1 Defaults chosen without explicit founder input (please confirm)

| # | Default | Alternative considered |
|---|---------|------------------------|
| A1 | Entering a Space requires being **signed in *and*** typing **name + PIN**. The PIN acts as a second lock in case a session is left open on a shared or work machine. | PIN only, with no account (anonymous rooms) |
| A2 | PIN is **6–8 digits**, chosen by the user. Weak PINs (`123456`, all the same digit) are rejected. | 4 digits; alphanumeric passphrase |
| A3 | **Max file size 50 MB**, and **1 GB total in orbit** per User on the free tier. | 100 MB / 250 MB |
| A4 | **Up to 10 Spaces** per User. | Unlimited |
| A5 | Sign-in methods: **email + password, magic link, passkeys, and device pairing** (code/QR). | OAuth (Google/GitHub). Deferred because a work machine is often signed into a *work* Google account. |
| A6 | A **Space grant expires after 12h idle** on a Device (the Space auto-locks). | Never auto-lock; 1h |

## 6. User stories (v1)

### Account & devices
1. As a new user, I can sign up with email + password and verify my email.
2. As a user, I can sign in with a magic link or a passkey.
3. As a user on a machine where I don't want to type my password, I can open
   `/pair`, see a code + QR, and approve it from my phone or other laptop.
4. As a user, I can see all my Devices, rename them, and revoke any of them.
   Revoking a Device instantly locks every Space on it.
5. As a user, I can sign out everywhere.

### Spaces
6. As a user, I can create a Space with a name, a PIN, an accent color, and a
   default lifetime.
7. As a user, I can enter a Space by typing its name + PIN. The Launchpad lets me
   click a Space to prefill its name.
8. After 5 wrong PINs, the Space is sealed for 15 minutes (doubling on each
   repeat, up to 24h), and my other Devices are notified.
9. As a user, I can lock a Space on this Device, and change a Space's PIN.
   Changing the PIN locks it on all Devices.
10. As a user, I can rename, recolor, change the default lifetime of, or delete a Space.

### Drops
11. In an unlocked Space, pressing Ctrl/⌘+V anywhere beams my clipboard in
    (text, an image, or files).
12. I can type a note in the Dock and press Enter to beam it.
13. I can drag files anywhere onto the Space to upload them, and see progress.
14. A Drop beamed on one Device appears on every other Device in that Space
    within 1 second (p95), without a refresh.
15. I can copy a text, code, or link Drop with one click or the `C` key. I can copy
    an image Drop to my clipboard as an image (where the browser supports it).
16. I can download any image or file Drop.
17. I can see each Drop's kind, source Device, age, and time left.
18. I can delete a Drop (with a 5s undo), pin it, or extend its lifetime.
19. Expired Drops disappear from every Device and their files are permanently
    deleted.
20. I can see which of my Devices are in the Space right now.

### Experience
21. I can turn on Calm mode per Device.
22. I can use the whole core flow with only the keyboard.
23. The app works on current Chrome, Edge, Firefox, and Safari, desktop and mobile.

## 7. Non-goals for v1

- Sharing a Space with other people, or public share links (wormhole-style). Planned for v2.
- End-to-end encryption. Planned for v2, and the schema reserves fields for it.
- Background clipboard sync. Browsers don't allow it, and it would need an
  install, which is against the product's core promise.
- Native apps or browser extensions.
- Server-side link unfurling or preview.
- Virus scanning. This is acceptable only because v1 is self-only. **It must be
  added before any sharing feature ships.**

## 8. Success metrics

| Metric | Target (90 days after launch) |
|--------|-------------------------------|
| **Time-to-catch**: paste on A to Drop visible on B | p95 < 1s |
| **Activation**: new users who beam on one Device and catch on another within 24h | ≥ 50% |
| **Weekly active catchers**: users who catch ≥ 3 Drops/week | 30% of WAU |
| **D30 retention** | ≥ 25% |
| Wrong-PIN lockouts per 1k unlock attempts | Monitored (spikes mean an attack or a UX problem) |

## 9. Limits (free tier, v1)

| Limit | Value |
|-------|-------|
| Spaces per User | 10 |
| Max text Drop | 1 MB (UTF-8) |
| Max file/image Drop | 50 MB |
| Storage in orbit per User | 1 GB |
| Drops per Space (visible) | 500 (oldest unpinned are burned first) |
| Lifetimes | 1h · 24h · 7d |
| Devices per User | 10 |

## 10. Open questions (v2+)

1. Pricing: will there be a paid tier with bigger files, longer lifetimes, and more storage?
2. Share links: a single Drop shared via an expiring URL, like wormhole. What about abuse handling?
3. Can a Space be shared with a second User (for example a partner)?
4. E2E: is the key derived from the PIN, or a separate passphrase? (See ADR-0007.)
5. A PWA with the **Web Share Target** API on Android, so you can share from the
   phone's share sheet straight into a Space.
