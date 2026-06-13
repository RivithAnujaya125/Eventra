/**
 * Maps raw Firebase authentication error codes or messages into highly polished,
 * user-friendly, production-grade error descriptions.
 */
export function getFriendlyAuthErrorMessage(error: any): string {
  if (!error) return "An unexpected error occurred. Please try again.";

  // If the error passed is a plain string
  if (typeof error === "string") {
    if (error.includes("auth/invalid-credential")) {
      return "Incorrect email or password. Please double-check your credentials and try again.";
    }
    if (error.includes("auth/email-already-in-use")) {
      return "This email is already registered. Try signing in or choosing a different email.";
    }
    return error;
  }

  const code = typeof error === "object" ? (error.code || "") : "";
  const message = typeof error === "object" ? (error.message || "") : "";

  // Firebase Auth Error Codes
  switch (code) {
    case "auth/invalid-credential":
      return "Incorrect email or password. Please double-check your credentials and try again.";
    case "auth/wrong-password":
      return "Incorrect password. Please verify and try again.";
    case "auth/user-not-found":
      return "No account exists with this email address. Please sign up first.";
    case "auth/invalid-email":
      return "The email address you entered is invalid. Please try another one.";
    case "auth/email-already-in-use":
      return "This email is already registered. Try signing in or choosing a different email.";
    case "auth/weak-password":
      return "Your password is too weak. Please use a password with at least 6 characters.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled for this application. Please contact the administrator.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact customer support for assistance.";
    case "auth/too-many-requests":
      return "Too many failed attempts. This account has been temporarily locked. Please try again later or reset your password.";
    case "auth/network-request-failed":
      return "A network connection error occurred. Please check your internet connection and try again.";
    default:
      // Fallback fallback parser for raw messages
      if (message.includes("auth/invalid-credential")) {
        return "Incorrect email or password. Please double-check your credentials and try again.";
      }
      if (message.includes("auth/email-already-in-use")) {
        return "This email is already registered. Try signing in or choosing a different email.";
      }
      return message || "An unexpected error occurred. Please try again.";
  }
}
