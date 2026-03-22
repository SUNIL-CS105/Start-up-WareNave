// ============================================================
// WareNave — firebase.js
// New Firebase project: version-2-warenave
// ============================================================

window.firebaseConfig = {
  apiKey: "AIzaSyCJSRwEyvRk1tL4ML9BhueY1oqwTOlDSzs",
  authDomain: "version-2-warenave.firebaseapp.com",
  databaseURL: "https://version-2-warenave-default-rtdb.firebaseio.com",
  projectId: "version-2-warenave",
  storageBucket: "version-2-warenave.firebasestorage.app",
  messagingSenderId: "314682735918",
  appId: "1:314682735918:web:8c530cb069f0ba43408ebf"
};

if (!firebase.apps.length) {
  firebase.initializeApp(window.firebaseConfig);
}

window.database = firebase.database();
