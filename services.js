/* ============================================
   SERVICES — Contact Form JS
   ============================================ */

const form        = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();

    const required = form.querySelectorAll('[required]');
    let valid = true;

    required.forEach(field => {
      field.style.borderColor = '';
      if (!field.value.trim()) {
        field.style.borderColor = '#e05252';
        valid = false;
      }
      if (field.type === 'email' && field.value && !field.value.includes('@')) {
        field.style.borderColor = '#e05252';
        valid = false;
      }
    });

    if (!valid) return;

    const btn = form.querySelector('[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Sending...';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    setTimeout(() => {
      form.style.display = 'none';
      if (formSuccess) formSuccess.classList.add('visible');
    }, 1200);
  });

  /* ── Live validation feedback ── */
  form.querySelectorAll('[required]').forEach(field => {
    field.addEventListener('blur', () => {
      if (!field.value.trim()) {
        field.style.borderColor = '#e05252';
      } else {
        field.style.borderColor = 'var(--accent)';
      }
    });
    field.addEventListener('input', () => {
      if (field.value.trim()) field.style.borderColor = '';
    });
  });
}
