// The Delete button shows the "Project deleted" toast through commandfor/command;
// this closes the dialog as well, which can't be done through commandfor in the same click.
const dialog = document.getElementById('delete-dialog');
const confirmDelete = document.getElementById('confirm-delete');

confirmDelete?.addEventListener('click', () => {
  dialog?.close();
});
