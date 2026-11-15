const list = document.getElementById('file-list');
const heading = document.getElementById('files-heading');
const emptyMessage = document.getElementById('empty-message');
const toaster = document.getElementById('toaster');

const renameDialog = document.getElementById('rename-dialog');
const renameField = document.getElementById('rename-field');
const renameSave = document.getElementById('rename-save');

const deleteDialog = document.getElementById('delete-dialog');
const deleteMessage = document.getElementById('delete-message');
const deleteConfirm = document.getElementById('delete-confirm');

/** The row the open dialog acts on. */
let currentRow = null;

const notify = (message, variant = 'info') => toaster.show(message, { variant });

const nameOf = (row) => row.dataset.name;

// Let the menu close and return focus to its button before opening a dialog,
// so the dialog sends focus back to that button when it closes.
const afterMenuCloses = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));

list.addEventListener('va-select', (event) => {
  const row = event.target.closest('.file-row');
  if (!row) return;
  currentRow = row;
  const name = nameOf(row);

  switch (event.detail.value) {
    case 'rename':
      afterMenuCloses(() => {
        renameField.error = '';
        renameField.value = name;
        renameDialog.show();
      });
      break;
    case 'download':
      notify(`Downloading ${name}`);
      break;
    case 'delete':
      deleteMessage.textContent = `“${name}” will be deleted. You can't undo this.`;
      afterMenuCloses(() => deleteDialog.show());
      break;
  }
});

/* Rename */

function validateName(value) {
  if (!value) return 'Enter a file name.';
  if (/[\\/]/.test(value)) return 'A file name can’t contain / or \\.';
  const taken = [...list.querySelectorAll('.file-row')].some(
    (row) => row !== currentRow && nameOf(row).toLowerCase() === value.toLowerCase(),
  );
  if (taken) return `A file called “${value}” already exists.`;
  return '';
}

function saveRename() {
  if (!currentRow) return;
  const value = renameField.value.trim();
  const error = validateName(value);
  renameField.error = error;
  if (error) {
    renameField.focus();
    return;
  }
  const oldName = nameOf(currentRow);
  if (value !== oldName) {
    currentRow.dataset.name = value;
    currentRow.querySelector('.file-name').textContent = value;
    notify(`Renamed ${oldName} to ${value}`, 'success');
  }
  renameDialog.close();
}

renameSave.addEventListener('click', saveRename);

renameField.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    saveRename();
  }
});

// Clear a shown error once the user edits the name.
renameField.addEventListener('input', () => {
  if (renameField.error) renameField.error = '';
});

/* Delete */

deleteConfirm.addEventListener('click', () => {
  const row = currentRow;
  if (!row) return;
  const name = nameOf(row);
  const next = row.nextElementSibling || row.previousElementSibling;

  deleteDialog.close();

  // Wait until the dialog has returned focus, then remove the row and move
  // focus somewhere that still exists.
  requestAnimationFrame(() => {
    row.remove();
    currentRow = null;

    const hasFiles = list.children.length > 0;
    list.hidden = !hasFiles;
    emptyMessage.hidden = hasFiles;

    const nextMenu = next?.querySelector('va-menu');
    nextMenu?.focus();
    if (!nextMenu || !nextMenu.matches(':focus-within')) heading.focus();

    notify(`Deleted ${name}`, 'success');
  });
});
