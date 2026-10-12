"""Voix off des vidéos Dawam : synthèse avec Supertonic-3 (l'un des moteurs de VoiceStudio, exécuté par sherpa-onnx),
placement au timing des scènes, traitement (chaleur, compression douce, légère pièce), normalisation, puis mixage dans les MP4.

    python3 generer.py                 # toutes les vidéos
    python3 generer.py aube nuit       # seulement certaines
    python3 generer.py --verifier      # 3 prises par phrase : Whisper garde la mieux prononcée et affiche ce qu'il entend

Prérequis : pip install sherpa-onnx soundfile numpy ; ffmpeg ; modèles dans $DAWAM_TTS (voir README.md).
"""
import os, re, sys, subprocess, unicodedata, numpy as np, soundfile as sf, sherpa_onnx

ICI = os.path.dirname(os.path.abspath(__file__))
PROMO = os.path.dirname(ICI)
MODELES = os.environ.get('DAWAM_TTS', os.path.expanduser('~/.cache/dawam-tts'))
SUPERTONIC = 'sherpa-onnx-supertonic-3-tts-int8-2026-05-11'
SR = 44100                       # fréquence native de Supertonic-3
VOIX = 2                         # F3 : la plus grave, la plus douce et la plus posée des 5 voix féminines
VITESSE = 1.0                    # débit naturel de F3 (déjà lent)
ETAPES = 12                      # pas de génération : qualité maximale proposée par VoiceStudio
PRISES = 5                       # avec --verifier : jusqu'à 5 prises par phrase, la mieux relue par Whisper est gardée

# (début en s, texte affiché, texte prononcé si différent, vitesse si différente)
# Orthographe adaptée au moteur : « Dawame » (sinon « Dawan »), « zikr » pour dhikr, « Corân » (sinon « coronne » en fin
# de phrase), « Mâchâ'Allah » en un mot, et « Dawame, petit mais constant » : sans virgule après « petit », le t reste muet.
TEXTES = {
    'aube': ('quotidien/dawam-aube.mp4', 21.0, [
        (0.6, "Cinq heures cinquante-deux. Dehors, tout est encore calme.", None),
        (4.2, "Dawam te rappelle, en douceur, ce qui compte vraiment.", "Dawame te rappelle, en douceur, ce qui compte vraiment."),
        (7.8, "Après la prière de l'aube, quelques minutes : les invocations du matin, un peu de Coran.",
              "Après la prière de l'aube, quelques minutes : les invocations du matin, un peu de Corân."),
        (13.9, "Un petit pas, chaque matin.", None),
        (15.75, "Ta journée commence par le rappel.", None),
        (18.5, "Dawam. Petit, mais constant.", "Dawame, petit mais constant."),
    ]),
    'trajet': ('quotidien/dawam-trajet.mp4', 20.5, [
        (0.4, "Huit heures dix. Vingt-cinq minutes de métro, comme chaque matin.", None),
        (4.7, "Et si ce trajet devenait un moment pour toi ?", None),
        (7.6, "Une séance de dhikr guidée, à ton rythme : tu choisis ta durée.",
              "Une séance de zikr guidée, à ton rythme : tu choisis ta durée."),
        (11.9, "Le cœur s'apaise, station après station.", None),
        (14.7, "Chaque minute peut compter.", None),
        (17.9, "Dawam. Petit, mais constant.", "Dawame, petit mais constant."),
    ]),
    'famille': ('quotidien/dawam-famille.mp4', 19.5, [
        (0.4, "Il est midi quarante-cinq. Samira est à la maison, Yacine au bureau, Inès à la fac.", None),
        (5.8, "Ensemble, ils visent mille prières sur le Prophète, paix et salut sur lui.", None),
        (11.8, "Mâ châ Allah… objectif atteint.", "Mâchâ'Allah, objectif atteint."),
        (14.0, "Chacun de son côté, et pourtant ensemble.", None),
        (16.9, "Dawam. Petit, mais constant.", "Dawame, petit mais constant."),
    ]),
    'nuit': ('quotidien/dawam-nuit.mp4', 21.0, [
        (0.4, "Vingt-deux heures quarante. La journée se termine, tout ralentit.", None, 1.1),
        (4.5, "Avant de dormir, pas à pas.", None),
        (6.85, "Le bilan.", None, 1.15),
        (7.85, "Le repentir.", None, 1.15),
        (8.95, "Les ablutions.", None, 1.15),
        (10.0, "Les invocations.", None, 1.15),
        (11.15, "Le côté droit.", None, 1.15),
        (12.5, "Journée complète. Qu'Allah te bénisse.", None),
        (15.5, "Demain, on recommence.", None),
        (18.4, "Dawam. Petit, mais constant.", "Dawame, petit mais constant."),
    ]),
    'presentation': ('video/dawam-presentation.mp4', 36.0, [
        (0.6, "Le Prophète, paix et salut sur lui, a dit :", None, 1.08),
        (3.4, "« Les œuvres les plus aimées d'Allah sont les plus constantes, même si elles sont peu nombreuses. »",
              "Les œuvres les plus aimées d'Allah sont les plus constantes, même si elles sont peu nombreuses.", 1.08),
        (9.3, "À chaque moment de la journée, son action.", None),
        (13.4, "Un parcours qui s'adapte à toi, avec des rappels au bon moment.", None),
        (18.0, "Tes invocations du matin et du soir, et des séances de dhikr guidées.",
               "Tes invocations du matin et du soir, et des séances de zikr guidées."),
        (23.0, "Suis ta constance, jour après jour, sans pression.", None),
        (27.4, "Et avance à plusieurs, avec tes proches.", None),
        (32.2, "Dawam. Petit, mais constant.", "Dawame, petit mais constant."),
    ]),
}

# traitement : chaleur, clarté, sibilantes adoucies, compression douce, petite pièce, puis normalisation (-16 LUFS)
FILTRE = ('highpass=f=75,equalizer=f=200:t=q:w=1:g=2,equalizer=f=3200:t=q:w=1.4:g=1.2,deesser=i=.35,'
          'acompressor=threshold=-22dB:ratio=2.5:attack=12:release=180:makeup=2,'
          'aecho=0.9:0.5:28|61:0.10|0.06,loudnorm=I=-16:TP=-1.5:LRA=9')


def moteur():
    d = os.path.join(MODELES, SUPERTONIC)
    cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        supertonic=sherpa_onnx.OfflineTtsSupertonicModelConfig(
            duration_predictor=f'{d}/duration_predictor.int8.onnx', text_encoder=f'{d}/text_encoder.int8.onnx',
            vector_estimator=f'{d}/vector_estimator.int8.onnx', vocoder=f'{d}/vocoder.int8.onnx',
            tts_json=f'{d}/tts.json', unicode_indexer=f'{d}/unicode_indexer.bin', voice_style=f'{d}/voice.bin'),
        num_threads=4, provider='cpu'))
    return sherpa_onnx.OfflineTts(cfg)


def synthese(tts, texte, vitesse):
    g = sherpa_onnx.GenerationConfig()
    g.sid, g.num_steps, g.speed = VOIX, ETAPES, vitesse
    # Affecter le dictionnaire entier : « g.extra['lang'] = 'fr' » modifie une copie, et le modèle lirait le texte en anglais.
    g.extra = {'lang': 'fr'}
    a = tts.generate(texte, g)
    assert a.sample_rate == SR, a.sample_rate
    return np.array(a.samples, dtype=np.float32)


def relecteur():
    w = os.path.join(MODELES, 'sherpa-onnx-whisper-turbo')
    return sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f'{w}/turbo-encoder.int8.onnx', decoder=f'{w}/turbo-decoder.int8.onnx',
                                                      tokens=f'{w}/turbo-tokens.txt', language='fr', task='transcribe', num_threads=4)


def entendu(rec, x):
    y = np.interp(np.linspace(0, len(x) - 1, int(len(x) * 16000 / SR)), np.arange(len(x)), x).astype(np.float32)
    s = rec.create_stream(); s.accept_waveform(16000, y); rec.decode_stream(s)
    return s.result.text.strip()


def ecart(ref, hyp):
    """Taux d'erreur sur les mots, sans accents ni ponctuation."""
    def mots(t):
        t = unicodedata.normalize('NFKD', t.lower())
        t = ''.join(c for c in t if not unicodedata.combining(c)).replace("'", '').replace('’', '')
        return re.sub(r'[^a-z0-9 ]', ' ', t).split()
    r, h = mots(ref), mots(hyp)
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        prev, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            cur = d[j]; d[j] = min(d[j] + 1, d[j - 1] + 1, prev + (r[i - 1] != h[j - 1])); prev = cur
    return d[len(h)] / max(1, len(r))


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
        vitesse = opt[0] if opt else VITESSE
        prises, notes = [], []
        while len(prises) < (PRISES if rec else 1):
            prises.append(rogner(synthese(tts, dit or affiche, vitesse)))
            if not rec: break
            txt = entendu(rec, prises[-1]); notes.append((ecart(affiche, txt), txt))
            if notes[-1][0] == 0: break          # prise parfaite : inutile d'en faire d'autres
        k = min(range(len(notes)), key=lambda j: notes[j][0]) if rec else 0
        x = prises[k]
        fin = lignes[i + 1][0] if i + 1 < len(lignes) else duree
        d = len(x) / SR
        alerte = '  ⚠ déborde de %.2f s' % (t0 + d - fin) if t0 + d > fin + .05 else ''
        print(f'  {t0:5.2f}s  {d:4.2f}s  {affiche}{alerte}')
        if rec:
            print(f'                 Whisper : {notes[k][1]}  (meilleure de {len(prises)} prises, écart {notes[k][0] * 100:.0f} %)')
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
    # écriture dans des fichiers temporaires puis renommage : jamais de fichier à moitié écrit
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                    '-c:a', 'aac', '-b:a', '160k', '-af', f'apad,atrim=0:{duree}', '-movflags', '+faststart', dst + '.tmp.mp4'], check=True)
    m4a = wav.replace('.wav', '.m4a')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '160k', m4a + '.tmp.m4a'], check=True)
    os.replace(dst + '.tmp.mp4', dst); os.replace(m4a + '.tmp.m4a', m4a)
    os.remove(wav)
    print(f'  → {os.path.relpath(dst, PROMO)}')


if __name__ == '__main__':
    noms = [a for a in sys.argv[1:] if not a.startswith('--')] or list(TEXTES)
    tts = moteur()
    rec = relecteur() if '--verifier' in sys.argv else None
    for nom in noms:
        print(nom)
        piste(nom, tts, rec)
