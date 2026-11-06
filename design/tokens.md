# E-Library AI tokens

Shared values. Web maps these to CSS variables. Android maps them in `theme/tokens.ts`. Light is the shipped theme. Dark values exist so a later toggle can switch them. No toggle is built.

## Color

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#F2F0E6` | `#14161D` | Page background |
| `surface` | `#FBFAF5` | `#1C1F28` | Panels, cards, inputs, drawer, tab bar |
| `ink` | `#1F2330` | `#ECE9DD` | Headings and body |
| `muted` | `#6F6E66` | `#A3A299` | Captions, metadata, placeholders |
| `line` | `#E2DFD2` | `#2E313C` | 1px borders and dividers |
| `primary` | `#20232F` | `#ECE9DD` | Main buttons, selected chip, avatar |
| `primary` hover / pressed | `#343848` | `#FFFFFF` | Primary pressed or hovered |
| `on-primary` | `#FFFFFF` | `#14161D` | Text and icons on primary |
| `accent` | `#E2504F` | `#E2504F` | Active rail or tab item, progress bars |
| `atext` | `#C23B3E` | `#F0807F` | Accent as text, links, errors, counters |

## Shadow

| Token | Light | Dark |
|---|---|---|
| Cover | `0 4px 12px rgba(31,35,48,.2)` | `0 4px 12px rgba(0,0,0,.5)` |
| Overlay | `0 8px 32px rgba(31,35,48,.2)` | `0 8px 32px rgba(0,0,0,.6)` |

Dark covers also draw a 1px hairline: `0 0 0 1px rgba(236,233,221,.12)`.

## Type

Inter 400 and 500 for UI. Newsreader 300 and 400 for headings and cover titles. Headings: Newsreader 300, letter-spacing `-0.01em`.

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
