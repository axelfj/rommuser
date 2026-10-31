// Scripts of /estudio and /en/studio/. npm run site bundles this file into site/build/studio.js.
import { initFooterYear } from '../footer-year.js';
import { initLanguageLink } from '../language-link.js';
import { initMenu } from '../menu.js';
import { initStudioForm } from '../studio-form.js';
import { initStudioMotion } from '../studio-motion.js';

initLanguageLink();
initMenu();
initFooterYear();
initStudioMotion();
initStudioForm();
