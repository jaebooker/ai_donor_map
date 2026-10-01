/*
 * AI Safety Donor Map: problem view
 * Uses the same data/orgs.json as the map. Each org's `problems` array is
 * ordered: the first entry is its main focus, the rest are secondary.
 */
(async function () {
  const res = await fetch('data/orgs.json', { cache: 'no-cache' });
  const data = await res.json();
  const problems = data.problems;
  const byId = Object.fromEntries(problems.map((p) => [p.id, p]));
  const orgs = data.orgs.slice().sort((a, b) => a.name.localeCompare(b.name));

  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  $('total').textContent = orgs.length;
  $('verified').textContent = new Date(data.lastVerified + 'T12:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long' });

  const main = (p) => orgs.filter((o) => o.problems[0] === p.id);
  const also = (p) => orgs.filter((o) => o.problems.indexOf(p.id) > 0);
  const state = { problem: null, donateOnly: false };

  // ---------- Problem rail ----------
  const list = $('problem-list');
  const maxCount = Math.max(...problems.map((p) => main(p).length + also(p).length));
  problems.forEach((p) => {
    const nMain = main(p).length;
    const nAlso = also(p).length;
    const li = document.createElement('li');
    li.innerHTML = `
      <button type="button" class="pb-item" data-id="${p.id}" aria-pressed="false">
        <span class="pb-item-head"><strong>${esc(p.label)}</strong><span class="pb-count">${nMain + nAlso}</span></span>
        <span class="pb-item-text">${esc(p.problem)}</span>
        <span class="pb-bar" aria-hidden="true"><i style="width:${(nMain / maxCount) * 100}%"></i><i class="also" style="width:${(nAlso / maxCount) * 100}%"></i></span>
        <span class="sr-only">${nMain} focused mainly on this, ${nAlso} also working on it.</span>
      </button>`;
    li.querySelector('button').addEventListener('click', () => select(p.id, true));
    list.appendChild(li);
  });

  // ---------- Detail ----------
  const card = (o, current) => {
    const others = o.problems.filter((x) => x !== current);
    const donate = o.donateUrl
      ? `<a class="btn primary" href="${esc(o.donateUrl)}" target="_blank" rel="noopener">Donate</a>`
      : '<span class="badge">No donate page</span>';
    return `<li class="pb-card">
      <div class="pb-card-head">
        <h4>${esc(o.name)}</h4>
        <span class="meta"><span>${esc(o.type)}</span><span>${esc(o.remote ? 'Remote' : o.city)}</span></span>
      </div>
      <p>${esc(o.approach)}</p>
      ${others.length ? `<p class="pb-also">Also works on: ${others
        .map((x) => `<a href="#${x}">${esc(byId[x].label)}</a>`)
        .join(', ')}</p>` : ''}
      ${o.taxStatus ? `<div class="extra"><span class="badge">${esc(o.taxStatus)}</span></div>` : ''}
      <div class="actions">${donate}<a class="btn" href="${esc(o.website)}" target="_blank" rel="noopener">Website</a><a class="btn subtle" href="/#${esc(o.id)}">On the map</a></div>
    </li>`;
  };

  const section = (title, hint, items, current) =>
    items.length
      ? `<section class="pb-group"><h3>${title} <span class="pb-group-n">${items.length}</span></h3><p class="pb-hint">${hint}</p><ul class="pb-cards">${items
          .map((o) => card(o, current))
          .join('')}</ul></section>`
      : '';

  function render() {
    list.querySelectorAll('.pb-item').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === state.problem)));
    const p = byId[state.problem];
    const keep = (o) => !state.donateOnly || o.donateUrl;
    const mains = main(p).filter(keep);
    const alsos = also(p).filter(keep);
    const funds = p.id === 'unfunded' ? [] : orgs.filter((o) => o.type === 'Fund' && !o.problems.includes(p.id) && keep(o));
    const hidden = main(p).length + also(p).length - mains.length - alsos.length;

    $('detail').innerHTML = `
      <div class="pb-head">
        <p class="eyebrow">The problem</p>
        <h2>${esc(p.label)}</h2>
        <p class="pb-problem">${esc(p.problem)}</p>
        <p class="pb-buys"><strong>What a donation here pays for:</strong> ${esc(p.buys)}</p>
        <label class="check"><input id="donate-only" type="checkbox" ${state.donateOnly ? 'checked' : ''}/> Only show orgs with a donate page</label>
      </div>
      ${section('Focused mainly on this', 'This is their main line of work.', mains, p.id)}
      ${section('Also working on this', 'This is one of several things they do.', alsos, p.id)}
      ${!mains.length && !alsos.length ? `<p class="empty">No listings here have a donate page${hidden ? `; ${hidden} hidden by the filter` : ''}.</p>` : ''}
      ${funds.length ? `<section class="pb-group pb-funds"><h3>Or let grantmakers choose</h3><p class="pb-hint">These funds give across AI safety, including this area. You give once and their grant managers pick the projects.</p><ul class="pb-fundlist">${funds
        .map((o) => `<li><a href="${esc(o.donateUrl || o.website)}" target="_blank" rel="noopener">${esc(o.name)}</a><span>${esc(o.approach)}</span></li>`)
        .join('')}</ul></section>` : ''}`;
    $('donate-only').addEventListener('change', (e) => {
      state.donateOnly = e.target.checked;
      render();
    });
  }

  function select(id, focus) {
    state.problem = byId[id] ? id : problems[0].id;
    history.replaceState(null, '', `#${state.problem}`);
    render();
    if (focus && window.matchMedia('(max-width: 900px)').matches) {
      $('detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  window.addEventListener('hashchange', () => select(decodeURIComponent(location.hash.slice(1)), true));
  select(decodeURIComponent(location.hash.slice(1)), false);
})();
