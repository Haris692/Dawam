# Les personnages de Dawam

Style cartoon rond et mignon : grosse tête, contours sombres, ombrage en aplat, grands yeux brillants, sourcils, sourire et joues roses, dans l'esprit des dessins animés musulmans pour enfants.

- `planche-personnages.png` : la planche de référence (Yacine, Samira, Inès et deux voyageurs du métro, avec plusieurs expressions).
- `planche.html` : sa source. Pour la réexporter : `cd promo && node render.mjs personnages/planche.html --stills 0.5` (image dans `personnages/stills`).

Les personnages viennent de `../lib/cartoon.js`. Chaque pose se règle image par image : position des mains (les coudes suivent par cinématique inverse), inclinaison du corps et de la tête, regard, paupières, sourcils, bouche, clignement automatique, lumière de l'écran sur le visage. Ils jouent dans les vidéos « Une journée avec Dawam » (`../quotidien/`) et dans les TikTok 01, 04 et 08 (`../tiktok/`), où la lanterne du logo a aussi un visage.

Expressions disponibles :
- yeux ouverts, mi-clos (encore endormi), fermés (sommeil, invocation), heureux (^^), écarquillés ;
- bouche : sourire, petit sourire, neutre, ondulée (contrarié), triste, « o » (surprise), grand sourire ouvert, bâillement ;
- sourcils levés ou inquiets, joues roses plus ou moins marquées.
