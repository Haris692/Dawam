import SwiftUI
import WebKit
import UserNotifications
import AuthenticationServices
import CryptoKit
import StoreKit

// MARK: - Tabs

enum TabItem: String, CaseIterable {
    case accueil = "path"
    case invocations = "invocations"
    case groupes = "groupes"
    case profil = "profil"

    var tabId: String { "tab-\(rawValue)" }

    var label: String {
        switch self {
        case .accueil:     return "Accueil"
        case .invocations: return "Invocations"
        case .groupes:     return "Groupes"
        case .profil:      return "Profil"
        }
    }

    var icon: String {
        switch self {
        case .accueil:     return "house"
        case .invocations: return "hands.sparkles"
        case .groupes:     return "person.3"
        case .profil:      return "person.circle"
        }
    }
}

// MARK: - WKWebView wrapper

struct DawamWebView: UIViewRepresentable {

    @Binding var isLoaded: Bool
    @Binding var activeTab: TabItem
    var assignedTab: TabItem = .accueil

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.websiteDataStore = .default()

        let nativeFlag = WKUserScript(
            source: "window.isNativeIOSApp = true;",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(nativeFlag)

        // Sur iOS 26 : cache la web nav et intercepte les changements d'onglet
        if #available(iOS 26.0, *) {
            let hideNavAndPatch = WKUserScript(
                source: """
                (function() {
                    var nav = document.getElementById('bottom-nav');
                    if (nav) nav.style.setProperty('display','none','important');

                    var orig = window.showTab;
                    if (orig) {
                        window.showTab = function(id, el) {
                            orig.call(this, id, el);
                            window.webkit?.messageHandlers?.tabChanged?.postMessage(id);
                        };
                    }
                })();
                """,
                injectionTime: .atDocumentEnd,
                forMainFrameOnly: true
            )
            config.userContentController.addUserScript(hideNavAndPatch)
            config.userContentController.add(context.coordinator, name: "tabChanged")
        }

        config.userContentController.add(context.coordinator, name: "requestNotifPermission")
        config.userContentController.add(context.coordinator, name: "showConfirm")
        config.userContentController.add(context.coordinator, name: "signInWithApple")
        config.userContentController.add(context.coordinator, name: "purchaseSubscription")
        config.userContentController.add(context.coordinator, name: "restorePurchases")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.backgroundColor = UIColor(red: 0.961, green: 0.929, blue: 0.878, alpha: 1)

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

        context.coordinator.webView = webView

        #if PREPROD
        let url = URL(string: "https://haris692.github.io/Dawam/preprod/")!
        #else
        let url = URL(string: "https://haris692.github.io/Dawam/")!
        #endif
        webView.load(URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 30))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    // MARK: - Coordinator

    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler, WKUIDelegate,
                       ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
        var parent: DawamWebView
        weak var webView: WKWebView?
        var currentNonce: String?
        private var isAppleSignInInProgress = false
        var lastNativeTab: TabItem = .accueil

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
            if message.name == "tabChanged", let id = message.body as? String,
               let tab = TabItem(rawValue: id) {
                DispatchQueue.main.async { self.parent.activeTab = tab }
                lastNativeTab = tab
                return
            }
            if message.name == "showConfirm", let body = message.body as? [String: Any] {
                handleShowConfirm(body); return
            }
            if message.name == "signInWithApple" {
                handleSignInWithApple(); return
            }
            if message.name == "purchaseSubscription" {
                Task { @MainActor in await self.handlePurchaseSubscription() }
                return
            }
            if message.name == "restorePurchases" {
                Task { await self.handleRestorePurchases() }
                return
            }
            guard message.name == "requestNotifPermission" else { return }

            UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
                DispatchQueue.main.async {
                    switch settings.authorizationStatus {
                    case .denied:
                        self?.callJS("window.nativeNotifResult(false, null)")
                        if let url = URL(string: UIApplication.openSettingsURLString) {
                            UIApplication.shared.open(url)
                        }
                    case .authorized, .provisional:
                        UIApplication.shared.registerForRemoteNotifications()
                    default:
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
            guard !isAppleSignInInProgress else { return }
            isAppleSignInInProgress = true
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
            if let window = webView?.window { return window }
            let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            let active = scenes.first(where: { $0.activationState == .foregroundActive }) ?? scenes.first
            return active?.windows.first(where: { $0.isKeyWindow }) ?? active?.windows.first ?? UIWindow()
        }

        func authorizationController(controller: ASAuthorizationController,
                                     didCompleteWithAuthorization authorization: ASAuthorization) {
            defer { currentNonce = nil; isAppleSignInInProgress = false }
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

            let payload: [String: String] = ["idToken": idToken, "nonce": nonce, "fullName": fullName]
            guard let data = try? JSONSerialization.data(withJSONObject: payload),
                  let json = String(data: data, encoding: .utf8) else {
                callJS("window.appleSignInError('Erreur encodage payload')")
                return
            }
            callJS("window.appleSignInResult(\(json))")
        }

        func authorizationController(controller: ASAuthorizationController,
                                     didCompleteWithError error: Error) {
            currentNonce = nil
            isAppleSignInInProgress = false
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

        // MARK: WKUIDelegate

        // window.open(url, '_blank') côté JS (ex: page de don) → ouvre Safari, jamais la WebView
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                     for navigationAction: WKNavigationAction,
                     windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = navigationAction.request.url,
               url.scheme == "http" || url.scheme == "https" {
                UIApplication.shared.open(url)
            }
            return nil
        }

        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            presentAlert(message: message, confirm: false) { _ in completionHandler() }
        }

        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            presentAlert(message: message, confirm: true) { completionHandler($0) }
        }

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
                alert.addAction(UIAlertAction(title: "Annuler",    style: .cancel)      { _ in completion(false) })
                alert.addAction(UIAlertAction(title: "Confirmer",  style: .destructive) { _ in completion(true)  })
            } else {
                alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completion(true) })
            }
            guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let root  = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController else {
                completion(false); return
            }
            var top = root
            while let presented = top.presentedViewController { top = presented }
            top.present(alert, animated: true)
        }

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

        // MARK: StoreKit 2

        @MainActor
        func handlePurchaseSubscription() async {
            do {
                let products = try await Product.products(for: ["dawam_monthly"])
                guard let product = products.first else {
                    callJS("window.iapResult(false, 'not_found')"); return
                }
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        await transaction.finish()
                        callJS("window.iapResult(true, 'dawam_monthly')")
                    case .unverified:
                        callJS("window.iapResult(false, 'unverified')")
                    }
                case .userCancelled: callJS("window.iapResult(false, 'cancelled')")
                case .pending:       callJS("window.iapResult(false, 'pending')")
                @unknown default:    callJS("window.iapResult(false, 'unknown')")
                }
            } catch {
                callJS("window.iapResult(false, 'error')")
            }
        }

        func handleRestorePurchases() async {
            do {
                try await AppStore.sync()
                var hasActive = false
                for await result in Transaction.currentEntitlements {
                    if case .verified(let transaction) = result,
                       transaction.productID == "dawam_monthly" {
                        hasActive = true
                        await transaction.finish()
                        break
                    }
                }
                let jsVal = hasActive ? "true" : "false"
                DispatchQueue.main.async { self.callJS("window.restoreResult(\(jsVal))") }
            } catch {
                DispatchQueue.main.async { self.callJS("window.restoreResult(false)") }
            }
        }

        private func callJS(_ script: String) {
            webView?.evaluateJavaScript(script, completionHandler: nil)
        }

        // MARK: WKNavigationDelegate

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                if #available(iOS 26.0, *) {
                    let js = "document.getElementById('\(self.parent.assignedTab.tabId)')?.click();"
                    webView.evaluateJavaScript(js, completionHandler: nil)
                }
                withAnimation(.easeOut(duration: 0.5)) {
                    self.parent.isLoaded = true
                }
            }
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let url = navigationAction.request.url, url.host == "haris692.github.io" {
                decisionHandler(.allow)
            } else if navigationAction.request.url?.scheme == "mailto" ||
                      navigationAction.request.url?.scheme == "tel" {
                UIApplication.shared.open(navigationAction.request.url!)
                decisionHandler(.cancel)
            } else if let url = navigationAction.request.url,
                      url.host?.contains("alairdutemps.com") == true {
                // Page de don : toujours dans Safari, jamais dans la WebView
                UIApplication.shared.open(url)
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
    @State private var activeTab: TabItem = .accueil

    var body: some View {
        if #available(iOS 26.0, *) {
            TabView(selection: $activeTab) {
                ForEach(TabItem.allCases, id: \.self) { tab in
                    DawamWebView(isLoaded: $isLoaded, activeTab: $activeTab, assignedTab: tab)
                        .ignoresSafeArea()
                        .tag(tab)
                        .tabItem { Label(tab.label, systemImage: tab.icon) }
                }
            }
            .overlay {
                if !isLoaded { LiquidGlassSplash().transition(.opacity) }
            }
            .animation(.easeOut(duration: 0.5), value: isLoaded)
        } else {
            ZStack {
                DawamWebView(isLoaded: $isLoaded, activeTab: $activeTab)
                    .ignoresSafeArea()
                if !isLoaded {
                    ClassicSplash()
                        .transition(.opacity)
                }
            }
            .animation(.easeOut(duration: 0.5), value: isLoaded)
        }
    }
}

// MARK: - Tab bar native Liquid Glass (iOS 26+)

@available(iOS 26.0, *)
struct NativeTabBar: View {
    @Binding var activeTab: TabItem
    private let accent = Color(red: 0.729, green: 0.459, blue: 0.090)
    private let tabs   = TabItem.allCases
    @Namespace private var ns

    var body: some View {
        GeometryReader { geo in
            let pad  = CGFloat(8)
            let n    = CGFloat(tabs.count)
            let tabW = (geo.size.width - pad * 2) / n
            let barH = geo.size.height

            GlassEffectContainer(spacing: 8) {
                ZStack(alignment: .topLeading) {

                    // Bulle active — matchedGeometryEffect anime le glissement entre onglets
                    let idx = CGFloat(tabs.firstIndex(of: activeTab) ?? 0)
                    Color.clear
                        .frame(width: tabW - 8, height: barH - 12)
                        .glassEffect(
                            .regular.interactive(),
                            in: RoundedRectangle(cornerRadius: 20, style: .continuous)
                        )
                        .matchedGeometryEffect(id: "bubble", in: ns)
                        .offset(x: pad + idx * tabW + 4, y: 6)

                    // Onglets
                    HStack(spacing: 0) {
                        ForEach(tabs, id: \.self) { tab in
                            VStack(spacing: 3) {
                                Image(systemName: tab.icon)
                                    .font(.system(size: 22, weight: .light))
                                Text(tab.label)
                                    .font(.system(size: 10, weight: .medium))
                            }
                            .foregroundStyle(activeTab == tab ? accent : Color(white: 0.38))
                            .frame(width: tabW, height: barH - 12)
                        }
                    }
                    .offset(x: pad, y: 6)
                }
                .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 28, style: .continuous))
            }
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 0, coordinateSpace: .local)
                    .onChanged { value in
                        let idx    = Int((value.location.x - pad) / tabW)
                        let newTab = tabs[min(max(idx, 0), tabs.count - 1)]
                        if newTab != activeTab {
                            withAnimation(.bouncy(duration: 0.45)) { activeTab = newTab }
                        }
                    }
                    .onEnded { value in
                        let idx = Int((value.location.x - pad) / tabW)
                        withAnimation(.bouncy(duration: 0.45)) {
                            activeTab = tabs[min(max(idx, 0), tabs.count - 1)]
                        }
                    }
            )
        }
        .frame(height: 64)
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
        .animation(.bouncy(duration: 0.45), value: activeTab)
    }
}

// MARK: - Splash Liquid Glass (iOS 26+)

@available(iOS 26.0, *)
struct LiquidGlassSplash: View {
    private let accent = Color(red: 0.729, green: 0.459, blue: 0.090)
    private let bg     = Color(red: 0.961, green: 0.929, blue: 0.878)

    var body: some View {
        ZStack {
            bg.ignoresSafeArea()

            Circle()
                .fill(accent.opacity(0.25))
                .frame(width: 260, height: 260)
                .offset(x: -80, y: -120)
                .blur(radius: 60)

            Circle()
                .fill(Color(red: 0.95, green: 0.75, blue: 0.35).opacity(0.20))
                .frame(width: 200, height: 200)
                .offset(x: 90, y: 100)
                .blur(radius: 50)

            GlassEffectContainer {
                VStack(spacing: 10) {
                    Text("Dawam")
                        .font(.custom("Georgia-Bold", size: 52))
                        .foregroundStyle(accent)
                        .kerning(-1)
                    Text("Petit, mais constant.")
                        .font(.custom("Georgia-Italic", size: 15))
                        .foregroundStyle(accent.opacity(0.75))
                }
                .padding(.horizontal, 48)
                .padding(.vertical, 36)
                .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 28, style: .continuous))
            }
        }
    }
}

// MARK: - Splash classique (iOS 15–25)

struct ClassicSplash: View {
    private let bg     = Color(red: 0.961, green: 0.929, blue: 0.878)
    private let accent = Color(red: 0.729, green: 0.459, blue: 0.090)

    var body: some View {
        ZStack {
            bg.ignoresSafeArea()
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
