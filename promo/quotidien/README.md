# « Une journée avec Dawam » — série de 4 vidéos

Quatre vidéos verticales (1080×1920, 60 i/s, ~20 s) qui montrent l'app dans des moments du quotidien, avec une même famille : Yacine, Samira et leur fille Inès. Les personnages sont dessinés en **style cartoon, ronds et expressifs** (grands yeux, sourires, joues roses), dans l'esprit des dessins animés musulmans pour enfants ; la planche de référence est dans `../personnages/`. Les textes affichés dans l'app (rappels, étapes, séance guidée) sont ceux de Dawam.

| Fichier | Moment | Ce qu'on voit |
|---|---|---|
| `dawam-aube.mp4` (21 s) | 5 h 52 | Yacine dort, son téléphone s'allume sous son menton : « La séance de l'aube t'attend ». Il se redresse, surpris puis souriant, et fait sa séance après le Fajr sur son tapis, le soleil se levant derrière lui : adhkar du matin (le compteur descend jusqu'au ✓), séance validée +20 XP, 8 jours de suite, puis une invocation les yeux fermés. |
| `dawam-trajet.mp4` (20 s) | 8 h 10 | Inès, dans le métro, fait défiler son téléphone sans conviction : « Et si ce trajet comptait ? » Écran Dhikr → séance guidée (choix des durées) → compte à rebours Istighfar puis Salawat. Arrivée en station, ravie (son voisin baisse son journal et sourit), 15 min de dhikr validées. |
| `dawam-famille.mp4` (19 s) | 12 h 45 | Samira à la maison, Yacine au bureau, Inès à la fac : chaque « +1 » rejoint la carte du groupe en temps réel jusqu'à « Ma sha Allah ! Objectif atteint — 1 000 Salawat » : les trois lèvent le poing en souriant. |
| `dawam-nuit.mp4` (21 s) | 22 h 40 | Samira reçoit « Avant de dormir — tes invocations du soir t'attendent », suit les 5 convenances du sommeil (bilan, tawba, ablutions, invocations, côté droit), journée complète, lumière éteinte ; elle s'endort sur le côté droit en souriant : « Demain, on recommence. » |

Chaque vidéo s'ouvre sur « Une journée avec Dawam · n/4 » et se termine sur la carte Dawam (logo, « Petit, mais constant. », iPhone · Android · Web). Chaque vidéo existe en deux versions : sans voix (`dawam-*.mp4`, piste silencieuse, pour y poser un nashid) et avec la voix off (`dawam-*-voix.mp4`). Textes et voix : voir `../voix-off/`.

## Fichiers

- `aube.html`, `trajet.html`, `famille.html`, `nuit.html` : les compositions (fonction du temps `render(t)`).
- `../lib/` : moteur commun (`engine.js`), personnages cartoon avec expressions, posés par cinématique inverse (`cartoon.js`), décors SVG (`decor.js`), styles (`base.css`).

## Prévisualiser / réexporter

```bash
cd promo
npx serve .                                  # puis ouvrir /quotidien/aube.html (Espace = pause, ←/→ = ±1 s, ?t=8 = image fixe)
node render.mjs quotidien/aube.html          # → quotidien/dawam-aube.mp4
node render.mjs quotidien/nuit.html --stills 6,12,16   # images de contrôle dans quotidien/stills
```
