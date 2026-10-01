/*
 * AI Safety Donor Map: problem landscape
 * Uses the same data/orgs.json as the geographic map. Problems are grouped into
 * zones; each org sits in its first (main) problem and links to the others.
 */
(async function () {
  const res = await fetch('data/orgs.json', { cache: 'no-cache' });
  const data = await res.json();
  const zones = data.zones;
  const problems = data.problems;
  const zoneOf = Object.fromEntries(zones.map((z) => [z.id, z]));
  const probOf = Object.fromEntries(problems.map((p) => [p.id, p]));
  const orgs = data.orgs.slice().sort((a, b) => a.name.localeCompare(b.name));
  const orgOf = Object.fromEntries(orgs.map((o) => [o.id, o]));

  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const shortName = (o) => {
    const m = o.name.match(/^(.*?)\s*\(([^)]+)\)$/);
    if (!m) return o.name;
    return /^[A-Z0-9.\-]+$/.test(m[2]) && m[2].length <= 6 ? m[2] : m[1];
  };
  const colorOf = (o) => zoneOf[probOf[o.problems[0]].zone].color;
  const main = (p) => orgs.filter((o) => o.problems[0] === p.id);
  const also = (p) => orgs.filter((o) => o.problems.indexOf(p.id) > 0);

  $('total').textContent = orgs.length;
  $('verified').textContent = new Date(data.lastVerified + 'T12:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long' });

  // ---------- Landscape ----------
  const map = $('landscape');
  zones.forEach((z) => {
    const zone = document.createElement('section');
    zone.className = 'ls-zone';
    zone.style.setProperty('--z', z.color);
    zone.setAttribute('aria-label', z.label);
    zone.innerHTML = `<h3 class="ls-zone-title">${esc(z.label)}</h3>`;
    problems.filter((p) => p.zone === z.id).forEach((p) => {
      const region = document.createElement('div');
      region.className = 'ls-region';
      region.dataset.problem = p.id;
      const total = main(p).length + also(p).length;
      region.innerHTML = `
        <button type="button" class="ls-region-head" data-problem="${p.id}" aria-pressed="false">
          <span class="ls-region-name">${esc(p.label)}</span>
          <span class="ls-region-count" title="${main(p).length} mainly, ${also(p).length} also">${total}</span>
        </button>
        <ul class="ls-nodes">${main(p)
          .map(
            (o) => `<li><button type="button" class="ls-node${o.type === 'Fund' ? ' fund' : ''}" data-org="${o.id}" aria-pressed="false" title="${esc(o.name)}">
              <i style="background:${colorOf(o)}"></i><span>${esc(shortName(o))}</span></button></li>`
          )
          .join('')}</ul>`;
      zone.appendChild(region);
    });
    map.appendChild(zone);
  });
  map.addEventListener('click', (e) => {
    const node = e.target.closest('[data-org]');
    const head = e.target.closest('.ls-region-head');
    if (node) setSel({ org: node.dataset.org }, true);
    else if (head) setSel({ problem: head.dataset.problem }, true);
  });

  // Curves from orgs to the other problems they work on.
  const svg = $('links');
  function drawLinks() {
    const box = map.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    svg.setAttribute('width', box.width);
    svg.setAttribute('height', box.height);
    const pairs = [];
    if (state.problem) also(probOf[state.problem]).forEach((o) => pairs.push([o, state.problem]));
    if (state.org) orgOf[state.org].problems.slice(1).forEach((p) => pairs.push([orgOf[state.org], p]));
    svg.innerHTML = pairs
      .map(([o, pid]) => {
        const a = map.querySelector(`[data-org="${o.id}"] i`).getBoundingClientRect();
        const b = map.querySelector(`.ls-region-head[data-problem="${pid}"]`).getBoundingClientRect();
        const x1 = a.left + a.width / 2 - box.left, y1 = a.top + a.height / 2 - box.top;
        const x2 = b.left + Math.min(b.width / 2, 60) - box.left, y2 = b.top + b.height / 2 - box.top;
        const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - Math.max(30, Math.abs(x2 - x1) * 0.15);
        return `<path d="M${x1},${y1} Q${mx},${my} ${x2},${y2}" stroke="${colorOf(o)}" /><circle cx="${x2}" cy="${y2}" r="3.5" fill="${colorOf(o)}" />`;
      })
      .join('');
  }

  // ---------- Detail panel ----------
  const actions = (o) => `<div class="actions">${
    o.donateUrl ? `<a class="btn primary" href="${esc(o.donateUrl)}" target="_blank" rel="noopener">Donate</a>` : '<span class="badge">No donate page</span>'
  }<a class="btn" href="${esc(o.website)}" target="_blank" rel="noopener">Website</a><a class="btn subtle" href="/#${esc(o.id)}">On the map</a></div>`;
  const chip = (pid) => `<a class="ls-chip" href="#${pid}" style="--z:${zoneOf[probOf[pid].zone].color}">${esc(probOf[pid].label)}</a>`;
  const row = (o) => `<li><button type="button" class="ls-row" data-org="${o.id}"><i style="background:${colorOf(o)}" class="${o.type === 'Fund' ? 'fund' : ''}"></i><span><strong>${esc(o.name)}</strong><small>${esc(o.approach)}</small></span></button></li>`;

  function problemDetail(p) {
    const z = zoneOf[p.zone];
    const m = main(p), a = also(p);
    const funds = p.id === 'unfunded' ? [] : orgs.filter((o) => o.type === 'Fund' && !o.problems.includes(p.id));
    return `
      <p class="eyebrow" style="color:${z.color}">${esc(z.label)}</p>
      <h2>${esc(p.label)}</h2>
      <p class="ls-problem">${esc(p.problem)}</p>
      <p class="ls-buys"><strong>What a donation here pays for:</strong> ${esc(p.buys)}</p>
      ${m.length ? `<h3>Focused mainly on this <span class="pb-group-n">${m.length}</span></h3><ul class="ls-rows">${m.map(row).join('')}</ul>` : ''}
      ${a.length ? `<h3>Also working on this <span class="pb-group-n">${a.length}</span></h3><ul class="ls-rows">${a.map(row).join('')}</ul>` : ''}
      ${funds.length ? `<div class="ls-funds"><h3>Or let grantmakers choose</h3><p>These funds give across AI safety, including this area.</p><ul class="ls-rows">${funds.map(row).join('')}</ul></div>` : ''}`;
  }
  function orgDetail(o) {
    return `
      <p class="eyebrow" style="color:${colorOf(o)}">${esc(o.type)} · ${esc(o.remote ? 'Remote' : o.city)}</p>
      <h2>${esc(o.name)}</h2>
      <p class="ls-problem">${esc(o.approach)}</p>
      <p class="ls-desc">${esc(o.description)}</p>
      <h3>Works on</h3>
      <div class="ls-chips">${o.problems.map(chip).join('')}</div>
      ${o.taxStatus ? `<p class="extra"><span class="badge">${esc(o.taxStatus)}</span></p>` : ''}
      ${(o.extraLinks || []).map((l) => `<p class="extra">Also: <a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a></p>`).join('')}
      ${actions(o)}
      <p class="ls-back"><a href="#${o.problems[0]}">← ${esc(probOf[o.problems[0]].label)}</a></p>`;
  }
  function overview() {
    const funds = orgs.filter((o) => o.type === 'Fund');
    return `
      <p class="eyebrow">Start here</p>
      <h2>${orgs.length} places to give, across ${problems.length} problems</h2>
      <p class="ls-desc">Pick a problem on the map to see who works on it and what a gift pays for. Dashed lines show organizations that also work on that problem from elsewhere on the map.</p>
      <h3>By area</h3>
      <ul class="ls-rows">${zones
        .map((z) => {
          const ps = problems.filter((p) => p.zone === z.id);
          const n = new Set(orgs.filter((o) => o.problems.some((x) => ps.some((p) => p.id === x))).map((o) => o.id)).size;
          return `<li><a class="ls-row" href="#${ps[0].id}"><i style="background:${z.color}"></i><span><strong>${esc(z.label)}</strong><small>${ps.map((p) => esc(p.label)).join(' · ')} · ${n} listings</small></span></a></li>`;
        })
        .join('')}</ul>
      <div class="ls-funds"><h3>Not sure where to start?</h3><p>A fund lets experienced grantmakers choose for you.</p><ul class="ls-rows">${funds.map(row).join('')}</ul></div>`;
  }
  const detail = $('detail');
  detail.addEventListener('click', (e) => {
    if (e.target.closest('[data-reset]')) { e.preventDefault(); setSel({}, false); return; }
    const r = e.target.closest('[data-org]');
    if (r) setSel({ org: r.dataset.org }, true);
  });

  // ---------- State ----------
  const state = { problem: null, org: null };
  function setSel(sel, user) {
    state.problem = sel.problem && probOf[sel.problem] ? sel.problem : null;
    state.org = sel.org && orgOf[sel.org] ? sel.org : null;
    const none = !state.problem && !state.org;
    history.replaceState(null, '', none ? location.pathname : `#${state.org || state.problem}`);
    if (none) {
      map.classList.remove('has-sel');
      map.querySelectorAll('.on').forEach((n) => n.classList.remove('on'));
      map.querySelectorAll('[aria-pressed]').forEach((n) => n.setAttribute('aria-pressed', 'false'));
      detail.innerHTML = overview();
      drawLinks();
      return;
    }

    const related = new Set(state.org ? [state.org] : main(probOf[state.problem]).concat(also(probOf[state.problem])).map((o) => o.id));
    const lit = new Set(state.org ? orgOf[state.org].problems : [state.problem]);
    map.classList.add('has-sel');
    map.querySelectorAll('.ls-node').forEach((n) => {
      n.classList.toggle('on', related.has(n.dataset.org));
      n.setAttribute('aria-pressed', String(n.dataset.org === state.org));
    });
    map.querySelectorAll('.ls-region').forEach((r) => r.classList.toggle('on', lit.has(r.dataset.problem)));
    map.querySelectorAll('.ls-region-head').forEach((h) => h.setAttribute('aria-pressed', String(h.dataset.problem === state.problem)));
    detail.innerHTML = (state.org ? orgDetail(orgOf[state.org]) : problemDetail(probOf[state.problem])) + '<p class="ls-back"><a href="#" data-reset>Back to overview</a></p>';
    detail.scrollTop = 0;
    drawLinks();
    if (user && window.matchMedia('(max-width: 980px)').matches) detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const fromHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    return orgOf[id] ? { org: id } : { problem: id };
  };
  window.addEventListener('hashchange', () => setSel(fromHash(), true));
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(drawLinks, 100); });
  setSel(fromHash(), false);
})();
