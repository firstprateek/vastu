const list = document.getElementById('file-list');
const empty = document.getElementById('files-empty');
const heading = document.getElementById('files-heading');
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

const notify = (message, variant = 'info') => toaster.show(message, { variant });

const fileNames = () => [...list.querySelectorAll('.file')].map((row) => row.dataset.file);

/* One listener handles every row's menu. */
list.addEventListener('va-select', (event) => {
  const row = event.target.closest('.file');
  if (!row) return;
  const name = row.dataset.file;

  switch (event.detail.value) {
    case 'rename':
      activeRow = row;
      renameField.error = '';
      renameField.value = name;
      renameDialog.show();
      break;
    case 'download':
      notify(`Downloading ${name}…`);
      break;
    case 'delete':
      activeRow = row;
      deleteMessage.textContent = `“${name}” will be deleted. You can't undo this.`;
      deleteDialog.show();
      break;
  }
});

/* ---------- Rename ---------- */

function saveRename() {
  if (!activeRow) return;
  const oldName = activeRow.dataset.file;
  const newName = renameField.value.trim();

  if (!newName) {
    renameField.error = 'Enter a file name.';
    return;
  }
  if (/[\\/]/.test(newName)) {
    renameField.error = 'A file name can’t contain / or \\.';
    return;
  }
  if (newName !== oldName && fileNames().includes(newName)) {
    renameField.error = `A file called “${newName}” already exists.`;
    return;
  }

  renameField.error = '';
  if (newName !== oldName) {
    activeRow.dataset.file = newName;
    activeRow.querySelector('.file__name').textContent = newName;
    activeRow.querySelector('va-menu').label = `Actions for ${newName}`;
    notify(`Renamed “${oldName}” to “${newName}”.`, 'success');
  }
  renameDialog.close();
}

renameSave.addEventListener('click', saveRename);

renameForm.addEventListener('submit', (event) => {
  event.preventDefault();
  saveRename();
});

renameField.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    saveRename();
  }
});

renameField.addEventListener('input', () => {
  if (renameField.error) renameField.error = '';
});

renameDialog.addEventListener('va-open', () => {
  renameField.select();
});

renameDialog.addEventListener('va-close', (event) => {
  if (!event.defaultPrevented) activeRow = null;
});

/* ---------- Delete ---------- */

function focusAfterDelete(target) {
  // Wait for the dialog to finish returning focus, then move it somewhere that still exists.
  requestAnimationFrame(() => {
    if (target) {
      target.focus();
      if (document.activeElement === target || target.contains(document.activeElement)) return;
    }
    heading.focus();
  });
}

deleteConfirm.addEventListener('click', () => {
  if (!activeRow) return;
  const row = activeRow;
  const name = row.dataset.file;
  const nextRow = row.nextElementSibling || row.previousElementSibling;

  deleteDialog.close();
  row.remove();
  activeRow = null;

  const remaining = list.querySelectorAll('.file').length;
  list.hidden = remaining === 0;
  empty.hidden = remaining !== 0;

  notify(`Deleted “${name}”.`, 'success');
  focusAfterDelete(nextRow ? nextRow.querySelector('va-menu') : null);
});

deleteDialog.addEventListener('va-close', (event) => {
  if (!event.defaultPrevented) activeRow = null;
});
