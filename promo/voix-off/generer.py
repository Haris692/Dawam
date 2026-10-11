"""Voix off des vidéos Dawam : synthèse (Piper, voix française « siwis »), placement au timing des scènes,
traitement (chaleur, compression douce, légère pièce), normalisation, puis mixage dans les MP4.

    python3 generer.py                 # toutes les vidéos
    python3 generer.py aube nuit       # seulement certaines
    python3 generer.py --verifier      # + relecture Whisper de chaque phrase (contrôle de prononciation)

Prérequis : pip install sherpa-onnx soundfile numpy ; ffmpeg ; modèles dans $DAWAM_TTS (voir README.md).
"""
import os, sys, subprocess, numpy as np, soundfile as sf, sherpa_onnx

ICI = os.path.dirname(os.path.abspath(__file__))
PROMO = os.path.dirname(ICI)
MODELES = os.environ.get('DAWAM_TTS', os.path.expanduser('~/.cache/dawam-tts'))
SR = 22050
LENTEUR = 1.1                    # Piper : > 1 = débit plus posé

# (début en s, texte affiché, texte prononcé si différent — orthographe adaptée au moteur ; « zikr » = dhikr)
TEXTES = {
    'aube': ('quotidien/dawam-aube.mp4', 21.0, [
        (0.6, "Cinq heures cinquante-deux. Dehors, tout est encore calme.", None),
        (4.2, "Dawam te rappelle, en douceur, ce qui compte vraiment.", "Dawame te rappelle, en douceur, ce qui compte vraiment."),
        (7.8, "Après la prière de l'aube, quelques minutes : les invocations du matin, un peu de Coran.", None),
        (13.9, "Un petit pas, chaque matin.", None),
        (15.75, "Ta journée commence par le rappel.", None),
        (18.5, "Dawam. Petit, mais constant.", "Dawame. Petit, mais constant."),
    ]),
    'trajet': ('quotidien/dawam-trajet.mp4', 20.5, [
        (0.4, "Huit heures dix. Vingt-cinq minutes de métro, comme chaque matin.", None),
        (4.7, "Et si ce trajet devenait un moment pour toi ?", None),
        (7.6, "Une séance de dhikr guidée, à ton rythme : tu choisis ta durée.",
              "Une séance de zikr guidée, à ton rythme : tu choisis ta durée."),
        (11.9, "Le cœur s'apaise, station après station.", None),
        (14.7, "Chaque minute peut compter.", None),
        (17.9, "Dawam. Petit, mais constant.", "Dawame. Petit, mais constant."),
    ]),
    'famille': ('quotidien/dawam-famille.mp4', 19.5, [
        (0.4, "Il est midi quarante-cinq. Samira est à la maison, Yacine au bureau, Inès à la fac.", None),
        (5.8, "Ensemble, ils visent mille prières sur le Prophète, paix et salut sur lui.", None),
        (11.8, "Mâ châ Allah… objectif atteint.", "Ma cha Allah… objectif atteint."),
        (14.0, "Chacun de son côté, et pourtant ensemble.", None),
        (16.9, "Dawam. Petit, mais constant.", "Dawame. Petit, mais constant."),
    ]),
    'nuit': ('quotidien/dawam-nuit.mp4', 21.0, [
        (0.4, "Vingt-deux heures quarante. La journée se termine, tout ralentit.", None),
        (4.5, "Avant de dormir, pas à pas.", None),
        (6.85, "Le bilan.", None, 1.0),
        (7.85, "Le repentir.", None, 1.0),
        (8.95, "Les ablutions.", None, 1.0),
        (10.0, "Les invocations.", None, 1.0),
        (11.15, "Le côté droit.", None, 1.0),
        (12.5, "Journée complète. Qu'Allah te bénisse.", None),
        (15.5, "Demain, on recommence.", None),
        (18.4, "Dawam. Petit, mais constant.", "Dawame. Petit, mais constant."),
    ]),
    'presentation': ('video/dawam-presentation.mp4', 36.0, [
        (0.6, "Le Prophète, paix et salut sur lui, a dit :", None),
        (3.4, "« Les œuvres les plus aimées d'Allah sont les plus constantes, même si elles sont peu nombreuses. »",
              "Les œuvres les plus aimées d'Allah sont les plus constantes, même si elles sont peu nombreuses."),
        (9.3, "À chaque moment de la journée, son action.", None),
        (13.4, "Un parcours qui s'adapte à toi, avec des rappels au bon moment.", None),
        (18.0, "Tes invocations du matin et du soir, et des séances de dhikr guidées.",
               "Tes invocations du matin et du soir, et des séances de zikr guidées."),
        (23.0, "Suis ta constance, jour après jour, sans pression.", None),
        (27.4, "Et avance à plusieurs, avec tes proches.", None),
        (32.2, "Dawam. Petit, mais constant.", "Dawame. Petit, mais constant."),
    ]),
}

# traitement : chaleur, clarté, sibilantes adoucies, compression douce, petite pièce, puis normalisation (-16 LUFS)
FILTRE = ('highpass=f=75,equalizer=f=200:t=q:w=1:g=2,equalizer=f=3200:t=q:w=1.4:g=1.2,deesser=i=.35,'
          'acompressor=threshold=-22dB:ratio=2.5:attack=12:release=180:makeup=2,'
          'aecho=0.9:0.5:28|61:0.10|0.06,loudnorm=I=-16:TP=-1.5:LRA=9')


def moteur(lenteur=LENTEUR):
    d = os.path.join(MODELES, 'vits-piper-fr_FR-siwis-medium')
    cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=f'{d}/fr_FR-siwis-medium.onnx', tokens=f'{d}/tokens.txt',
                                                   data_dir=f'{d}/espeak-ng-data', length_scale=lenteur),
        num_threads=4), max_num_sentences=1)
    return sherpa_onnx.OfflineTts(cfg)


def relecteur():
    w = os.path.join(MODELES, 'sherpa-onnx-whisper-small')
    return sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f'{w}/small-encoder.int8.onnx', decoder=f'{w}/small-decoder.int8.onnx',
                                                      tokens=f'{w}/small-tokens.txt', language='fr', task='transcribe', num_threads=4)


def rogner(x, seuil=.008):
    """Retire les silences de début et de fin produits par le moteur (garde 40 ms de marge)."""
    idx = np.where(np.abs(x) > seuil)[0]
    if not len(idx): return x
    m = int(.04 * SR)
    return x[max(0, idx[0] - m):idx[-1] + m]


def piste(nom, tts, rec=None):
    video, duree, lignes = TEXTES[nom]
    out = os.path.join(ICI, nom)
    os.makedirs(out, exist_ok=True)
    track = np.zeros(int(duree * SR), dtype=np.float32)
    for i, (t0, affiche, dit, *opt) in enumerate(lignes):
        a = (tts[opt[0]] if opt else tts[LENTEUR]).generate(dit or affiche, sid=0, speed=1.0)
        x = rogner(np.array(a.samples, dtype=np.float32))
        fin = lignes[i + 1][0] if i + 1 < len(lignes) else duree
        d = len(x) / SR
        alerte = '  ⚠ déborde de %.2f s' % (t0 + d - fin) if t0 + d > fin + .05 else ''
        print(f'  {t0:5.2f}s  {d:4.2f}s  {affiche}{alerte}')
        if rec:
            y = np.interp(np.linspace(0, len(x) - 1, int(len(x) * 16000 / SR)), np.arange(len(x)), x).astype(np.float32)
            s = rec.create_stream(); s.accept_waveform(16000, y); rec.decode_stream(s)
            print(f'                 Whisper : {s.result.text.strip()}')
        fade = np.ones_like(x); n = int(.03 * SR); fade[:n] = np.linspace(0, 1, n); fade[-n:] = np.linspace(1, 0, n)
        a0 = int(t0 * SR)
        seg = (x * fade)[:max(0, len(track) - a0)]
        track[a0:a0 + len(seg)] += seg
    brut = os.path.join(out, 'voix-brute.wav')
    sf.write(brut, track, SR)
    wav = os.path.join(out, f'voix-off-{nom}.wav')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', brut, '-af', FILTRE, '-ar', '48000', '-ac', '2', wav], check=True)
    os.remove(brut)
    # vidéo avec voix : image copiée telle quelle, piste audio remplacée
    src = os.path.join(PROMO, video)
    dst = src.replace('.mp4', '-voix.mp4')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                    '-c:a', 'aac', '-b:a', '160k', '-af', f'apad,atrim=0:{duree}', '-movflags', '+faststart', dst], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '160k', wav.replace('.wav', '.m4a')], check=True)
    os.remove(wav)
    print(f'  → {os.path.relpath(dst, PROMO)}')


if __name__ == '__main__':
    noms = [a for a in sys.argv[1:] if not a.startswith('--')] or list(TEXTES)
    tts = {LENTEUR: moteur(), 1.0: moteur(1.0)}
    rec = relecteur() if '--verifier' in sys.argv else None
    for nom in noms:
        print(nom)
        piste(nom, tts, rec)
