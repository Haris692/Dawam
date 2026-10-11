# Voix off des vidéos Dawam

Une narratrice au ton posé et rassurant (débit ralenti, légère chaleur, une pointe de « pièce »), calée sur les scènes de chaque vidéo.

**Fichiers produits**
- Vidéos avec voix : `../quotidien/dawam-{aube,trajet,famille,nuit}-voix.mp4` et `../video/dawam-presentation-voix.mp4`. Les versions sans voix restent à côté, pour y ajouter un nashid si besoin.
- Pistes voix seules : `{aube,trajet,famille,nuit,presentation}/voix-off-*.m4a`, normalisées à -16 LUFS, à poser sous un autre montage.
- `generer.py` : synthèse, placement au timing des scènes, traitement, mixage. Les textes et les timings se trouvent en tête du fichier.

Pour les mots arabes que la synthèse prononce mal, la voix passe par le sens (« le repentir », « qu'Allah te bénisse », « la prière de l'aube »). L'écran, lui, garde les termes de l'app (tawba, barakAllahu fik, Fajr). Le mot dhikr est écrit « zikr » pour le moteur. Chaque phrase a été relue par une reconnaissance vocale (Whisper) pour contrôler la prononciation.

## Textes

**1. L'aube** (21 s)
| | |
|---|---|
| 0,6 s | Cinq heures cinquante-deux. Dehors, tout est encore calme. |
| 4,2 s | Dawam te rappelle, en douceur, ce qui compte vraiment. |
| 7,8 s | Après la prière de l'aube, quelques minutes : les invocations du matin, un peu de Coran. |
| 13,9 s | Un petit pas, chaque matin. |
| 15,8 s | Ta journée commence par le rappel. |
| 18,5 s | Dawam. Petit, mais constant. |

**2. Le trajet** (20,5 s)
| | |
|---|---|
| 0,4 s | Huit heures dix. Vingt-cinq minutes de métro, comme chaque matin. |
| 4,7 s | Et si ce trajet devenait un moment pour toi ? |
| 7,6 s | Une séance de dhikr guidée, à ton rythme : tu choisis ta durée. |
| 11,9 s | Le cœur s'apaise, station après station. |
| 14,7 s | Chaque minute peut compter. |
| 17,9 s | Dawam. Petit, mais constant. |

**3. En famille** (19,5 s)
| | |
|---|---|
| 0,4 s | Il est midi quarante-cinq. Samira est à la maison, Yacine au bureau, Inès à la fac. |
| 5,8 s | Ensemble, ils visent mille prières sur le Prophète, paix et salut sur lui. |
| 11,8 s | Mâ châ Allah… objectif atteint. |
| 14,0 s | Chacun de son côté, et pourtant ensemble. |
| 16,9 s | Dawam. Petit, mais constant. |

**4. Avant de dormir** (21 s)
| | |
|---|---|
| 0,4 s | Vingt-deux heures quarante. La journée se termine, tout ralentit. |
| 4,5 s | Avant de dormir, pas à pas. |
| 6,9 → 11,2 s | Le bilan. — Le repentir. — Les ablutions. — Les invocations. — Le côté droit. *(une étape par écran)* |
| 12,5 s | Journée complète. Qu'Allah te bénisse. |
| 15,5 s | Demain, on recommence. |
| 18,4 s | Dawam. Petit, mais constant. |

**Vidéo de présentation** (36 s)
| | |
|---|---|
| 0,6 s | Le Prophète, paix et salut sur lui, a dit : |
| 3,4 s | « Les œuvres les plus aimées d'Allah sont les plus constantes, même si elles sont peu nombreuses. » |
| 9,3 s | À chaque moment de la journée, son action. |
| 13,4 s | Un parcours qui s'adapte à toi, avec des rappels au bon moment. |
| 18,0 s | Tes invocations du matin et du soir, et des séances de dhikr guidées. |
| 23,0 s | Suis ta constance, jour après jour, sans pression. |
| 27,4 s | Et avance à plusieurs, avec tes proches. |
| 32,2 s | Dawam. Petit, mais constant. |

## Voix et licence

Voix de synthèse : [Piper](https://github.com/rhasspy/piper) (licence MIT), modèle `fr_FR-siwis-medium`, entraîné sur la *SIWIS French Speech Synthesis Database* (Yamagishi, Honnet, Garner, Lazaridis — Idiap / University of Edinburgh, **CC BY 4.0**), exécuté avec [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx). L'usage commercial est autorisé, à condition de citer la source, par exemple dans la description de la publication : *« Voix : synthèse Piper, base SIWIS (CC BY 4.0) »*.

Ont été écartées : la voix « miro » (CC BY-NC-SA, pas d'usage commercial), « tom » (AGPL) et « upmc » (CC BY-SA), ambiguës pour une publicité, ainsi que « gilles » (domaine public, mais trop dégradée). Il n'existe pas de voix masculine de bonne qualité sous licence libre et commerciale parmi les modèles disponibles. Pour une voix masculine, une voix « studio » (ElevenLabs, Google, Azure…) ou un vrai narrateur pourront remplacer ces pistes : les timings ci-dessus restent valables.

## Régénérer

```bash
pip install sherpa-onnx soundfile numpy        # + ffmpeg
mkdir -p ~/.cache/dawam-tts && cd ~/.cache/dawam-tts
B=https://github.com/k2-fsa/sherpa-onnx/releases/download
curl -L $B/tts-models/vits-piper-fr_FR-siwis-medium.tar.bz2 | tar xj
curl -L $B/asr-models/sherpa-onnx-whisper-small.tar.bz2 | tar xj   # seulement pour --verifier
cd -  # retour dans promo/voix-off
python3 generer.py --verifier          # ou : python3 generer.py nuit
```
