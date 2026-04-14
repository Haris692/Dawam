import SwiftUI
import WebKit
import UserNotifications
import AuthenticationServices
import CryptoKit

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

        // Signale à la PWA qu'elle tourne dans une app native iOS
        let nativeFlag = WKUserScript(
            source: "window.isNativeIOSApp = true;",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(nativeFlag)

        // Injecte la vraie valeur de la safe area top (Dynamic Island / notch)
        // env(safe-area-inset-top) n'est pas fiable avec contentInsetAdjustmentBehavior = .never
        let safeTop = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first?.windows.first?.safeAreaInsets.top ?? 0
        let safeAreaScript = WKUserScript(
            source: "document.documentElement.style.setProperty('--sat', '\(safeTop)px');",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(safeAreaScript)

        // Bridge pour les demandes de permission de notification
        config.userContentController.add(context.coordinator, name: "requestNotifPermission")
        // Bridge pour les dialogs de confirmation (confirm() remplacé en JS)
        config.userContentController.add(context.coordinator, name: "showConfirm")
        // Bridge pour Sign in with Apple
        config.userContentController.add(context.coordinator, name: "signInWithApple")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator   // nécessaire pour confirm() / alert()
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

        // Stocke la référence pour les callbacks Swift → JS
        context.coordinator.webView = webView

        let url = URL(string: "https://haris692.github.io/Dawam/")!
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    // MARK: - Coordinator (navigation + script message delegate)
    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler, WKUIDelegate,
                       ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
        var parent: DawamWebView
        weak var webView: WKWebView?
        var currentNonce: String?

        init(_ parent: DawamWebView) {
            self.parent = parent
            super.init()
            NotificationCenter.default.addObserver(
                self,
                selector: #selector(didReceiveAPNsToken(_:)),
                name: .apnsTokenReceived,
                object: nil
            )
        }

        deinit {
            NotificationCenter.default.removeObserver(self)
        }

        // MARK: WKScriptMessageHandler
        func userContentController(
            _ userContentController: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            if message.name == "showConfirm", let body = message.body as? [String: Any] {
                handleShowConfirm(body)
                return
            }
            if message.name == "signInWithApple" {
                handleSignInWithApple()
                return
            }
            guard message.name == "requestNotifPermission" else { return }

            UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
                DispatchQueue.main.async {
                    switch settings.authorizationStatus {
                    case .denied:
                        // Déjà refusé → ouvre les Réglages iOS directement
                        self?.callJS("window.nativeNotifResult(false, null)")
                        if let url = URL(string: UIApplication.openSettingsURLString) {
                            UIApplication.shared.open(url)
                        }
                    case .authorized, .provisional:
                        // Déjà autorisé → enregistre directement
                        UIApplication.shared.registerForRemoteNotifications()
                    default:
                        // Pas encore demandé → affiche la dialog système
                        UNUserNotificationCenter.current().requestAuthorization(
                            options: [.alert, .sound, .badge]
                        ) { granted, _ in
                            DispatchQueue.main.async {
                                if granted {
                                    UIApplication.shared.registerForRemoteNotifications()
                                } else {
                                    self?.callJS("window.nativeNotifResult(false, null)")
                                }
                            }
                        }
                    }
                }
            }
        }

        // MARK: Sign in with Apple

        func handleSignInWithApple() {
            let nonce = randomNonceString()
            currentNonce = nonce
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = sha256(nonce)

            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }

        func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
            guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let window = scene.windows.first(where: { $0.isKeyWindow }) else {
                return UIWindow()
            }
            return window
        }

        func authorizationController(controller: ASAuthorizationController,
                                     didCompleteWithAuthorization authorization: ASAuthorization) {
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let nonce = currentNonce,
                  let tokenData = credential.identityToken,
                  let idToken = String(data: tokenData, encoding: .utf8) else {
                callJS("window.appleSignInError('Token manquant')")
                return
            }
            let givenName  = credential.fullName?.givenName  ?? ""
            let familyName = credential.fullName?.familyName ?? ""
            let fullName   = [givenName, familyName].filter { !$0.isEmpty }.joined(separator: " ")

            // Échappe les caractères pour éviter une injection JS
            let safeToken    = idToken.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "'", with: "\\'")
            let safeNonce    = nonce.replacingOccurrences(of: "'", with: "")
            let safeName     = fullName.replacingOccurrences(of: "'", with: "")
            callJS("window.appleSignInResult('\(safeToken)', '\(safeNonce)', '\(safeName)')")
        }

        func authorizationController(controller: ASAuthorizationController,
                                     didCompleteWithError error: Error) {
            // Ignore les annulations volontaires
            if let authError = error as? ASAuthorizationError, authError.code == .canceled { return }
            callJS("window.appleSignInError('Connexion Apple impossible')")
        }

        // MARK: Nonce helpers

        private func randomNonceString(length: Int = 32) -> String {
            var randomBytes = [UInt8](repeating: 0, count: length)
            _ = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
            let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
            return String(randomBytes.map { charset[Int($0) % charset.count] })
        }

        private func sha256(_ input: String) -> String {
            let data = Data(input.utf8)
            let hash = SHA256.hash(data: data)
            return hash.compactMap { String(format: "%02x", $0) }.joined()
        }

        // MARK: WKUIDelegate — permet à confirm() et alert() de fonctionner

        func webView(
            _ webView: WKWebView,
            runJavaScriptAlertPanelWithMessage message: String,
            initiatedByFrame frame: WKFrameInfo,
            completionHandler: @escaping () -> Void
        ) {
            presentAlert(message: message, confirm: false) { _ in completionHandler() }
        }

        func webView(
            _ webView: WKWebView,
            runJavaScriptConfirmPanelWithMessage message: String,
            initiatedByFrame frame: WKFrameInfo,
            completionHandler: @escaping (Bool) -> Void
        ) {
            presentAlert(message: message, confirm: true) { completionHandler($0) }
        }

        // Bridge JS → Swift pour confirm() : webkit.messageHandlers.showConfirm.postMessage({message, ok, cancel})
        func handleShowConfirm(_ body: [String: Any]) {
            let message  = body["message"]  as? String ?? ""
            let cbOk     = body["ok"]       as? String ?? ""
            let cbCancel = body["cancel"]   as? String ?? ""
            presentAlert(message: message, confirm: true) { [weak self] confirmed in
                self?.callJS(confirmed ? cbOk : cbCancel)
            }
        }

        private func presentAlert(message: String, confirm: Bool, completion: @escaping (Bool) -> Void) {
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            if confirm {
                alert.addAction(UIAlertAction(title: "Annuler", style: .cancel)     { _ in completion(false) })
                alert.addAction(UIAlertAction(title: "Confirmer", style: .destructive) { _ in completion(true) })
            } else {
                alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completion(true) })
            }
            guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let root  = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController else {
                completion(false)
                return
            }
            var top = root
            while let presented = top.presentedViewController { top = presented }
            top.present(alert, animated: true)
        }

        // Reçoit le token APNs depuis AppDelegate via NotificationCenter
        @objc func didReceiveAPNsToken(_ notification: Foundation.Notification) {
            guard let token = notification.userInfo?["token"] as? String else { return }
            DispatchQueue.main.async {
                if token.isEmpty {
                    self.callJS("window.nativeNotifResult(false, null)")
                } else {
                    let safe = token.replacingOccurrences(of: "'", with: "")
                    self.callJS("window.nativeNotifResult(true, '\(safe)')")
                }
            }
        }

        private func callJS(_ script: String) {
            webView?.evaluateJavaScript(script, completionHandler: nil)
        }

        // MARK: WKNavigationDelegate
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                withAnimation(.easeOut(duration: 0.4)) {
                    self.parent.isLoaded = true
                }
            }
        }

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
