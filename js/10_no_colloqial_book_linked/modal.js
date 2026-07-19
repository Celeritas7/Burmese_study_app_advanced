// ═══ MODAL COMPONENT ═══

export class Modal {
  static show(content, { borderColor = 'var(--border)', onClose } = {}) {
    this.close(); // Remove any existing modal

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-overlay';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
        if (onClose) onClose();
      }
    });

    const box = document.createElement('div');
    box.className = 'modal-box';
    box.style.borderColor = borderColor;
    box.innerHTML = content;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // Wire up close buttons
    box.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.close();
        if (onClose) onClose();
      });
    });

    return box;
  }

  static close() {
    const existing = document.getElementById('modal-overlay');
    if (existing) existing.remove();
  }
}
