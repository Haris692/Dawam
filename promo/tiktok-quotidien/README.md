# « Au quotidien avec Dawam » : 10 TikTok

Une suite des vidéos où des personnages vivent un moment du quotidien et utilisent l'appli. Cette fois avec des profils variés : un jeune qui joue à la console, des pères de famille, un livreur, un footeux, un grand-père et son petit-fils, un étudiant, des frères qui se motivent pour le Qiyam, un salarié au bureau.

Format : vertical 1080×1920, 60 i/s, 16 à 17 s, **sans son** (ajoute un son tendance ou un nashid dans TikTok). Les textes restent entre y≈250 et y≈1450, hors de l'interface TikTok. Les écrans montrés sont ceux de l'appli, recréés avec ses vrais textes (`../lib/ecrans.js`). Chaque vidéo finit sur la carte Dawam « Lien en bio 🤍 ».

## Calendrier (2 par jour : matin et soir)

| Quand | Fichier | Qui | Ce qu'on voit | Légende proposée |
|---|---|---|---|---|
| Jeu. soir | `dawam-q01-joueur.mp4` | Bilal, 19 ans | En pleine partie, le rappel du soir arrive : pause, invocations du soir (compteurs jusqu'au ✓), il reprend sa partie. | « La game peut attendre 3 minutes 😌🤍 » #islam #muslimtiktok #gaming #rappel #constance |
| Ven. matin | `dawam-q02-jumua.mp4` | Karim & Adam, 7 ans | À la mosquée le vendredi : l'accueil affiche « Jumuʿa — lis Al-Kahf », lecture d'Al-Kahf, son fils lit avec lui. | « Chaque vendredi, Al-Kahf avec mon fils 🤍 Petit, mais constant. » #jumuamubarak #alkahf #pereetfils #muslimtiktok #islam |
| Ven. soir | `dawam-q03-livreur.mp4` | Sofiane, 26 ans, livreur | 15 min de pause sur un banc : séance de dhikr réglée à 15 min, Istighfar, puis nouvelle commande. | « Avant c'était scroll, maintenant c'est dhikr 📿 » #livreur #dhikr #muslimtiktok #rappel #islam |
| Sam. matin | `dawam-q04-samedi.mp4` | Mehdi, Lina (9 ans), Youssef (5 ans) | Petit-déj : papa crée le groupe « Famille », tout le monde tape, objectif 100 Salawat atteint. | « Le samedi matin, on remplit le groupe Famille avant de finir le msemen 😄🤍 » #dhikr #famillemusulmane #salawat #muslimtiktok #islam |
| Sam. soir | `dawam-q05-footeux.mp4` | Ilyes, 21 ans | Après le five : série de 12 jours, rien fait aujourd'hui → 100 Salawat sur le banc → 13 jours. | « 13 jours de suite, on lâche rien 🔥 » #football #salawat #muslimtiktok #constance #islam |
| Dim. matin | `dawam-q06-papi.mp4` | Hadj Ahmed, 72 ans & Naïm, 13 ans | Le petit-fils installe l'appli à son grand-père, qui connaît déjà ses invocations par cœur… et une semaine plus tard lui montre sa série. | « Je pensais lui apprendre un truc… c'est lui qui m'a appris la constance 👴🏽🤍 » #grandpere #adhkar #muslimtiktok #famille #islam |
| Dim. soir | `dawam-q07-etudiant.mp4` | Rayan, 22 ans | Veille de partiel à 23 h 40 : rappel « Avant de dormir », il ferme le PC, convenances du sommeil, il s'endort apaisé. | « Le partiel, c'est demain. Le cœur, c'est maintenant 🤍 » #partiel #etudiant #muslimtiktok #routinedusoir #islam |
| Lun. matin | `dawam-q08-voiture.mp4` | Karim, en semaine | Garé devant l'école, moteur coupé : adhkar du matin avant le travail, puis il démarre. | « Déposer le petit, 5 minutes d'adhkar, et c'est parti ☀️ (garé, moteur coupé 😉) » #adhkar #routinedumatin #papamusulman #muslimtiktok #islam |
| Lun. soir | `dawam-q09-qiyam.mp4` | Yanis, 24 ans, et ses frères | 4 h 47 : groupe Qiyam « Les frères », il coche « J'ai fait le Qiyam cette nuit », Sofiane suit juste après. | « Quand Bilal a déjà coché à 03:58, t'as plus d'excuse 😅 » #qiyam #freres #muslimtiktok #nuit #islam |
| Mar. matin | `dawam-q10-bureau.mp4` | Nassim, 30 ans, et Thomas | Pause de midi au bureau : il coche 2 actions, son collègue curieux demande le lien. | « Pause de midi = 2 petits actes cochés 🤍 Ton collègue t'a déjà grillé ? 👀 » #muslimtiktok #bureau #rappel #constance #islam |

Les personnages reviennent d'une vidéo à l'autre (Karim et Adam, les frères Bilal, Ilyes et Sofiane dans le groupe Qiyam) : ça donne envie de suivre la série. Les chiffres affichés (séries, jours actifs, heures) sont des exemples pour l'histoire, pas des statistiques.

## Fichiers

- `qNN-*.html` : les compositions (fonction du temps `render(t)`), décors écrits dans chaque page.
- `../lib/casting.js` : les personnages de la série ; `../personnages/planche2.html` : leur planche.
- `../lib/ecrans.js`, `../lib/ecrans.css` : écrans de l'appli recréés (accueil, invocations, séance de dhikr, groupes, Qiyam, profil, compteur, lecture du Coran).
- `../lib/cartoon.js` : le rig (nouveau : sweat à capuche, veste de survêtement, casquette, casque, barbe naissante).

## Réexporter

```bash
cd promo
node render.mjs tiktok-quotidien/q01-joueur.html                 # → tiktok-quotidien/dawam-q01-joueur.mp4
node render.mjs tiktok-quotidien/q01-joueur.html --stills 2,8,13 # images de contrôle dans tiktok-quotidien/stills
```
