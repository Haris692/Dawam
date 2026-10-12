# Voix off des vidéos Dawam

Une narratrice au ton posé et rassurant (voix grave, débit tranquille, légère chaleur, une pointe de « pièce »), calée sur les scènes de chaque vidéo. Elle est produite avec **Supertonic‑3**, l'un des moteurs de [VoiceStudio](https://github.com/debpalash/VoiceStudio) (détails plus bas).

**Fichiers produits**
- Vidéos avec voix : `../quotidien/dawam-{aube,trajet,famille,nuit}-voix.mp4` et `../video/dawam-presentation-voix.mp4`. Les versions sans voix restent à côté, pour y ajouter un nashid si besoin.
- Pistes voix seules : `{aube,trajet,famille,nuit,presentation}/voix-off-*.m4a`, normalisées à -16 LUFS, à poser sous un autre montage.
- `generer.py` : synthèse, placement au timing des scènes, traitement, mixage. Les textes et les timings se trouvent en tête du fichier.

Quand le moteur prononce mal un mot, seul le texte prononcé est adapté : « Dawame » pour Dawam (sinon il dit « Dawan »), « zikr » pour dhikr, « Corân » (sinon « coronne » en fin de phrase), « Mâchâ'Allah » en un mot, et « Dawame, petit mais constant », sans virgule après « petit » (sinon il fait sonner le *t*). Pour les termes arabes, la voix passe par le sens (« le repentir », « qu'Allah te bénisse », « la prière de l'aube »), tandis que l'écran garde les termes de l'app (tawba, barakAllahu fik, Fajr). Chaque phrase est générée jusqu'à cinq fois : une reconnaissance vocale (Whisper turbo) relit chaque prise et garde la mieux prononcée, en s'arrêtant dès qu'une prise est parfaite.

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

Voix de synthèse : **Supertonic‑3** (Supertone Inc.), voix « F3 », la plus grave, la moins brillante et la plus lente des cinq voix féminines (mesures de hauteur, de timbre et de débit). C'est l'un des moteurs proposés par [VoiceStudio](https://github.com/debpalash/VoiceStudio). Ici, le modèle tourne avec [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) dans sa version INT8 publiée sur GitHub, car Hugging Face n'est pas accessible depuis l'environnement de génération. Les poids sont les mêmes que dans VoiceStudio, en version compressée.

- Code : licence MIT. Poids du modèle : licence **OpenRAIL-M**, qui autorise l'usage commercial, avec des restrictions d'usage (rien d'illégal, de trompeur ou de nuisible). Crédit facultatif dans la description d'une publication : *« Voix : Supertonic 3 (Supertone) »*.
- Le moteur par défaut de VoiceStudio, **OmniVoice**, n'a pas été retenu : ses poids sont sous licence **CC BY-NC**, donc interdits d'usage commercial, ce qui exclut la promotion d'une application qu'on veut monétiser. Le seul autre moteur de VoiceStudio à la fois commercial et francophone, **CosyVoice 3** (Apache 2.0, clonage de voix), n'est distribué que via Hugging Face et ModelScope, inaccessibles ici.
- Pour une voix masculine, il suffit de changer `VOIX` dans `generer.py` : 5 à 9 correspondent aux voix M1 à M5, sous la même licence.

L'ancienne voix (Piper, base SIWIS, CC BY 4.0) reste dans l'historique Git si vous voulez y revenir.

## Régénérer

```bash
pip install sherpa-onnx soundfile numpy        # sherpa-onnx 1.13 ou plus, + ffmpeg
mkdir -p ~/.cache/dawam-tts && cd ~/.cache/dawam-tts
B=https://github.com/k2-fsa/sherpa-onnx/releases/download
curl -L $B/tts-models/sherpa-onnx-supertonic-3-tts-int8-2026-05-11.tar.bz2 | tar xj
curl -L $B/asr-models/sherpa-onnx-whisper-turbo.tar.bz2 | tar xj   # seulement pour --verifier (choix des prises)
cd -  # retour dans promo/voix-off
python3 generer.py --verifier          # ou : python3 generer.py nuit
```
