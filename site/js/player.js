// One player for the whole page. The hero's ESCUCHAR and the planets in El artista play through the same SoundCloud
// widget, loaded only on the first tap, and a thin bar at the bottom of the screen says what is sounding.
// A cover in MÚSICA never starts playback: it opens the listen dialog (listen-dialog.js); the bar's PLATAFORMAS
// opens that same dialog. If SoundCloud can't load, or a browser won't let the hidden widget start (iPhone Safari
// blocks it), after 7 seconds without sound the page stops trying and opens the listen dialog instead.
// The tracks are the released MÚSICA cards that have a SoundCloud link, newest first, then the remixes (no date).
// initPlayer() returns { tracks, play, next, close, on(listener), current, playing } for artist-system.js.
import { shortDate, todayInCostaRica } from './lib/dates.js';
import { tr } from './lib/i18n.js';

const CARDS = '#musica .tracks .track[data-soundcloud]:not(.presave)';
const WIDGET_OPTIONS = { auto_play: true, visual: false, show_artwork: false, show_comments: false, show_user: false, show_reposts: false, show_teaser: false, hide_related: true };
const GIVE_UP_AFTER = 7000;

function readTracks() {
  const today = todayInCostaRica();
  return [...document.querySelectorAll(CARDS)]
    .map((row) => ({
      row,
      name: row.dataset.track,
      label: row.querySelector('.track-info small')?.textContent || '',
      iso: row.querySelector('time')?.getAttribute('datetime') || '',
      url: row.dataset.soundcloud,
      type: row.querySelector('.track-type'),
      typeText: row.querySelector('.track-type')?.textContent || '',
    }))
    .filter((t) => !t.iso || t.iso < today)
    .sort((a, b) => b.iso.localeCompare(a.iso));
}

function createBar() {
  const bar = document.createElement('div');
  bar.className = 'now-bar';
  bar.hidden = true;
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', tr('Reproductor'));
  bar.innerHTML =
    '<span class="now-progress" aria-hidden="true"><span></span></span><button class="now-toggle" type="button"></button><p class="now-text" aria-live="polite"></p><button class="now-next" type="button"></button><button class="now-platforms" type="button"></button><button class="now-close" type="button"><span aria-hidden="true">×</span></button>';
  bar.querySelector('.now-next').textContent = tr('SIGUIENTE');
  bar.querySelector('.now-platforms').textContent = tr('PLATAFORMAS');
  bar.querySelector('.now-close').setAttribute('aria-label', tr('Cerrar reproductor'));
  document.body.append(bar);
  return bar;
}

export function initPlayer() {
  const tracks = readTracks();
  if (!tracks.length) return null;
  const listeners = new Set();
  let widget = null;
  let current = null;
  let playing = false;
  let loading = false;
  let failed = false;
  let watchdog = 0;
  const bar = createBar();
  const $ = (selector) => bar.querySelector(selector);
  const fill = $('.now-progress span');
  const state = () => (loading ? tr('CARGANDO') : playing ? tr('SONANDO') : tr('EN PAUSA'));

  function emit() {
    for (const t of tracks) {
      const on = t === current;
      t.row.classList.toggle('is-playing', on && playing);
      t.row.classList.toggle('is-current', on);
      if (t.type) t.type.textContent = on ? state() : t.typeText;
    }
    if (current) {
      bar.hidden = false;
      document.body.classList.add('has-now-bar');
      $('.now-text').textContent = [state(), current.name, current.label, current.iso && shortDate(current.iso), tr('VÍA SOUNDCLOUD')].filter(Boolean).join(' · ');
      const action = playing ? tr('PAUSA') : tr('SEGUIR');
      $('.now-toggle').textContent = action;
      $('.now-toggle').setAttribute('aria-label', `${action}: ${current.name}`);
      $('.now-next').hidden = tracks.length < 2;
    }
    listeners.forEach((fn) => fn(api));
  }

  // The listen dialog for that track (the card's own click handler opens it).
  const platforms = (t) => t.row.click();

  function stop() {
    clearTimeout(watchdog);
    widget?.pause();
    current = null;
    playing = false;
    loading = false;
    bar.hidden = true;
    document.body.classList.remove('has-now-bar');
    emit();
  }

  function fallback(t) {
    failed = true;
    stop();
    platforms(t);
  }

  function connect(frame) {
    widget = SC.Widget(frame);
    const E = SC.Widget.Events;
    widget.bind(E.PLAY, () => {
      if (failed) return widget.pause();
      clearTimeout(watchdog);
      loading = false;
      playing = true;
      emit();
    });
    widget.bind(E.PAUSE, () => {
      playing = false;
      emit();
    });
    widget.bind(E.FINISH, () => {
      playing = false;
      fill.style.transform = 'scaleX(0)';
      next();
    });
    widget.bind(E.PLAY_PROGRESS, (e) => {
      fill.style.transform = `scaleX(${(e.relativePosition || 0).toFixed(4)})`;
    });
  }

  function loadWidget(t) {
    const frame = document.createElement('iframe');
    frame.className = 'now-player';
    frame.title = 'SoundCloud';
    frame.allow = 'autoplay';
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    frame.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(t.url)}&${Object.entries(WIDGET_OPTIONS).map(([k, v]) => `${k}=${v}`).join('&')}`;
    document.body.append(frame);
    if (window.SC?.Widget) return connect(frame);
    const script = document.createElement('script');
    script.src = 'https://w.soundcloud.com/player/api.js';
    script.onload = () => connect(frame);
    script.onerror = () => {
      frame.remove();
      fallback(t);
    };
    document.head.append(script);
  }

  function play(t) {
    if (!t) return;
    if (failed) return platforms(t);
    if (t === current && widget) return widget.toggle();
    current = t;
    playing = false;
    loading = true;
    fill.style.transform = 'scaleX(0)';
    emit();
    clearTimeout(watchdog);
    watchdog = setTimeout(() => {
      if (current === t && loading) fallback(t);
    }, GIVE_UP_AFTER);
    if (widget) widget.load(t.url, WIDGET_OPTIONS);
    else loadWidget(t);
  }

  function next() {
    if (current) play(tracks[(tracks.indexOf(current) + 1) % tracks.length]);
  }

  $('.now-toggle').addEventListener('click', () => widget?.toggle());
  $('.now-next').addEventListener('click', next);
  $('.now-platforms').addEventListener('click', () => current && platforms(current));
  $('.now-close').addEventListener('click', stop);
  // The hero's ESCUCHAR plays the newest release; without JavaScript it still scrolls to MÚSICA.
  document.querySelector('.hero .actions a.button[href="#musica"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    play(current || tracks[0]);
  });

  const api = {
    tracks,
    play,
    next,
    close: stop,
    on(listener) {
      listeners.add(listener);
      listener(api);
    },
    get current() {
      return current;
    },
    get playing() {
      return playing;
    },
  };
  return api;
}
