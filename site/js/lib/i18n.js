// Language of the page and the English for the few strings scripts write while the page runs (status messages,
// player labels). The pages themselves are translated when the site is built, from the same dictionary:
// site/i18n/en.json (Spanish text → English text).
import english from '../../i18n/en.json';

export const pageLanguage = () => (document.documentElement.lang === 'en' ? 'en' : 'es');

export const tr = (text) => (pageLanguage() === 'en' ? english[text] || text : text);
