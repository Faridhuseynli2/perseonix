export const CREDENTIALS_MODULE_KEY = "credentials"

// Data classes HIBP returns that mean a secret (not just an identifier) leaked;
// used to flag the most serious breaches in the UI.
export const SENSITIVE_DATA_CLASSES = new Set<string>([
  "Passwords",
  "Password hints",
  "Security questions and answers",
  "Auth tokens",
  "Encrypted keys",
  "Partial credit card data",
  "Credit cards",
  "Bank account numbers",
])
