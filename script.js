/*
 * AI Safety Donation Map
 *
 * This script initialises a Leaflet map and populates it with markers
 * representing organisations and projects working on AI safety. Each
 * marker includes a brief description and a link to donate. Markers are
 * grouped into overlay layers based on subfields (e.g. technical research,
 * policy & governance), and a built‑in layer control allows users to
 * toggle subfields on and off. A legend in the bottom left of the map
 * shows the colour associated with each subfield.
 */

// Dataset of organisations/projects. Each entry contains a name, type,
// subfields (one or more categories), a short description, coordinates and
// a donation URL.
const data = [
  {
    name: 'Machine Intelligence Research Institute (MIRI)',
    type: 'Organization',
    subfields: ['Technical AI Safety Research'],
    description:
      'MIRI is a research nonprofit that studies technical AI safety. Their work aims to reduce existential risks from developing smarter‑than‑human AI and has helped found the field of AI alignment【264482696110063†L38-L41】.',
    lat: 37.7937,
    lng: -122.3969,
    donationUrl: 'https://intelligence.org/donate/'
  },
  {
    name: 'Center for AI Safety (CAIS)',
    type: 'Organization',
    subfields: ['Technical AI Safety Research', 'Field-building & Education'],
    description:
      'CAIS is an AI safety non‑profit focused on reducing societal‑scale risks from artificial intelligence. Donations support research to remove dangerous behaviours in AIs, field‑building efforts that bring more experts into AI safety, and advocacy to advise governments【791617804177327†L46-L82】.',
    lat: 37.7904,
    lng: -122.4043,
    donationUrl: 'https://safe.ai/donate'
  },
  {
    name: 'Ought',
    type: 'Organization',
    subfields: ['Technical AI Safety Research'],
    description:
      'Ought is a non‑profit research lab whose mission is to scale up good reasoning. The team studies how machine learning can help with thought and reflection, aiming to develop AI systems that support high‑quality reasoning【758199386228696†L7-L11】. Donations support their work on AI alignment and reasoning tools【369513947221023†L28-L33】.',
    lat: 37.7749,
    lng: -122.4194,
    donationUrl: 'https://ought.org/donate'
  },
  {
    name: 'Center for Human-Compatible AI (CHAI)',
    type: 'Organization',
    subfields: ['Technical AI Safety Research'],
    description:
      'CHAI is a multi‑institution research group at UC Berkeley focused on ensuring that future AI systems are provably beneficial. They develop conceptual and technical tools to reorient AI research away from arbitrary objective fulfilment towards aligned behaviour【86589987909197†L38-L50】. Donations go through UC Berkeley’s giving portal【639228649751588†L31-L37】.',
    lat: 37.8715,
    lng: -122.2730,
    donationUrl: 'https://humancompatible.ai/donate/'
  },
  {
    name: 'Future of Life Institute (FLI)',
    type: 'Organization',
    subfields: ['Policy & Governance'],
    description:
      'The Future of Life Institute works to steer transformative technologies away from extreme, large‑scale risks and toward benefiting life. Donations enable the organisation to grow, fund new projects and support others working to reduce global catastrophic risks【436863307379863†L69-L83】.',
    lat: 42.3736,
    lng: -71.1097,
    donationUrl: 'https://futureoflife.org/about-us/donate/'
  },
  {
    name: 'Long‑Term Future Fund (LTFF)',
    type: 'Fund',
    subfields: ['Funding & Grantmaking'],
    description:
      'The Long‑Term Future Fund makes grants that aim to positively influence the long‑term trajectory of civilization. It addresses global catastrophic risks—particularly those from advanced AI and pandemics—and promotes longtermist ideas【271231481449494†L58-L63】.',
    lat: 51.7520,
    lng: -1.2577,
    donationUrl: 'https://funds.effectivealtruism.org/funds/far-future'
  },
  {
    name: 'AI Safety and Governance Fund (AISGF)',
    type: 'Organization',
    subfields: ['Policy & Governance'],
    description:
      'AISGF is a nonpartisan 501(c)(4) organisation dedicated to ensuring AI and other technologies benefit humanity. It advocates for AI to be developed safely and securely in alignment with human values and encourages public engagement and donations【253968071308808†L4-L8】【253968071308808†L45-L53】.',
    lat: 38.9072,
    lng: -77.0369,
    donationUrl: 'https://aisgf.us/'
  },
  {
    name: 'AI Impacts',
    type: 'Organization',
    subfields: ['Technical AI Safety Research'],
    description:
      'AI Impacts researches decision‑relevant questions about the future of AI. Further donations support their research by covering operating costs, internships and additional researchers; the group notes that they are not fully funded and can make good use of additional funds【256029047877325†L30-L41】.',
    lat: 37.8715,
    lng: -122.2730,
    donationUrl: 'https://aiimpacts.org/donate/'
  },
  {
    name: 'Apart Research',
    type: 'Organization',
    subfields: ['Field-building & Education'],
    description:
      'Apart Research runs a global AI safety research accelerator and talent pipeline. They have engaged thousands of participants in research sprints and produced numerous publications; donations help expand this work, supporting hackathons, fellowships and new research【75538343774276†L56-L67】.',
    lat: 55.6761,
    lng: 12.5683,
    donationUrl: 'https://apartresearch.com/donate'
  },
  {
    name: 'Stampy’s AI Safety Info',
    type: 'Project',
    subfields: ['Field-building & Education'],
    description:
      'Stampy’s AI Safety Info aims to provide a reliable, accessible source of information on existential risk from AI. Donations support distillation fellowships, automated search and summary tools, and improvements to the site to better educate the public【605572984977668†L27-L41】.',
    lat: 39.1582,
    lng: -75.5244,
    donationUrl: 'https://www.every.org/aisafetyinfo'
  }
];

// Colour palette for subfields. Colours chosen to be distinct and colour‑blind
// friendly (blue, orange, red, green).
const categoryColors = {
  'Technical AI Safety Research': '#0074D9',
  'Field-building & Education': '#FF851B',
  'Policy & Governance': '#FF4136',
  'Funding & Grantmaking': '#2ECC40'
};

// Initialise the map centred roughly over the Atlantic. The zoom level is set
// to 2 so that all markers are visible by default.
const map = L.map('map').setView([20, 0], 2);

// Add OpenStreetMap tile layer.
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
}).addTo(map);

// Create layer groups for each subfield. We will fill these later with
// markers. Using layer groups allows us to toggle categories via the
// layers control.
const layers = {};
Object.keys(categoryColors).forEach((subfield) => {
  layers[subfield] = L.layerGroup();
});

// For each organisation/project, add a marker to the appropriate layer(s).
data.forEach((item) => {
  item.subfields.forEach((sf) => {
    // Create a circle marker with category colour.
    const marker = L.circleMarker([item.lat, item.lng], {
      radius: 8,
      color: categoryColors[sf],
      fillColor: categoryColors[sf],
      fillOpacity: 0.8
    });
    // Build popup HTML. Use target="_blank" to open donation links in a new tab.
    const popupContent = `
      <strong>${item.name}</strong><br />
      <span>${item.description}</span><br />
      <a href="${item.donationUrl}" target="_blank" rel="noopener">Donate</a>
    `;
    marker.bindPopup(popupContent);
    marker.addTo(layers[sf]);
  });
});

// Add all layers to the map initially.
Object.values(layers).forEach((layerGroup) => {
  layerGroup.addTo(map);
});

// Create an overlay layers object for the layer control. Keys are labels and
// values are the corresponding layer groups.
const overlayLayers = {};
Object.keys(layers).forEach((sf) => {
  overlayLayers[sf] = layers[sf];
});

// Add layer control to the map. This provides checkboxes to toggle
// subfields on and off. Set collapsed to false so the control is open by
// default on desktop.
L.control.layers(null, overlayLayers, { collapsed: false }).addTo(map);

// Add a legend showing the colours associated with each subfield. This
// legend is a custom Leaflet control positioned in the bottom left.
const legend = L.control({ position: 'bottomleft' });
legend.onAdd = function () {
  const div = L.DomUtil.create('div', 'legend');
  div.innerHTML = '<h4>Subfields</h4>';
  for (const sf of Object.keys(categoryColors)) {
    const color = categoryColors[sf];
    div.innerHTML += `<i style="background:${color}"></i> ${sf}<br />`;
  }
  return div;
};
legend.addTo(map);

// Fit the map bounds to show all markers. We compute a LatLngBounds from
// all data points. If there is only one point, Leaflet may not adjust
// correctly, so handle that case by keeping the default view.
if (data.length > 1) {
  const bounds = L.latLngBounds(data.map((d) => [d.lat, d.lng]));
  map.fitBounds(bounds.pad(0.2));
}