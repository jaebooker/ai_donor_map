/*
 * AI Safety Donor Map
 * Data lives in data/orgs.json. Each org gets one marker coloured by its
 * primary (first) category; filters match an org if any of its categories
 * is active. Remote orgs appear in the list only.
 */
(async function () {
  const res = await fetch('data/orgs.json', { cache: 'no-cache' });
  const data = await res.json();
  const cats = Object.fromEntries(data.categories.map((c) => [c.id, c]));
  const orgs = data.orgs.slice().sort((a, b) => a.name.localeCompare(b.name));

  const state = {
    q: '',
    cats: new Set(data.categories.map((c) => c.id)),
    type: '',
    donateOnly: false,
    selected: null
  };

  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;

  $('verified').textContent = new Date(data.lastVerified + 'T12:00:00').toLocaleDateString(undefined, {
    year: 'numeric', month: 'long'
  });

  // ---------- Map ----------
  const map = L.map('map', { worldCopyJump: true, zoomControl: false }).setView([35, -40], 3);
  L.control.zoom({ position: 'topright' }).addTo(map);
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  // Esri Canvas basemaps: keyless (CARTO began requiring an API key in Sept 2026).
  const esri = (name) =>
    `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${name}/MapServer/tile/{z}/{y}/{x}`;
  const tone = dark ? 'Dark' : 'Light';
  const tileOpts = { maxZoom: 16, attribution: 'Tiles &copy; <a href="https://www.esri.com">Esri</a> &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors' };
  L.tileLayer(esri(`World_${tone}_Gray_Base`), tileOpts).addTo(map);
  map.createPane('labels');
  map.getPane('labels').style.zIndex = 450;
  map.getPane('labels').style.pointerEvents = 'none';
  L.tileLayer(esri(`World_${tone}_Gray_Reference`), { maxZoom: 16, pane: 'labels' }).addTo(map);

  const cluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 40,
    spiderfyDistanceMultiplier: 1.6,
    iconCreateFunction: (c) =>
      L.divIcon({ html: `<div class="cluster">${c.getChildCount()}</div>`, className: '', iconSize: [36, 36] })
  });
  map.addLayer(cluster);

  const pinIcon = (org, active) =>
    L.divIcon({
      className: '',
      html: `<div class="pin${active ? ' active' : ''}" style="background:${cats[org.categories[0]].color}"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      popupAnchor: [0, -10]
    });

  const tagDots = (org) =>
    `<span class="tags" aria-hidden="true">${org.categories
      .map((c) => `<i style="background:${cats[c].color}" title="${esc(cats[c].label)}"></i>`)
      .join('')}</span>`;

  const catNames = (org) => org.categories.map((c) => cats[c].label).join(' · ');

  const actionsHtml = (org) => {
    const donate = org.donateUrl
      ? `<a class="btn primary" href="${esc(org.donateUrl)}" target="_blank" rel="noopener">Donate</a>`
      : '';
    const site = `<a class="btn" href="${esc(org.website)}" target="_blank" rel="noopener">Website</a>`;
    return `<div class="actions">${donate}${site}</div>`;
  };

  const extrasHtml = (org) =>
    (org.extraLinks || [])
      .map((l) => `<div class="extra">Also: <a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a></div>`)
      .join('');

  const popupHtml = (org) => `
    <h3>${esc(org.name)}</h3>
    <div class="meta">${tagDots(org)}<span>${esc(org.city)}</span><span>${esc(org.type)}</span></div>
    <div>${esc(org.description)}</div>
    ${org.taxStatus ? `<div class="extra"><span class="badge">${esc(org.taxStatus)}</span></div>` : ''}
    ${extrasHtml(org)}
    ${actionsHtml(org)}`;

  const markers = {};
  orgs.forEach((org) => {
    if (org.remote) return;
    const m = L.marker([org.lat, org.lng], { icon: pinIcon(org, false), title: org.name, riseOnHover: true });
    m.bindPopup(popupHtml(org), { maxWidth: 320, autoPanPadding: [30, 30] });
    m.on('click', () => select(org.id, { fromMap: true }));
    m.on('popupclose', () => {
      if (state.selected === org.id) select(null, { fromMap: true });
    });
    markers[org.id] = m;
  });

  // ---------- Filters ----------
  const chips = $('chips');
  data.categories.forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.style.setProperty('--c', c.color);
    b.setAttribute('aria-pressed', 'true');
    b.dataset.cat = c.id;
    b.innerHTML = `<span class="dot"></span>${esc(c.label)}`;
    b.addEventListener('click', () => {
      // From "all", a click isolates that category; after that, clicks toggle.
      const all = state.cats.size === data.categories.length;
      if (all) {
        state.cats = new Set([c.id]);
      } else if (state.cats.has(c.id)) {
        state.cats.delete(c.id);
        if (state.cats.size === 0) state.cats = new Set(data.categories.map((x) => x.id));
      } else {
        state.cats.add(c.id);
      }
      render({ refit: true });
    });
    chips.appendChild(b);
  });
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'chip';
  reset.textContent = 'All';
  reset.addEventListener('click', () => {
    state.cats = new Set(data.categories.map((x) => x.id));
    render({ refit: true });
  });
  chips.appendChild(reset);

  let t;
  $('search').addEventListener('input', (e) => {
    clearTimeout(t);
    t = setTimeout(() => {
      state.q = e.target.value.trim().toLowerCase();
      render({ refit: true });
    }, 120);
  });
  $('type-filter').addEventListener('change', (e) => {
    state.type = e.target.value;
    render({ refit: true });
  });
  $('donate-only').addEventListener('change', (e) => {
    state.donateOnly = e.target.checked;
    render({ refit: true });
  });

  const matches = (org) => {
    if (!org.categories.some((c) => state.cats.has(c))) return false;
    if (state.type && org.type !== state.type) return false;
    if (state.donateOnly && !org.donateUrl) return false;
    if (state.q) {
      const hay = `${org.name} ${org.city} ${org.description} ${catNames(org)} ${org.type}`.toLowerCase();
      if (!state.q.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  };

  // ---------- Render ----------
  const list = $('list');
  function render({ refit = false } = {}) {
    chips.querySelectorAll('[data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(state.cats.has(b.dataset.cat))));
    const visible = orgs.filter(matches);
    if (state.selected && !visible.some((o) => o.id === state.selected)) state.selected = null;

    cluster.clearLayers();
    const shown = visible.filter((o) => markers[o.id]).map((o) => markers[o.id]);
    cluster.addLayers(shown);

    list.innerHTML = '';
    if (!visible.length) {
      list.innerHTML = '<li class="empty">No matches. Try clearing a filter.</li>';
    }
    visible.forEach((org) => {
      const li = document.createElement('li');
      li.className = 'card' + (org.id === state.selected ? ' active' : '');
      li.tabIndex = 0;
      li.dataset.id = org.id;
      li.innerHTML = `
        <h3>${esc(org.name)}</h3>
        <div class="meta">${tagDots(org)}<span>${esc(org.city)}</span><span>${esc(org.type)}</span>${
          org.remote ? '<span class="badge">Remote</span>' : ''
        }${org.donateUrl ? '' : '<span class="badge">No donate page</span>'}</div>
        <p class="desc">${esc(org.description)}</p>
        ${org.taxStatus ? `<div class="extra"><span class="badge">${esc(org.taxStatus)}</span></div>` : ''}
        ${extrasHtml(org).replace(/class="extra"/g, 'class="extra actions-extra"')}
        ${actionsHtml(org)}`;
      li.querySelectorAll('.actions-extra').forEach((el) => (el.style.display = org.id === state.selected ? '' : 'none'));
      li.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        select(state.selected === org.id ? null : org.id);
      });
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select(state.selected === org.id ? null : org.id);
        }
      });
      list.appendChild(li);
    });

    const nOrgs = visible.length;
    const nRemote = visible.filter((o) => o.remote).length;
    $('count').textContent = `${nOrgs} of ${orgs.length} listings${nRemote ? ` (${nRemote} remote, list only)` : ''}`;

    if (refit && shown.length) {
      const b = L.latLngBounds(shown.map((m) => m.getLatLng()));
      map.fitBounds(b.pad(0.25), { maxZoom: 9, animate: true });
    }
  }

  function select(id, { fromMap = false } = {}) {
    const prev = state.selected;
    state.selected = id;
    if (prev && markers[prev]) markers[prev].setIcon(pinIcon(orgs.find((o) => o.id === prev), false));
    const org = id && orgs.find((o) => o.id === id);
    if (org && markers[id]) markers[id].setIcon(pinIcon(org, true));

    history.replaceState(null, '', id ? `#${id}` : location.pathname + location.search);

    list.querySelectorAll('.card').forEach((c) => {
      const on = c.dataset.id === id;
      c.classList.toggle('active', on);
      c.querySelectorAll('.actions-extra').forEach((el) => (el.style.display = on ? '' : 'none'));
    });
    const card = id && list.querySelector(`[data-id="${id}"]`);
    if (card) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    if (org && !fromMap && markers[id]) {
      if (isMobile()) setListOpen(false);
      cluster.zoomToShowLayer(markers[id], () => markers[id].openPopup());
    }
  }

  // ---------- Mobile toggle ----------
  const toggle = $('toggle-view');
  function setListOpen(open) {
    document.body.classList.toggle('show-list', open);
    toggle.textContent = open ? 'Map' : 'List';
    toggle.setAttribute('aria-expanded', String(open));
    if (!open) setTimeout(() => map.invalidateSize(), 220);
  }
  toggle.addEventListener('click', () => setListOpen(!document.body.classList.contains('show-list')));

  render({ refit: true });

  const fromHash = decodeURIComponent(location.hash.slice(1));
  if (fromHash && orgs.some((o) => o.id === fromHash)) {
    setTimeout(() => select(fromHash), 300);
  }
})();
