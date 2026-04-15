import SwiftUI
import UserNotifications

// Notification interne pour transmettre le token APNs au Coordinator
extension Notification.Name {
    static let apnsTokenReceived = Notification.Name("apnsTokenReceived")
}

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
        return true
    }

    // Token APNs reçu → transmis au Coordinator via NotificationCenter + stocké en local
    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        print("[APNs] Token: \(token)")
        UserDefaults.standard.set(token, forKey: "apnsDeviceToken")
        NotificationCenter.default.post(
            name: .apnsTokenReceived,
            object: nil,
            userInfo: ["token": token]
        )
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("[APNs] Échec enregistrement: \(error)")
        #if targetEnvironment(simulator)
        // Le simulateur ne supporte pas APNs → on simule un token pour que l'UI s'active
        NotificationCenter.default.post(
            name: .apnsTokenReceived,
            object: nil,
            userInfo: ["token": "simulator-token"]
        )
        #else
        NotificationCenter.default.post(
            name: .apnsTokenReceived,
            object: nil,
            userInfo: ["token": ""]
        )
        #endif
    }

    // Efface le badge quand l'app passe au premier plan
    func applicationDidBecomeActive(_ application: UIApplication) {
        UNUserNotificationCenter.current().setBadgeCount(0, withCompletionHandler: nil)
        clearBadgeAPNs()
    }

    // Appelle le push-worker pour remettre le badge APNs à 0 côté serveur
    private func clearBadgeAPNs() {
        guard let token = UserDefaults.standard.string(forKey: "apnsDeviceToken"),
              !token.isEmpty, token != "simulator-token" else { return }
        guard let url = URL(string: "https://dawam-push.mydawam.workers.dev/clear-badge-apns") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: ["deviceToken": token])
        URLSession.shared.dataTask(with: req) { _, _, error in
            if let error = error { print("[APNs] clearBadge error: \(error)") }
        }.resume()
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
