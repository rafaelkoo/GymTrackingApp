# FitTrack

Personal workout tracker (PWA) with 3D form demos. Live at https://rafaelkoo.github.io/GymTrackingApp/

## What it does
- **Today**: log sets (kg, reps) against last session, rest timer, daily habits, save the workout
- **Plan**: weekly split editor: drag to reorder, change sets/reps/minutes, add from the library
- **Progress**: weight trend per exercise with PR markers, weekly muscle coverage, daily points, body weight
- **Library**: 93 exercises, each with an animated 3D demo, phase-by-phase cues and common mistakes
- **Me**: body stats, BMI/TDEE/protein/water, rest-timer default, backup export/import

## Structure
No build step; plain ES modules served by GitHub Pages.

| File | Role |
|---|---|
| `index.html` | page shell |
| `css/app.css` | design tokens and styles |
| `js/main.js` | boot, service worker registration |
| `js/state.js` | saved data, scoring, weekly reset, backup |
| `js/data.js` | exercises, goals, default plan |
| `js/ui.js` | screens and interactions |
| `js/viewer3d.js` | Three.js mannequin with two-bone IK |
| `js/moves.js` | keyframes, cues and mistakes for each movement |
| `sw.js` | offline cache |

## Saved data
Everything is in `localStorage` under `ft_` keys. v2 keeps every v1 key and shape unchanged and only adds
`ft_bodyLog`, `ft_restSec`, `ft_lastBackup` and `ft_logsWeek`, so existing data loads as-is.
Use **Me → Export** before switching phones or clearing browser data.
