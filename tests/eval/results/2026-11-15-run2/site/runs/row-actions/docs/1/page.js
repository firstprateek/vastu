const list = document.getElementById('file-list');
const heading = document.getElementById('files-heading');
const count = document.getElementById('files-count');
const empty = document.getElementById('files-empty');
const toaster = document.getElementById('toaster');

const renameForm = document.getElementById('rename-form');
const renameDialog = document.getElementById('rename-dialog');
const renameField = document.getElementById('rename-field');

const deleteDialog = document.getElementById('delete-dialog');
const deleteName = document.getElementById('delete-name');
const deleteConfirm = document.getElementById('delete-confirm');

/** The row the open dialog acts on. */
let current = null;

const nameOf = (row) => row.dataset.file;

function setName(row, name) {
  row.dataset.file = name;
  row.querySelector('.file__name').textContent = name;
}

function updateCount() {
  const n = list.querySelectorAll('.file').length;
  count.textContent = n === 1 ? '1 file' : `${n} files`;
  empty.hidden = n > 0;
}

function notify(message, variant) {
  if (variant) toaster.show(message, { variant });
  else toaster.show(message);
}

/* ---------- Menu actions ---------- */

list.addEventListener('va-select', (event) => {
  const row = event.target.closest('.file');
  if (!row) return;
  current = row;

  switch (event.detail.value) {
    case 'rename':
      renameField.error = '';
      renameField.value = nameOf(row);
      renameDialog.heading = `Rename ${nameOf(row)}`;
      renameDialog.show();
      break;
    case 'download':
      notify(`Downloading ${nameOf(row)}`);
      break;
    case 'delete':
      deleteName.textContent = nameOf(row);
      deleteDialog.heading = `Delete ${nameOf(row)}?`;
      deleteDialog.show();
      break;
  }
});

/* ---------- Rename ---------- */

function validateName(name) {
  if (!name) return 'Enter a file name.';
  if (/[\\/]/.test(name)) return 'A file name can’t contain / or \\.';
  const taken = [...list.querySelectorAll('.file')].some(
    (row) => row !== current && nameOf(row).toLowerCase() === name.toLowerCase(),
  );
  if (taken) return 'A file with this name already exists.';
  return '';
}

renameField.addEventListener('input', () => {
  if (renameField.error) renameField.error = '';
});

renameField.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    renameForm.requestSubmit();
  }
});

renameForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!current || !renameDialog.open) return;

  const name = renameField.value.trim();
  const error = validateName(name);
  if (error) {
    renameField.error = error;
    renameField.focus();
    return;
  }

  const old = nameOf(current);
  renameDialog.close();
  if (name !== old) {
    setName(current, name);
    notify(`Renamed ${old} to ${name}`, 'success');
  }
});

/* ---------- Delete ---------- */

deleteConfirm.addEventListener('click', () => {
  if (!current) return;
  const row = current;
  const name = nameOf(row);
  current = null;

  deleteDialog.close();
  row.remove();
  updateCount();
  notify(`Deleted ${name}`, 'success');

  // The row's Actions button is gone, so move focus to the list heading
  // after the dialog has finished restoring focus.
  requestAnimationFrame(() => heading.focus());
});

updateCount();
