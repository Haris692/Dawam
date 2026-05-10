# Contexte pour Claude sur Mac — Build TestFlight Dawam Preprod

Ce fichier est destiné à Claude Code installé sur le Mac de développement.
Il résume l'état du projet et les tâches à effectuer pour soumettre une build TestFlight.

---

## Projet Dawam — rappel rapide

- **PWA** : `index.html` + `sw.js` → GitHub Pages (`haris692.github.io/Dawam/`)
- **Preprod PWA** : `preprod/` → `haris692.github.io/Dawam/preprod/`
- **iOS** : `ios/Dawam/` — WKWebView qui charge la GitHub Pages URL
- Le flag `#if PREPROD` dans `ContentView.swift` bascule l'URL chargée :
  - `PREPROD` actif → `haris692.github.io/Dawam/preprod/`
  - Non actif → `haris692.github.io/Dawam/` (prod)

**Fichier principal iOS :** `ios/Dawam/Dawam/ContentView.swift`  
**Projet Xcode :** `ios/Dawam/Dawam.xcodeproj`

---

## Ce qui a été intégré (commit récent)

L'abonnement Premium a été intégré **uniquement sur la preprod** :

### ContentView.swift
- `import StoreKit` ajouté
- 2 bridges JS→Swift : `purchaseSubscription` et `restorePurchases`
- `handlePurchaseSubscription()` : flow StoreKit 2 (product ID = `dawam_monthly`)
- `handleRestorePurchases()` : restore silencieux au lancement, callback `window.restoreResult(bool)`

### preprod/onboarding.js
- Paywall P10 : CTA appelle `ob3StartPurchase()` (au lieu de naviguer directement)
- Sur iOS → appelle le bridge StoreKit ; sur web preprod → accès gratuit automatique
- `ob3Finish()` persiste `S.premium = true` après achat confirmé

### preprod/app.js
- `S.premium` dans l'état global
- `openSeanceGuidee()` et `openSeanceDhikr()` bloquées si `!S.premium`
- `verifySubscription()` au lancement → restore silencieux
- `showPremiumGate()` → relance l'achat depuis l'app

---

## Étapes à faire sur Mac

### 1. App Store Connect — créer le produit IAP (si pas encore fait)

URL : https://appstoreconnect.apple.com → Dawam → Monétisation → Achats intégrés

- Type : **Abonnement auto-renouvelable**
- **Product ID** : `dawam_monthly` (exactement ce nom)
- Groupe d'abonnements : créer "Dawam Premium" si inexistant
- Prix : **€2,99 / mois**
- Période d'essai : **7 jours**
- Statut requis : **"Prêt à soumettre"** (pas besoin d'être approuvé pour TestFlight sandbox)

### 2. Xcode — activer la capability In-App Purchase

1. Ouvrir `ios/Dawam/Dawam.xcodeproj`
2. Sélectionner la target `Dawam`
3. Onglet **Signing & Capabilities**
4. Cliquer **+ Capability** → ajouter **In-App Purchase**

### 3. Xcode — configurer la build Preprod (flag SWIFT_ACTIVE_COMPILATION_CONDITIONS)

Le projet n'a que Debug et Release. Pour activer `#if PREPROD` :

**Option A — Scheme dédié (recommandé) :**
1. Menu **Product → Scheme → Manage Schemes**
2. Dupliquer le scheme `Dawam` → renommer en `Dawam Preprod`
3. Dans le scheme, Run/Archive → Build Configuration : **Release**
4. Dans la target `Dawam` → **Build Settings** → chercher `SWIFT_ACTIVE_COMPILATION_CONDITIONS`
   - Pour la configuration Release (ou créer une config "Preprod") : ajouter `PREPROD`

**Option B — Temporaire, directement dans Build Settings :**
1. Target `Dawam` → Build Settings → `SWIFT_ACTIVE_COMPILATION_CONDITIONS`
2. Ligne **Release** → ajouter `PREPROD` (en plus de ce qui existe)
3. ⚠️ Penser à le retirer avant de builder la prod

### 4. Builder et archiver

```
Product → Archive  (avec le scheme/config PREPROD actif)
```

Puis dans Xcode Organizer :
- Clic droit sur l'archive → **Distribute App**
- Choisir **TestFlight & App Store** ou **TestFlight Internal Only**
- Suivre l'assistant (signing automatique recommandé)

### 5. Vérification TestFlight

- L'app chargera `haris692.github.io/Dawam/preprod/`
- Les achats iront dans le **sandbox Apple** (aucun vrai débit)
- Comptes sandbox : à créer dans App Store Connect → Utilisateurs → Comptes sandbox

---

## Points d'attention

- Le product ID `dawam_monthly` est en dur dans le Swift et le JS — ne pas le changer
- `AppStore.sync()` dans `handleRestorePurchases` peut throw en sandbox (comportement normal)
- Si le product n'est pas encore créé dans App Store Connect, `Product.products(for:)` retourne un tableau vide → `window.iapResult(false, 'not_found')` → toast d'erreur dans l'app
- Les tests sandbox nécessitent un compte Apple Sandbox (différent du compte AppleID principal)

---

## Architecture des callbacks JS ↔ Swift

| Direction | Nom du bridge | Payload | Callback JS |
|---|---|---|---|
| JS → Swift | `purchaseSubscription` | `{}` | `window.iapResult(bool, string)` |
| JS → Swift | `restorePurchases` | `{}` | `window.restoreResult(bool)` |
| JS → Swift | `requestNotifPermission` | `{}` | `window.nativeNotifResult(bool, token)` |
| JS → Swift | `signInWithApple` | `{}` | `window.appleSignInResult(json)` |
| JS → Swift | `showConfirm` | `{message, ok, cancel}` | callbacks directs |
