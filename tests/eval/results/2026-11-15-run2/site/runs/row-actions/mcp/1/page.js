const list = document.getElementById('file-list');
const emptyState = document.getElementById('empty-state');
const toaster = document.getElementById('toaster');

const renameDialog = document.getElementById('rename-dialog');
const renameForm = document.getElementById('rename-form');
const renameField = document.getElementById('rename-field');
const renameSave = document.getElementById('rename-save');

const deleteDialog = document.getElementById('delete-dialog');
const deleteMessage = document.getElementById('delete-message');
const deleteConfirm = document.getElementById('delete-confirm');

/** The row the open dialog is acting on. */
let activeRow = null;

const nameOf = (row) => row.dataset.name;

function notify(message, variant = 'success') {
  toaster.show(message, { variant });
}

/** Move keyboard focus to a row's Actions button. */
function focusMenu(row) {
  const menu = row?.querySelector('va-menu');
  if (!menu) return;
  const trigger = menu.shadowRoot?.querySelector('[part~="trigger"]');
  (trigger ?? menu).focus();
}

/* ---------- Menus ---------- */

function onSelect(event) {
  const row = event.currentTarget.closest('.file-row');
  if (!row) return;
  const action = event.detail?.value;

  if (action === 'rename') openRename(row);
  else if (action === 'download') download(row);
  else if (action === 'delete') openDelete(row);
}

list.querySelectorAll('va-menu').forEach((menu) => {
  menu.addEventListener('va-select', onSelect);
});

/* ---------- Download ---------- */

function download(row) {
  notify(`Downloading ${nameOf(row)}`, 'info');
}

/* ---------- Rename ---------- */

function openRename(row) {
  activeRow = row;
  renameDialog.heading = `Rename ${nameOf(row)}`;
  renameField.value = nameOf(row);
  renameField.error = '';
  renameDialog.show();
}

function validateName(value) {
  if (!value) return 'Enter a file name.';
  if (/[\\/]/.test(value)) return 'A file name can’t contain / or \\.';
  const taken = [...list.querySelectorAll('.file-row')].some(
    (r) => r !== activeRow && nameOf(r).toLowerCase() === value.toLowerCase(),
  );
  if (taken) return `A file named “${value}” already exists.`;
  return '';
}

function saveRename() {
  if (!activeRow) return;
  const value = renameField.value.trim();
  const error = validateName(value);
  renameField.error = error;
  if (error) {
    renameField.focus();
    return;
  }

  const oldName = nameOf(activeRow);
  if (value !== oldName) {
    activeRow.dataset.name = value;
    activeRow.querySelector('.file-name').textContent = value;
    notify(`Renamed ${oldName} to ${value}`);
  }
  renameDialog.close();
}

renameSave.addEventListener('click', saveRename);
renameForm.addEventListener('submit', (event) => {
  event.preventDefault();
  saveRename();
});
renameField.addEventListener('input', () => {
  if (renameField.error) renameField.error = '';
});

renameDialog.addEventListener('va-close', () => {
  const row = activeRow;
  activeRow = null;
  // Return focus to the row's Actions button once the dialog has closed.
  requestAnimationFrame(() => focusMenu(row));
});

/* ---------- Delete ---------- */

function openDelete(row) {
  activeRow = row;
  deleteDialog.heading = `Delete ${nameOf(row)}?`;
  deleteMessage.textContent = `${nameOf(row)} will be deleted. You can’t undo this.`;
  deleteDialog.show();
}

let focusAfterDelete = null;

deleteConfirm.addEventListener('click', () => {
  const row = activeRow;
  if (!row) return;
  const name = nameOf(row);
  const next = row.nextElementSibling ?? row.previousElementSibling;

  row.remove();
  focusAfterDelete = next ?? emptyState;

  if (!list.querySelector('.file-row')) {
    list.hidden = true;
    emptyState.hidden = false;
  }

  notify(`Deleted ${name}`);
  deleteDialog.close();
});

deleteDialog.addEventListener('va-close', () => {
  const row = activeRow;
  const target = focusAfterDelete;
  activeRow = null;
  focusAfterDelete = null;

  requestAnimationFrame(() => {
    if (target === emptyState) emptyState.focus();
    else focusMenu(target ?? row);
  });
});
