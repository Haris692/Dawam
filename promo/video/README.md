# Vidéo de présentation Dawam

Vidéo motion design verticale (1080×1920, 9:16, 60 i/s, 36 s) pour les Reels, TikTok, Shorts et les stories.

- `dawam-presentation.mp4` : la vidéo exportée (piste audio silencieuse, prête pour ajouter une voix off ou un nashid).
- `dawam-cover.jpg` : image de couverture (dernière image de la vidéo).
- `index.html` : la composition. Toute l'animation est une fonction du temps (`renderAt(t)`).
- `../render.mjs` : l'export image par image (Chromium + ffmpeg), commun à toutes les vidéos.
- `../assets/` : captures iPhone (barre d'état nettoyée), emblème de l'icône, polices de l'app (Plus Jakarta Sans, Amiri, Lora — licence SIL OFL 1.1, voir `assets/fonts/OFL-*.txt`).

## Déroulé

| Temps | Scène |
|---|---|
| 0–5 s | Hadith : « أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ » (al-Bukhari et Muslim), le mot أَدْوَمُهَا devient دَوَام |
| 5–8 s | Logo : emblème, « Dawam », « Petit, mais constant. » |
| 8–13 s | « À chaque moment, son action. » : cadran aube / journée / soir / nuit |
| 13–17 s | « Un parcours fait pour toi. » : écran Parcours, notification de l'aube, +20 XP |
| 17–22 s | Invocations du matin, puis séance guidée de dhikr |
| 22–27 s | « Suis ta constance. » : statistiques, grille des 30 jours, badge débloqué |
| 27–31 s | « Avance ensemble. » : dhikr collectif en temps réel jusqu'à l'objectif |
| 31–36 s | Fin : logo, slogan, « iPhone · Android · Web », trois écrans |

## Prévisualiser

```bash
cd promo
npx serve .            # ou : python3 -m http.server
```

Ouvrir `http://localhost:3000/video/` (ou le port affiché). Espace = pause, ←/→ = ±1 s, `?t=12.5` = image fixe à 12,5 s.

## Réexporter

Prérequis : Node 18+, ffmpeg et Playwright (`npm i -D playwright && npx playwright install chromium`).

```bash
cd promo
node render.mjs video/index.html                         # → video/dawam-presentation.mp4
node render.mjs video/index.html --fps 30 --out a.mp4    # autre cadence / autre fichier
node render.mjs video/index.html --stills 3.9,15.4,25.7  # images PNG de contrôle dans video/stills
```

Les textes se modifient directement dans `index.html` (sections S1 à S8) ; le minutage est dans les fonctions `s1()` … `s8()`.
