import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, fetchSignInMethodsForEmail } from "firebase/auth";
import { auth } from "./firebaseConfig";

export const registerUser = async (email, password) => {
  try {
    // Check if the email is already registered
    const methods = await fetchSignInMethodsForEmail(auth, email);
    
    if (methods.length > 0) {
      // If methods array is not empty, the email is already in use
      console.log("Email already registered with another method:", methods);
      throw new Error("Email is already registered. Please use a different email or log in.");
    }

    // Proceed with user registration
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log("User registered:", user.uid);
    return user;

  } catch (error) {
    console.error("Error registering user:", error.message);
    throw error;
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("Logged in as:", user.email);
    return user.uid;
  } catch (error) {
    console.error("Error logging in:", error.message);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    console.log("User logged out");
  } catch (error) {
    console.error("Error logging out:", error.message);
    throw error;
  }
};

export const observeAuthState = (callback) => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    callback(user);
  });
  return unsubscribe;
};


