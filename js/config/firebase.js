// ============================================================
// WareNave — firebase.js
// Initializes Firebase. Credentials remain the same.
// ============================================================

window.firebaseConfig = {
  apiKey: "AIzaSyDgTBFlnjtcbdvuf2l7YUnoHXK9-L4I5MI",
  authDomain: "warehouse-maxsa.firebaseapp.com",
  databaseURL: "https://warehouse-maxsa-default-rtdb.firebaseio.com",
  projectId: "warehouse-maxsa",
  storageBucket: "warehouse-maxsa.firebasestorage.app",
  messagingSenderId: "978214247804",
  appId: "1:978214247804:web:aa785914ee177d74ba98f9"
};

if (!firebase.apps.length) {
  firebase.initializeApp(window.firebaseConfig);
}

window.database = firebase.database();