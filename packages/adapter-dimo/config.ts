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
// Custom-scheme deep link is required for Android Chrome Custom Tabs to bounce
// back to the app after OAuth. An https:// redirect just opens the website and
// never returns control. The scheme `getkinetik` is registered in app.json
// (expo.scheme) so the OS knows to route this URL to our app.
//
// IMPORTANT: this exact URL must be added to DIMO console License #986
//   → Authorized Redirect URIs:  getkinetik://dimo-callback
export const DIMO_REDIRECT_URI = 'getkinetik://dimo-callback';
