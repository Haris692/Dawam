import SwiftUI
import WebKit
import UserNotifications

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

        // Bridge pour les demandes de permission de notification
        config.userContentController.add(context.coordinator, name: "requestNotifPermission")

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

        // Stocke la référence pour les callbacks Swift → JS
        context.coordinator.webView = webView

        let url = URL(string: "https://haris692.github.io/Dawam/")!
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    // MARK: - Coordinator (navigation + script message delegate)
    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: DawamWebView
        weak var webView: WKWebView?

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
            guard message.name == "requestNotifPermission" else { return }

            UNUserNotificationCenter.current().requestAuthorization(
                options: [.alert, .sound, .badge]
            ) { granted, _ in
                DispatchQueue.main.async {
                    if granted {
                        UIApplication.shared.registerForRemoteNotifications()
                        // Le token arrivera via didReceiveAPNsToken
                    } else {
                        self.callJS("window.nativeNotifResult(false, null)")
                    }
                }
            }
        }

        // Reçoit le token APNs depuis AppDelegate via NotificationCenter
        @objc func didReceiveAPNsToken(_ notification: Foundation.Notification) {
            guard let token = notification.userInfo?["token"] as? String else { return }
            DispatchQueue.main.async {
                if token.isEmpty {
                    self.callJS("window.nativeNotifResult(false, null)")
                } else {
                    // Échappe le token pour éviter toute injection
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
