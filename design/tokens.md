# E-Library AI tokens

Shared values. Web maps these to CSS variables. Android maps them in `theme/tokens.ts`. Light is the default. The theme toggle switches to dark.

## Color

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#F6F6F5` | `#14161D` | Page background |
| `surface` | `#FFFFFF` | `#1C1F28` | Panels, cards, inputs, drawer, tab bar |
| `ink` | `#1F2330` | `#ECECEA` | Headings and body |
| `muted` | `#63646B` | `#A3A3A0` | Captions, metadata, placeholders |
| `line` | `#E4E4E2` | `#2E313C` | 1px borders and dividers |
| `primary` | `#20232F` | `#ECECEA` | Main buttons, selected chip, avatar |
| `primary` hover / pressed | `#343848` | `#FFFFFF` | Primary pressed or hovered |
| `on-primary` | `#FFFFFF` | `#14161D` | Text and icons on primary |
| `accent` | `#E2504F` | `#E2504F` | Active rail or tab item, progress bars |
| `atext` | `#C23B3E` | `#F0807F` | Accent as text, links, errors, counters |

## Shadow

| Token | Light | Dark |
|---|---|---|
| Cover | `0 4px 12px rgba(31,35,48,.2)` | `0 4px 12px rgba(0,0,0,.5)` |
| Overlay | `0 8px 32px rgba(31,35,48,.2)` | `0 8px 32px rgba(0,0,0,.6)` |

Dark covers also draw a 1px hairline: `0 0 0 1px rgba(236,236,234,.12)`.

## Type

Inter 400 and 500 for UI. Page titles: Inter 600, 28 / 36. Newsreader is for books only: cover titles and the book detail title. No negative letter-spacing.

| Role | Size / line-height |
|---|---|
| Caption | 12 / 16 |
| Body small, buttons | 14 / 20 |
| Body | 16 / 1.5 |
| Title small | 20 / 28 |
| Title | 24 / 32 |
| Title large | 32 / 40 |
| Display | 40 / 46 |
| Display large | 56 / 60 |

## Space

4px base. Use only 4, 8, 12, 16, 24, 32, 48, 64.

## Radius

| Value | Use |
|---|---|
| 999 | Buttons, chips, search, avatar, rail and tab items |
| 12 | Panels, cards, inputs, notices |
| 4 | Covers, skeletons |

## Cover placeholder palette

Dark grounds, white text: `#8C3B3F`, `#2F4A43`, `#1F3A57`, `#A24A34`, `#56704F`, `#3A2430`, `#6B5B7A`, `#7A6A4F`.

Light grounds, ink text: `#D9C58A`, `#CFC9B8`, `#C9D3D6`, `#E4D3B4`.

Pick by a stable hash of the book id.

## Motion

Web: CSS custom properties in `globals.css` and numbers in `lib/motion.ts`. Android: `theme/motion.ts`.

| Token | Value | Use |
|---|---|---|
| `ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Entering, responding |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Leaving |
| `ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Moving from A to B |
| press | 100ms | Scale to 0.97 (cards 0.98) |
| hover | 150ms | Hover, icon crossfades |
| menu / exit | 180 / 145ms | Menus, popovers, tooltips |
| panel / exit | 250 / 200ms | Dialogs, toasts, bottom sheet |
| drawer / exit | 300 / 240ms | Side drawer |
| page | 250ms | Page and list entrances |
| move | 220ms | Sliding indicators |
| confirm | 320ms | One-shot success pulse |
| reveal | 400ms | Mask reveals |
| stagger | 30ms per item, capped at 12 | Lists and grids |

Full rules: `docs/prompts/motion-and-empty-states.md`.
