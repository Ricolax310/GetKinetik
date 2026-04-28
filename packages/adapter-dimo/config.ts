// ============================================================================
// DIMO Developer Credentials — GETKINETIK license #986
// ----------------------------------------------------------------------------
// Client ID and API key from console.dimo.org/license/986
// These are used by DIMOAdapter to authenticate with DIMO's Token Exchange API
// and to display GETKINETIK's name on the "Login with DIMO" consent screen.
//
// The API key is NOT a user secret — it identifies the app, not the user.
// Users authenticate separately via "Login with DIMO" OAuth flow.
// ============================================================================

export const DIMO_CLIENT_ID = '0x6eF481b692a4b0bC930c1B971EBDA4402c73725D';
export const DIMO_API_KEY = '64678ab490157f53a98f45b253840eb6abae6800de20fdc9432e87a6c582ea9f';
// Must EXACTLY match an Authorized Redirect URI on DIMO License #986.
//
// DIMO's developer console only accepts http:// or https:// redirect URIs —
// it rejects custom-scheme deep links like `getkinetik://...`. So we register
// an HTTPS bounce page at https://getkinetik.app/dimo-callback (served from
// landing/dimo-callback/index.html on Cloudflare Pages) and let
// expo-web-browser's openAuthSessionAsync intercept the redirect.
//
// How the round-trip works on Android:
//   1. App opens login.dimo.org via WebBrowser.openAuthSessionAsync(authUrl, redirectUri)
//   2. DIMO 302's the Custom Tab to https://getkinetik.app/dimo-callback?wallet=0x…
//   3. expo-web-browser sees the URL prefix match the redirectUri, force-closes
//      the Custom Tab, and returns { type: 'success', url: '<full URL>' }
//   4. Adapter parses the wallet param off the returned URL
//
// The bounce page itself usually never renders — the Custom Tab is closed
// before paint. It exists as a fallback for stock Android browsers and for
// users who tap a stale email link.
//
// IMPORTANT: this exact URL must be added to DIMO console License #986
//   → Authorized Redirect URIs:  https://getkinetik.app/dimo-callback
export const DIMO_REDIRECT_URI = 'https://getkinetik.app/dimo-callback';
