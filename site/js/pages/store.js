// Scripts of /tienda and /en/store/. npm run site bundles this file into site/build/store.js.
import { initFooterYear } from '../footer-year.js';
import { initLanguageLink } from '../language-link.js';
import { initMenu } from '../menu.js';

initLanguageLink();
initMenu();
initFooterYear();
