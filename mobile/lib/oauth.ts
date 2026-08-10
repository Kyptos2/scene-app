import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';

// Required once per app load so the browser-based Google flow can hand
// control back to the app when it redirects home.
WebBrowser.maybeCompleteAuthSession();

// These come from your own Google Cloud OAuth client (console.cloud.google.com
// → APIs & Services → Credentials) — one client ID per platform, all under
// the same project. Until they're set, isGoogleSignInConfigured is false and
// the Welcome screen shows the button as disabled rather than letting it
// throw when pressed.
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export const isGoogleSignInConfigured = !!(GOOGLE_IOS_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID);

// expo-auth-session's Google provider throws SYNCHRONOUSLY, at hook-init
// time, if the client ID for the current platform is undefined — not just
// when promptAsync() is called. Without a placeholder here, the Welcome
// screen would crash for every user until real credentials are set, since
// the hook runs on every render regardless of whether the button is ever
// tapped. The placeholder only satisfies that internal check; it can't
// complete a real sign-in. isGoogleSignInConfigured (checked before ever
// calling promptAsync) is what actually gates whether sign-in proceeds.
const PLACEHOLDER_CLIENT_ID = 'not-configured.apps.googleusercontent.com';

// expo-auth-session's Google provider is the one approach that works the
// same way across web, iOS, and Android without a native config plugin or
// a dev-client rebuild — that matters here since this app is developed and
// verified through `expo start --web`. It's marked deprecated upstream in
// favor of @react-native-google-signin/google-signin, which needs native
// build config this project doesn't have; swap to that later if/when this
// ships to app stores and picks up a real native build.
export function useGoogleSignIn() {
  return Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID ?? PLACEHOLDER_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID ?? PLACEHOLDER_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID ?? PLACEHOLDER_CLIENT_ID,
  });
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export type AppleSignInResult = { identityToken: string; fullName: string | null };

// Rejects with code 'ERR_REQUEST_CANCELED' if the user dismisses the sheet
// — callers should treat that as a silent no-op, not an error to surface.
export async function signInWithApple(): Promise<AppleSignInResult> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple sign-in did not return an identity token.');
  }

  const fullName = credential.fullName
    ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ') || null
    : null;

  return { identityToken: credential.identityToken, fullName };
}
