// Switches apply immediately: remember each one's state on this device
// and announce the change in the panel's status line.
const STORAGE_PREFIX = 'settings:';

const groups = [
  { status: 'notifications-status', ids: ['email-updates', 'push-notifications'] },
  { status: 'privacy-status', ids: ['public-profile', 'activity-status'] },
];

function readStored(id) {
  try {
    return localStorage.getItem(STORAGE_PREFIX + id);
  } catch {
    return null;
  }
}

function store(id, on) {
  try {
    localStorage.setItem(STORAGE_PREFIX + id, on ? 'on' : 'off');
  } catch {
    // Storage unavailable (private mode, blocked): the change still applies for this visit.
  }
}

function labelOf(sw) {
  // The visible label is the switch's own text, without its description.
  const text = [...sw.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent)
    .join(' ')
    .trim();
  return text || sw.getAttribute('label') || 'Setting';
}

for (const group of groups) {
  const status = document.getElementById(group.status);

  for (const id of group.ids) {
    const sw = document.getElementById(id);
    if (!sw) continue;

    const saved = readStored(id);
    if (saved !== null) sw.checked = saved === 'on';

    sw.addEventListener('change', (event) => {
      const on = event.target.checked;
      store(id, on);
      if (status) status.textContent = `${labelOf(sw)} turned ${on ? 'on' : 'off'}.`;
    });
  }
}
