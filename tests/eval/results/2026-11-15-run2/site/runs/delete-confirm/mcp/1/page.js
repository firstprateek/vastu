const dialog = document.getElementById('delete-project-dialog');
const confirmButton = document.getElementById('confirm-delete');
const status = document.getElementById('delete-status');

confirmButton.addEventListener('click', () => {
  // Hook the real delete request in here.
  dialog.close();
  status.textContent = 'Project deleted.';
});
