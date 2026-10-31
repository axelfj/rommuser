// Scripts of the home page (/es/ and /en/). npm run site bundles this file and everything it imports into
// site/build/home.js. The order matters: release-day.js and shows.js update the cards before the dates band, the
// player and the planets read them.
import { initArtistSystem } from '../artist-system.js';
import { initDatesBand } from '../dates-band.js';
import { initFanForm } from '../fan-form.js';
import { initFooterYear } from '../footer-year.js';
import { initHeaderShrink } from '../header-shrink.js';
import { initLanguageLink } from '../language-link.js';
import { initListenDialog } from '../listen-dialog.js';
import { initMenu } from '../menu.js';
import { initMusicTabs } from '../music-tabs.js';
import { initPlayer } from '../player.js';
import { initReleaseDay } from '../release-day.js';
import { initShows } from '../shows.js';

initLanguageLink();
initMenu();
initReleaseDay();
initMusicTabs();
initListenDialog();
initShows();
initFooterYear();
initHeaderShrink();
initFanForm();
initDatesBand();
initArtistSystem(initPlayer());
