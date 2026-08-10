// In-memory holder for the current bearer token. AuthContext is the only
// writer (on login/signup/logout); api.ts reads it to attach the
// Authorization header on authenticated requests. A single mutable module
// value is fine here — this is a client app with exactly one active session.
let currentToken: string | null = null;

export function setAuthToken(token: string | null) {
  currentToken = token;
}

export function getAuthToken(): string | null {
  return currentToken;
}
