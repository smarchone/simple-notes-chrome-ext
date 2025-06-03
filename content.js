// Injects the notetaking UI into the page
(function() {
  if (window.__minimalNotesInjected) return;
  window.__minimalNotesInjected = true;

  // Helper: extension storage get/set via messaging
  function extStorageGet(key) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'getStorage', key }, res => {
        resolve(res && res.value);
      });
    });
  }
  function extStorageSet(key, value) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'setStorage', key, value }, res => {
        resolve(res && res.success);
      });
    });
  }

  // Helper: get domain
  function getDomain() {
    return window.location.hostname;
  }

  // Helper: load/save notes (async)
  async function loadNotes() {
    return (await extStorageGet('minimal_notes_' + getDomain())) || '';
  }
  function saveNotes(val) {
    extStorageSet('minimal_notes_' + getDomain(), val);
  }

  // Helper: load/save UI state (position and size) (async)
  function getUIStateKey() {
    return 'minimal_notes_ui_' + getDomain();
  }
  async function loadUIState() {
    return (await extStorageGet(getUIStateKey())) || {};
  }
  function saveUIState(state) {
    extStorageSet(getUIStateKey(), state);
  }

  // Create UI (async)
  (async function() {
    const container = document.createElement('div');
    container.id = 'minimal-notes-container';
    container.innerHTML = `
      <div id="minimal-notes-header">
        <span id="minimal-notes-title">Notes</span>
        <div id="minimal-notes-actions">
          <button id="minimal-notes-mode" title="Toggle Light/Dark Mode">🌙</button>
          <button id="minimal-notes-copy" title="Copy as Markdown">📋</button>
          <button id="minimal-notes-export" title="Export as Markdown">⬇️</button>
          <button id="minimal-notes-minimize" title="Minimize">_</button>
        </div>
      </div>
      <textarea id="minimal-notes-area" placeholder="Type your notes here..."></textarea>
    `;
    document.body.appendChild(container);

    // Restore notes
    const textarea = container.querySelector('#minimal-notes-area');
    textarea.value = await loadNotes();

    // Restore UI state (position and size)
    const uiState = await loadUIState();
    if (uiState.left) container.style.left = uiState.left;
    else container.style.left = '32px';
    if (uiState.top) container.style.top = uiState.top;
    else container.style.top = '32px';
    if (uiState.width) container.style.width = uiState.width;
    else container.style.width = '320px';
    if (uiState.height) container.style.height = uiState.height;
    else container.style.height = '220px';

    // Drag logic
    let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;
    const header = container.querySelector('#minimal-notes-header');
    header.addEventListener('mousedown', e => {
      isDragging = true;
      dragOffsetX = e.clientX - container.offsetLeft;
      dragOffsetY = e.clientY - container.offsetTop;
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      container.style.left = (e.clientX - dragOffsetX) + 'px';
      container.style.top = (e.clientY - dragOffsetY) + 'px';
      // Save position
      saveUIState({
        ...uiState,
        left: container.style.left,
        top: container.style.top,
        width: container.style.width,
        height: container.style.height
      });
    });
    document.addEventListener('mouseup', () => {
      isDragging = false;
      document.body.style.userSelect = '';
    });

    // Resize logic
    const resizer = document.createElement('div');
    resizer.id = 'minimal-notes-resizer';
    container.appendChild(resizer);
    let isResizing = false, startW, startH, startX, startY;
    resizer.addEventListener('mousedown', e => {
      isResizing = true;
      startW = container.offsetWidth;
      startH = container.offsetHeight;
      startX = e.clientX;
      startY = e.clientY;
      e.preventDefault();
      e.stopPropagation();
    });
    document.addEventListener('mousemove', e => {
      if (!isResizing) return;
      container.style.width = Math.max(220, startW + (e.clientX - startX)) + 'px';
      container.style.height = Math.max(120, startH + (e.clientY - startY)) + 'px';
      // Save size
      saveUIState({
        ...uiState,
        left: container.style.left,
        top: container.style.top,
        width: container.style.width,
        height: container.style.height
      });
    });
    document.addEventListener('mouseup', () => {
      isResizing = false;
    });

    // Minimize logic
    const minimizeBtn = container.querySelector('#minimal-notes-minimize');
    minimizeBtn.addEventListener('click', () => {
      if (container.classList.toggle('minimized')) {
        textarea.style.display = 'none';
        resizer.style.display = 'none';
      } else {
        textarea.style.display = '';
        resizer.style.display = '';
      }
    });

    // Save notes on input
    textarea.addEventListener('input', e => {
      saveNotes(textarea.value);
    });

    // Copy as markdown
    container.querySelector('#minimal-notes-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(`# Notes for ${getDomain()}\n\n` + textarea.value);
    });

    // Export as markdown
    container.querySelector('#minimal-notes-export').addEventListener('click', () => {
      const blob = new Blob([`# Notes for ${getDomain()}\n\n` + textarea.value], {type: 'text/markdown'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notes-${getDomain()}.md`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    });

    // Restore mode
    let mode = (await extStorageGet('minimal_notes_mode_' + getDomain())) || 'dark';
    container.classList.add('mode-' + mode);
    const modeBtn = container.querySelector('#minimal-notes-mode');
    function updateModeIcon() {
      modeBtn.textContent = modeBtn.title = (container.classList.contains('mode-dark') ? '☀️' : '🌙');
      modeBtn.title = container.classList.contains('mode-dark') ? 'Switch to Day Mode' : 'Switch to Night Mode';
    }
    updateModeIcon();
    modeBtn.addEventListener('click', async () => {
      const isDark = container.classList.toggle('mode-dark');
      container.classList.toggle('mode-light', !isDark);
      await extStorageSet('minimal_notes_mode_' + getDomain(), isDark ? 'dark' : 'light');
      updateModeIcon();
    });
  })();
})();
