const dialog = document.getElementById('delete-dialog');
const confirmButton = document.getElementById('delete-confirm');
const trigger = document.getElementById('delete-trigger');
const status = document.getElementById('delete-status');

confirmButton.addEventListener('click', () => {
  dialog.close();
  trigger.disabled = true;
  status.textContent = 'Project “Atlas” was deleted.';
});
