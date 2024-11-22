// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBbhFe7hevcmKN155c6nKh8oAoo52MKc3I",
  authDomain: "audiojournal-18399.firebaseapp.com",
  projectId: "audiojournal-18399",
  storageBucket: "audiojournal-18399.firebasestorage.app",
  messagingSenderId: "777793270586",
  appId: "1:777793270586:web:990bcddba63879361f5603",
  measurementId: "G-S1L8L4BKSS"
  
};

// Initialize Firebase
// export const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

const app = initializeApp(firebaseConfig); // Ensure this line is called
export const auth = getAuth(app); // Pass the `app` object here