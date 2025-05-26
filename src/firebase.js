import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD-qiVPsBcLtq1RIxo7hbaaDLFq3nr-AgY",
  authDomain: "ibroadcast-school.firebaseapp.com",
  projectId: "ibroadcast-school",
  storageBucket: "ibroadcast-school.appspot.com",
  messagingSenderId: "401101981791",
  appId: "1:401101981791:web:31d30b8d601c6d68d9b3ea",
  measurementId: "G-HQ8T45JTFK"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export { auth, provider, db };