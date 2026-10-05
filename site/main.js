// Interacciones mínimas: menú en celular, pestañas del catálogo, ventana de
// plataformas, copiar correos y pausar el movimiento.

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

// Menú en celular
const menuBtn = $('.menu-btn');
menuBtn.addEventListener('click', () => {
  const open = menuBtn.getAttribute('aria-expanded') !== 'true';
  menuBtn.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('menu-open', open);
});
$$('#nav a').forEach((a) =>
  a.addEventListener('click', () => {
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  }),
);

// Pestañas del catálogo
const tabs = $$('[role="tab"]');
tabs.forEach((tab) =>
  tab.addEventListener('click', () => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  }),
);

// Elegir dónde escuchar
$$('[data-open]').forEach((btn) =>
  btn.addEventListener('click', () => document.getElementById(btn.dataset.open).showModal()),
);

// Copiar correo
const toast = $('#toast');
let toastTimer;
$$('[data-copy]').forEach((btn) =>
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      toast.textContent = `Copiado: ${btn.dataset.copy}`;
    } catch {
      toast.textContent = btn.dataset.copy;
    }
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.hidden = true), 2200);
  }),
);

// Pausar movimiento (cinta y órbitas)
const motion = $('#motion');
motion.addEventListener('click', () => {
  const paused = document.body.classList.toggle('paused');
  motion.textContent = paused ? 'Reanudar movimiento' : 'Pausar movimiento';
});
