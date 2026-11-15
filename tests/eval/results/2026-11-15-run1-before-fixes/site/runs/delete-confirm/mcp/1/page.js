const dialog = document.getElementById('delete-dialog');
const confirmButton = document.getElementById('confirm-delete');
const status = document.getElementById('delete-status');

confirmButton.addEventListener('click', () => {
  // Replace with the real delete request.
  dialog.close();
  status.textContent = 'Project deleted.';
});
