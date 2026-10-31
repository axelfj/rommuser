// MÚSICA tabs (Originales, Remixes / Edits, Mixtapes): one panel visible at a time, arrow keys, Home and End move
// between tabs, as screen readers expect from role="tab".
export function initMusicTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const choose = (tab) => {
    for (const t of tabs) {
      const selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
    }
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => choose(tab));
    tab.addEventListener('keydown', (event) => {
      const next = { ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      choose(tabs[next]);
      tabs[next].focus();
    });
  });
}
