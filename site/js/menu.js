// Phone menu: MENÚ opens and closes the navigation, and choosing a link closes it.
export function initMenu() {
  const button = document.querySelector('.menu-toggle');
  const nav = document.querySelector('header nav');
  if (!button || !nav) return;
  const setOpen = (open) => {
    button.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
  };
  button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
}
