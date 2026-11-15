const editor = document.getElementById('editor');
const toolbar = document.querySelector('.format-toolbar');
let savedRange = null;

// Remember the last selection inside the editor, so it survives focus
// moving to a toolbar button (by mouse or keyboard).
document.addEventListener('selectionchange', () => {
  const selection = document.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      savedRange = range.cloneRange();
    }
  }
});

toolbar.addEventListener('click', (event) => {
  const button = event.target.closest('va-button[data-command]');
  if (!button) return;

  editor.focus();
  if (savedRange) {
    const selection = document.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedRange);
  }
  document.execCommand(button.dataset.command, false);
});
