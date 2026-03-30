importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDexH0FEUl7-BzKyw6KlxdeW8CzpzUXK-E",
  authDomain: "dawam-e8ee6.firebaseapp.com",
  projectId: "dawam-e8ee6",
  storageBucket: "dawam-e8ee6.firebasestorage.app",
  messagingSenderId: "878189379770",
  appId: "1:878189379770:web:7110ce18ff799df1f04283"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  self.registration.showNotification(
    payload.notification?.title || "Dawam",
    {
      body: payload.notification?.body || "",
      icon: "/Dawam/icon-192.png",
      badge: "/Dawam/icon-192.png",
      vibrate: [200, 100, 200]
    }
  );
});
