/** Stops Google from silently signing the same account back in after an explicit logout. */
export function signOutGoogle() {
  window.google?.accounts.id.disableAutoSelect()
}
