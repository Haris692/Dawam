# Prompt Claude Code — Créer le projet iOS Dawam pour l'App Store

> **Instructions pour Claude Code sur Mac** : lis ce fichier en entier avant de commencer. Suit chaque étape dans l'ordre. Ne saute aucune étape.

---

## Contexte du projet

**Dawam** est une application de spiritualité islamique (PWA) déjà publiée sur le Play Store Android. Elle est hébergée sur GitHub Pages à l'URL : `https://haris692.github.io/Dawam/`

L'objectif est de créer un **projet Xcode natif iOS** qui encapsule cette PWA dans une `WKWebView`, pour la publier sur l'**App Store Apple**.

Toute la logique, l'UI et le contenu restent dans la PWA. L'app iOS est un wrapper natif propre avec :
- Chargement de l'URL dans une WKWebView plein écran
- Gestion du splash screen natif
- Support des safe areas iPhone (encoche, Dynamic Island, home indicator)
- Notifications push via APNs (à brancher sur le worker Cloudflare existant)
- Aucune barre de navigation Safari visible

---

## Informations clés de l'app

| Champ | Valeur |
|-------|--------|
| Nom affiché | `Dawam` |
| Tagline | `Petit, mais constant.` |
| Bundle ID | `com.mydawam.app` |
| Version | `1.0.0` |
| Build | `1` |
| URL chargée | `https://haris692.github.io/Dawam/` |
| Couleur fond | `#F5EDE0` (beige chaud) |
| Couleur accent | `#BA7517` (or/brun) |
| Couleur texte | `#3D2A0A` |
| Catégorie App Store | Lifestyle / Health & Fitness |
| Langue | Français |

---

## Étape 1 — Créer le projet Xcode

1. Ouvre Xcode
2. **File → New → Project → App**
3. Remplis :
   - Product Name : `Dawam`
   - Bundle Identifier : `com.mydawam.app`
   - Interface : **SwiftUI**
   - Language : **Swift**
   - Décocher "Include Tests"
4. Enregistre le projet dans le dossier `ios/` à la racine du repo (crée ce dossier s'il n'existe pas)

---

## Étape 2 — Créer les fichiers Swift

### `ContentView.swift` — Vue principale avec WKWebView

Remplace tout le contenu du fichier par ce code :

```swift
import SwiftUI
import WebKit

// MARK: - WKWebView wrapper
struct DawamWebView: UIViewRepresentable {

    @Binding var isLoaded: Bool

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        // Permet au localStorage et aux cookies de persister
        config.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear

        // Désactive le long-press et la sélection de texte (feeling natif)
        webView.configuration.userContentController.addUserScript(
            WKUserScript(
                source: """
                document.documentElement.style.webkitUserSelect = 'none';
                document.documentElement.style.webkitTouchCallout = 'none';
                """,
                injectionTime: .atDocumentEnd,
                forMainFrameOnly: true
            )
        )

        let url = URL(string: "https://haris692.github.io/Dawam/")!
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    // MARK: - Coordinator (navigation delegate)
    class Coordinator: NSObject, WKNavigationDelegate {
        var parent: DawamWebView

        init(_ parent: DawamWebView) { self.parent = parent }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                withAnimation(.easeOut(duration: 0.4)) {
                    self.parent.isLoaded = true
                }
            }
        }

        // Autorise toutes les navigations internes à la PWA
        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            if let url = navigationAction.request.url,
               url.host == "haris692.github.io" {
                decisionHandler(.allow)
            } else if navigationAction.request.url?.scheme == "mailto" ||
                      navigationAction.request.url?.scheme == "tel" {
                UIApplication.shared.open(navigationAction.request.url!)
                decisionHandler(.cancel)
            } else {
                decisionHandler(.allow)
            }
        }
    }
}

// MARK: - Vue principale
struct ContentView: View {
    @State private var isLoaded = false

    // Couleur de fond Dawam
    let dawamBg = Color(red: 0.961, green: 0.929, blue: 0.878) // #F5EDE0

    var body: some View {
        ZStack {
            dawamBg.ignoresSafeArea()

            DawamWebView(isLoaded: $isLoaded)
                .ignoresSafeArea()
                .opacity(isLoaded ? 1 : 0)

            // Splash natif pendant le chargement
            if !isLoaded {
                SplashView()
                    .transition(.opacity)
            }
        }
    }
}

// MARK: - Splash screen natif
struct SplashView: View {
    let dawamBg = Color(red: 0.961, green: 0.929, blue: 0.878)
    let accent   = Color(red: 0.729, green: 0.459, blue: 0.090) // #BA7517

    var body: some View {
        ZStack {
            dawamBg.ignoresSafeArea()
            VStack(spacing: 8) {
                Text("Dawam")
                    .font(.custom("Georgia-Bold", size: 52))
                    .foregroundColor(accent)
                    .kerning(-1)
                Text("Petit, mais constant.")
                    .font(.custom("Georgia-Italic", size: 15))
                    .foregroundColor(accent.opacity(0.7))
            }
        }
    }
}
```

---

### `DawamApp.swift` — Point d'entrée de l'app

```swift
import SwiftUI
import UserNotifications

@main
struct DawamApp: App {

    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(.light) // Force light mode (l'app n'a pas de dark mode)
        }
    }
}

// MARK: - AppDelegate pour APNs
class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self

        // Demande la permission de notifications (si l'utilisateur a déjà accepté dans le PWA)
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .sound, .badge]
        ) { granted, _ in
            if granted {
                DispatchQueue.main.async {
                    application.registerForRemoteNotifications()
                }
            }
        }
        return true
    }

    // Token APNs reçu → à envoyer au serveur push Cloudflare si besoin
    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        print("[APNs] Token: \(token)")
        // TODO: envoyer ce token à https://dawam-push.mydawam.workers.dev/subscribe-apns
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("[APNs] Échec enregistrement: \(error)")
    }

    // Notification reçue quand l'app est au premier plan
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }
}
```

---

## Étape 3 — Configurer le projet Xcode

### 3.1 — Info.plist : ajouter les permissions

Dans le fichier `Info.plist` (ou dans les settings du target → Info), ajoute ces clés :

```xml
<!-- Autorise le chargement de haris692.github.io en HTTPS (par défaut autorisé, mais explicite) -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
</dict>

<!-- Notifications push en arrière-plan -->
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
    <string>fetch</string>
</array>

<!-- Empêche la rotation (portrait uniquement comme le PWA) -->
<key>UISupportedInterfaceOrientations</key>
<array>
    <string>UIInterfaceOrientationPortrait</string>
</array>
<key>UISupportedInterfaceOrientations~ipad</key>
<array>
    <string>UIInterfaceOrientationPortrait</string>
    <string>UIInterfaceOrientationPortraitUpsideDown</string>
</array>
```

### 3.2 — Capabilities à activer

Dans **Signing & Capabilities** du target :
- Clique **+ Capability**
- Ajoute : **Push Notifications**
- Ajoute : **Background Modes** → coche "Remote notifications"

### 3.3 — Signing

- Team : sélectionne ton compte Apple Developer
- Bundle Identifier : `com.mydawam.app`
- Laisse "Automatically manage signing" coché

---

## Étape 4 — Icônes de l'app

### Ce qu'Apple exige

Une seule icône **1024×1024 px**, sans transparence, sans coins arrondis (Apple les arrondit lui-même), format PNG.

### Ce que tu as déjà

- `icon-512.png` à la racine du repo → à upscaler en 1024×1024

### Comment créer l'icône 1024×1024

Depuis le terminal dans le dossier du repo :

```bash
# Si sharp est installé (package.json le contient)
node -e "
const sharp = require('sharp');
sharp('icon-512.png')
  .resize(1024, 1024)
  .toFile('icon-1024.png', (err) => {
    if (err) console.error(err);
    else console.log('icon-1024.png créé');
  });
"
```

Ou manuellement : ouvre `icon-512.png` dans Aperçu (Mac) → Outils → Ajuster la taille → 1024×1024 → Exporte en PNG.

### Comment l'ajouter dans Xcode

1. Dans le projet Xcode, ouvre `Assets.xcassets`
2. Clique sur `AppIcon`
3. Glisse `icon-1024.png` dans la case **App Store (1024×1024)**
4. Pour iOS 16 et versions antérieures, Xcode peut demander d'autres tailles — utilise [makeappicon.com](https://makeappicon.com) ou génère-les avec sharp

---

## Étape 5 — Launch Screen (Splash natif)

1. Dans le projet, sélectionne **LaunchScreen.storyboard**
2. Supprime le contenu existant
3. Ajoute une `UIView` en fond avec la couleur `#F5EDE0`
4. Ajoute un `UILabel` centré avec le texte `Dawam`, police Georgia Bold, taille 52, couleur `#BA7517`
5. Ajoute un second `UILabel` en dessous : `Petit, mais constant.`, Georgia Italic, taille 15, couleur `#8A6020`
6. Assure-toi que les deux labels ont des contraintes centrées horizontalement et verticalement

Ou plus simple : dans `Info.plist`, utilise `UILaunchScreen` avec une couleur de fond :

```xml
<key>UILaunchScreen</key>
<dict>
    <key>UIColorName</key>
    <string>LaunchBackground</string>
</dict>
```

Et dans `Assets.xcassets`, crée une couleur `LaunchBackground` avec la valeur `#F5EDE0`.

---

## Étape 6 — Tester sur simulateur

```
Product → Run (Cmd+R)
```

Vérifie :
- [ ] L'app se lance avec le splash beige + texte "Dawam"
- [ ] La PWA se charge correctement
- [ ] Pas de barre Safari visible
- [ ] Le contenu respecte l'encoche (safe area)
- [ ] Pas de bounce/scroll parasite
- [ ] La rotation est bloquée en portrait

**Simulateurs à tester :**
- iPhone 15 Pro (Dynamic Island)
- iPhone SE 3 (petit écran)
- iPhone 14 (encoche classique)

---

## Étape 7 — Tester sur un vrai iPhone

1. Branche l'iPhone en USB
2. Dans Xcode : sélectionne l'iPhone comme destination
3. **Product → Run**
4. Si "Trust" requis sur l'iPhone : Réglages → VPN et gestion de l'appareil → fais confiance au développeur

---

## Étape 8 — Archiver et soumettre à l'App Store

### 8.1 — Passer en mode Release

Dans le scheme selector (en haut à gauche de Xcode) :
- Clique sur le nom du scheme → **Edit Scheme**
- Run → Build Configuration → **Release**

### 8.2 — Archiver

```
Product → Archive
```

Cela compile l'app en mode release. L'Organizer s'ouvre automatiquement.

### 8.3 — Distribuer

Dans l'Organizer :
1. Sélectionne l'archive
2. **Distribute App**
3. **App Store Connect**
4. **Upload**
5. Laisse toutes les options par défaut
6. Clique **Upload**

### 8.4 — Dans App Store Connect (appstoreconnect.apple.com)

1. Crée une nouvelle app iOS
   - Bundle ID : `com.mydawam.app`
   - Nom : `Dawam — Petit, mais constant.`
   - SKU : `dawam-ios-v1`
2. Remplis la fiche :
   - **Description** : "Dawam est ton compagnon spirituel quotidien. Adhkar du matin et du soir, séance de l'aube guidée, groupes Dhikr collectif — petit, mais constant."
   - **Mots-clés** : `islam, dhikr, adhkar, coran, spiritualité, fajr, prière, muslims`
   - **Catégorie** : Lifestyle (principale), Health & Fitness (secondaire)
   - **Langue** : Français
3. Upload les screenshots depuis le dossier `screenshot_apk/` du repo (adapte les tailles si nécessaire)
4. Sélectionne le build uploadé
5. Soumets pour review

---

## Structure de fichiers attendue

```
ios/
└── Dawam/
    ├── Dawam.xcodeproj/
    ├── Dawam/
    │   ├── DawamApp.swift
    │   ├── ContentView.swift
    │   ├── Assets.xcassets/
    │   │   ├── AppIcon.appiconset/
    │   │   │   ├── Contents.json
    │   │   │   └── icon-1024.png
    │   │   └── AccentColor.colorset/
    │   ├── LaunchScreen.storyboard
    │   └── Info.plist
```

---

## Points d'attention importants

### Safe Areas iOS
Le PWA utilise `env(safe-area-inset-bottom)` dans son CSS — c'est déjà géré côté web. La WKWebView transmet automatiquement ces valeurs.

### localStorage entre sessions
La configuration `WKWebViewConfiguration` avec `.websiteDataStore = .default()` garantit que les données du PWA (préférences utilisateur, onboarding complété, etc.) persistent entre les lancements de l'app.

### Notifications push
Pour l'instant les notifs APNs sont préparées dans le code mais pas branchées sur le worker Cloudflare. L'app fonctionnera sans — le web push iOS via la PWA prend le relais sur iOS 16.4+. L'intégration APNs complète est une étape ultérieure.

### Politique App Store
L'App Store accepte les apps WKWebView à condition que :
- Le contenu web soit propriétaire (c'est le cas)
- L'app apporte une vraie valeur (c'est le cas)
- Il n'y a pas de navigation générale vers du contenu externe
Le code ci-dessus bloque toute navigation hors de `haris692.github.io`.

---

## Commandes utiles

```bash
# Dans le dossier ios/Dawam/
# Ouvrir le projet Xcode
open Dawam.xcodeproj

# Nettoyer le build
# Dans Xcode : Product → Clean Build Folder (Cmd+Shift+K)

# Voir les logs
# Dans Xcode : View → Debug Area → Activate Console
```

---

## En cas de problème

| Erreur | Solution |
|--------|----------|
| "No signing certificate" | Signing & Capabilities → Change Team → sélectionne ton compte |
| "Bundle ID already taken" | Vérifie sur developer.apple.com que `com.mydawam.app` est enregistré sur ton compte |
| Écran blanc au lancement | Vérifie la connexion internet du simulateur / vrai device |
| Safe area mal gérée | Ajoute `.ignoresSafeArea()` sur la WKWebView (déjà présent dans le code) |
| Build échoue sur LaunchScreen | Supprime `LaunchScreen.storyboard` et utilise uniquement `UILaunchScreen` dans Info.plist |
