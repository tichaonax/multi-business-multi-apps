// MBM-363: after any sign-in, go to the user's home with a FULL page load so
// nothing from the previous user survives (cached pages, business, the tab's
// Back trail). replace() keeps Back out of the old session.
const PER_USER_TAB_KEYS = ['mbm:navTrail', 'mbm:item-sales-return', 'mbm:shortcutVisits']

export function goHomeAfterSignIn() {
  try { PER_USER_TAB_KEYS.forEach(k => sessionStorage.removeItem(k)) } catch { /* private mode etc. */ }
  window.location.replace('/auth/redirect')
}
