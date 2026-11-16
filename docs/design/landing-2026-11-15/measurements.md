# Measurements (round 1, before the critic; round 2 notes at the end)

Taken from `shots/final/light/1440-light.png` and `390-light.png` with `edges.mjs`, in CSS px.

## Desktop, 1440 x 900

Left text edge is 152. Ink edges on that line:

| Element | Left ink edge |
|---|---|
| Wordmark | 152 |
| H1 "Free public-domain books" | 153 |
| First line "Call me Ishmael." (C bowl) | 154 |
| Read button | 152 |
| First spine | 152 |

Vertical stack down the left edge:

| Element | Top to bottom | Gap below |
|---|---|---|
| H1 | 106 to 125 | 13.5 |
| Sub line | 138.5 to 153 | 191 (the stage; sized to the tallest of the 16 lines, so the shelf never moves) |
| First line, ink | 344 to 455.5 | 71.5 |
| Read button | 527 to 571 | 70 |
| Shelf, tallest spine to baseline | 641 to 867 | to the next section |

Line to button (71.5) and button to shelf (70) are the same on purpose. The shelf baseline sits at 867 of 900, so the whole hero is on the first screen. Right edges: search field and last spine both end at 1288.

## Phone, 390 x 844

Hero fits one screen. First line is two lines at 66px, 19px between lines. Shelf scrolls sideways; the raised book is centered on load and on every change.

## Motion (frame sheets in `shots/final/motion/`)

| Sheet | What it shows |
|---|---|
| entrance | Load. Words set one at a time from 150ms ("Call", "me", "Ishmael." at about 110ms apart), spines rise from 300ms with a 28ms stagger, settled by about 1000ms. |
| pick-short | A spine is chosen. Old line is gone by 150ms, new words set in over about 500ms, Read button and author cross-fade 160ms behind the line. |
| interrupt | A second spine is chosen 150ms into the first change. The first line fades from where it is, with no jump to full opacity. |
| pick-phone | The same on a 390 phone. |

Disney principles in use: staging (one line owns the screen), anticipation (a spine dips 3px under the pointer before it rises), slow in and slow out (ease-out curves from the system tokens), follow-through and overlap (words settle one after another, the meta row trails the line by 160ms, the raised spine overshoots by about 1px), timing (exit 180ms, entrance up to 1.1s, exits are always faster than entrances), exaggeration (148px next to 14px).

## Weight

Newsreader now loads the variable `opsz` and `wght` axes for the latin subset: 132 KB (woff2). It was a 400-only file before. `latin-ext` was dropped (87 KB) by printing "Sun Tzu" without the breve. No images are loaded by the hero.

## Round 2 (after the critic)

The landing container is 1360 wide (was 1200), so at 1440 the left text edge is 72. The first line is the same size at 1440 and grows to 176px on wide screens. The empty band above a one-line sentence is about 160px at 1440x900 (was 191); a three-line sentence closes it. The shelf baseline sits at 851 of 900.

Dark theme, 1440 and 390, whole page: `shots/final/full-dark/`. Stills at all seven widths in both themes: `shots/final/light/` and `shots/final/dark/`. Motion sheets: `shots/final/motion/` (entrance, pick, interrupt). The Open button now stays mounted and only its text fades in, over 260ms from the first frame.

Not captured: landscape phone, 2560 wide, a real device. The load-trigger capture sometimes logs a hydration warning right after a file edit; it did not appear in the browser pane or in plain captures, so it is treated as dev-server noise, not confirmed.

## Round 3 (after the bug report)

Gap from the sub line to the top of the first line, box to box, with Moby-Dick chosen (`sweep.mjs`): 1920x1080 52px, 1440x900 77px, 1400x825 76px, 1366x768 65px, 1280x720 62px, 1024x768 54px, 768x1024 52px, 390x844 74px, 360x740 85px. Across all 16 lines the range is 16 to 142px; the largest gaps belong to the shortest sentences. Hero bottom and the next section: 1440x900 816 and 880, 1366x768 702 and 766, 390x844 809 and 873.
