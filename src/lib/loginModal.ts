/**
 * Tiny pub/sub so any component on the landing page can request the
 * login modal to open without prop-drilling. HomeNav owns the modal
 * state and listens for this event.
 */
export const LOGIN_EVENT = 'apas:open-login';

export function triggerLogin() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(LOGIN_EVENT));
}
