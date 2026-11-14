// Phase UI-2: presentation only. Google Auth is used for the private song-review queue,
// not for the legacy Study/SRS, Speak, or Course progress tables.
export const escapeAccountText = value => String(value || '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function songSyncStatus(state) {
  if (state.status === 'connecting') return { label: 'Checking account…', tone: 'muted' };
  if (state.status === 'error') return { label: 'Sync needs attention', tone: 'warning' };
  if (!state.signedIn) return { label: 'On this device only', tone: 'muted' };
  if (state.status === 'syncing') return { label: 'Syncing song reviews…', tone: 'muted' };
  if (state.status === 'synced') return { label: 'Song reviews synced', tone: 'success' };
  return { label: 'Waiting to sync', tone: 'muted' };
}

export function renderAccountMarkup(state, { pending = false, error = '' } = {}) {
  const status = songSyncStatus(state);
  const lastSynced = state.lastSynced && Number.isFinite(Date.parse(state.lastSynced))
    ? new Date(state.lastSynced).toLocaleString() : '';

  return `
    <div class="settings-account-top">
      <div class="settings-account-avatar" aria-hidden="true">${state.signedIn ? '✓' : 'G'}</div>
      <div class="settings-account-identity">
        <div class="settings-account-name">${state.signedIn ? 'Google account connected' : 'Not signed in'}</div>
        ${state.signedIn ? `<div class="settings-account-email">${escapeAccountText(state.email || 'Google account')}</div>`
          : '<div class="settings-account-email">Studying without an account is supported.</div>'}
      </div>
    </div>
    <div class="settings-account-sync" data-tone="${status.tone}">
      <span aria-hidden="true">☁</span><span aria-live="polite">${status.label}</span>
    </div>
    <div class="settings-account-explain">Google sign-in is optional and syncs <strong>Song &amp; Chants reviews only</strong> across devices. Regular Study/SRS, Speak and Course progress are not linked to this account.</div>
    ${state.signedIn ? `
      ${lastSynced ? `<div class="settings-account-last">Last song-review sync: ${escapeAccountText(lastSynced)}</div>` : ''}
      <div class="settings-account-actions">
        <button type="button" class="settings-account-button primary" data-account-action="sync" ${pending || state.status === 'syncing' ? 'disabled' : ''}>↻ Sync now</button>
        <button type="button" class="settings-account-button" data-account-action="out" ${pending ? 'disabled' : ''}>Sign out</button>
      </div>
      <div class="settings-account-explain secondary">Signing out keeps existing song reviews on this device.</div>
    ` : `
      <div class="settings-account-actions">
        <button type="button" class="settings-account-button primary" data-account-action="google" ${pending ? 'disabled' : ''}>Continue with Google</button>
      </div>
    `}
    ${state.message ? `<div class="settings-account-error" role="status">${escapeAccountText(state.message)}</div>` : ''}
    ${error ? `<div class="settings-account-error" role="alert">${escapeAccountText(error)}</div>` : ''}
  `;
}

export function renderReviewSyncMarkup(state) {
  const status = songSyncStatus(state);
  return `<span class="srs-sync-compact-label">☁ Song reviews: <span data-tone="${status.tone}" aria-live="polite">${status.label}</span></span>
    <button type="button" data-review-account>Manage in Settings →</button>`;
}
