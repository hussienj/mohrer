
// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app'; // Use 'import type' for type-only imports

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDqGTfHTuj1cu2a6eTPYR29l7H65Q-x810",
  authDomain: "murasil-al-moalem.firebaseapp.com",
  databaseURL: "https://murasil-al-moalem-default-rtdb.firebaseio.com",
  projectId: "murasil-al-moalem",
  storageBucket: "murasil-al-moalem.firebasestorage.app",
  messagingSenderId: "314929620446",
  appId: "1:314929620446:web:fb7abd1cee260d85dca94f"
};

// Initialize Firebase using the modular SDK
const app: FirebaseApp = initializeApp(firebaseConfig);

// Export the Firebase app instance to be used in other files
export { app as firebaseApp };
