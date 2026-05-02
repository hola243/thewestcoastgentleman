/* ─────────────────────────────────────────────
   Content Loader — reads content.json and
   populates every page from it automatically
   ───────────────────────────────────────────── */

(async function () {
  let content;
  try {
    const res = await fetch('/content.json?v=' + Date.now());
    content = await res.json();
    window.WCG = content; // expose globally for admin
  } catch (e) {
    console.warn('Content loader: could not load content.json', e);
    return;
  }

  /* ── Helpers ── */
  function get(path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), content);
  }

  function set(el, val) {
    if (val === undefined || val === null) return;
    if (el.tagName === 'IMG') { el.src = val; return; }
    if (el.dataset.cBg !== undefined) {
      el.style.backgroundImage = `url('${val}')`;
      return;
    }
    el.textContent = val;
  }

  /* ── Text + images (data-c="path") ── */
  document.querySelectorAll('[data-c]').forEach(el => set(el, get(el.dataset.c)));

  /* ── Background images (data-c-bg="path") ── */
  document.querySelectorAll('[data-c-bg]').forEach(el => {
    const val = get(el.dataset.cBg);
    if (val) el.style.backgroundImage = `url('${val}')`;
  });

  /* ── Img src (data-c-src="path") ── */
  document.querySelectorAll('[data-c-src]').forEach(el => {
    const val = get(el.dataset.cSrc);
    if (val) el.src = val;
  });

  /* ── Car gallery (car-candy.html) ── */
  buildCarGallery(content);

  /* ── Services cards (services.html) ── */
  buildServiceCards(content);

  /* ── About values + timeline ── */
  buildValues(content);
  buildTimeline(content);

})();

/* ─── Car Gallery ─── */
function buildCarGallery(content) {
  const featuredEl = document.getElementById('featured-car-block');
  if (featuredEl && content.cars?.featured) {
    const f = content.cars.featured;
    const img   = featuredEl.querySelector('[data-c="cars.featured.image"]');
    const brand = featuredEl.querySelector('[data-c="cars.featured.brand"]');
    const model = featuredEl.querySelector('[data-c="cars.featured.model"]');
    const spec  = featuredEl.querySelector('[data-c="cars.featured.spec"]');
    const desc  = featuredEl.querySelector('[data-c="cars.featured.description"]');
    const tags  = featuredEl.querySelector('[data-c="cars.featured.tags"]');
    if (img)   img.src = f.image;
    if (brand) brand.textContent = f.brand;
    if (model) model.textContent = f.model;
    if (spec)  spec.textContent  = f.spec;
    if (desc)  desc.textContent  = f.description;
    if (tags && f.tags) tags.innerHTML = f.tags.map(t => `<span>${t}</span>`).join('');
  }

  const galleryRoot = document.getElementById('gallery-root');
  if (!galleryRoot || !content.cars?.gallery) return;

  /* Group cars by category */
  const categories = {
    exotic:   { label: 'Exotic Machines',   eyebrow: 'Exotic'         },
    german:   { label: 'German Engineering', eyebrow: 'German'         },
    italian:  { label: 'La Dolce Vita',      eyebrow: 'Italian'        },
    american: { label: 'American Muscle',    eyebrow: 'American'       },
    classic:  { label: 'Icons & Heritage',   eyebrow: 'Classic & JDM'  },
    jdm:      { label: 'Icons & Heritage',   eyebrow: 'Classic & JDM'  },
  };

  const grouped = {};
  content.cars.gallery.forEach(car => {
    const cat = car.category === 'jdm' ? 'classic' : car.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(car);
  });

  galleryRoot.innerHTML = '';
  const catOrder = ['exotic', 'german', 'italian', 'american', 'classic'];

  catOrder.forEach(cat => {
    const cars = grouped[cat];
    if (!cars?.length) return;
    const meta = categories[cat];
    const isReverse = ['german', 'american'].includes(cat);

    const section = document.createElement('div');
    section.className = 'gallery-category';
    section.id = `cat-${cat}`;
    section.setAttribute('data-reveal', '');

    section.innerHTML = `
      <div class="gallery-cat-header">
        <span class="eyebrow">${meta.eyebrow}</span>
        <div class="divider-gold"></div>
        <h2>${meta.label}</h2>
      </div>
      <div class="gallery-grid ${isReverse ? 'gallery-grid--reverse' : ''}">
        ${cars.map((car, i) => `
          <div class="gallery-item ${i === 0 ? 'gallery-item--wide' : ''}"
               data-category="${car.category}"
               data-reveal>
            <img src="${car.image}" alt="${car.brand} ${car.model}" loading="lazy" />
            <div class="gallery-item__overlay">
              <div class="gallery-item__info">
                <span class="eyebrow">${car.brand}</span>
                <h3>${car.model}</h3>
                <p>${car.location}</p>
              </div>
            </div>
          </div>`).join('')}
      </div>`;

    galleryRoot.appendChild(section);
  });
}

/* ─── Services Cards ─── */
function buildServiceCards(content) {
  const root = document.getElementById('services-cards-root');
  if (!root || !content.services?.cards) return;
  root.innerHTML = content.services.cards.map((card, i) => `
    <div class="service-card ${i === 5 ? 'service-card--accent' : ''}" data-reveal>
      <div class="service-card__number">${card.number}</div>
      <div class="service-card__icon">${card.icon}</div>
      <h3>${card.title}</h3>
      <p>${card.description}</p>
      <ul class="service-card__list">
        ${card.items.map(item => `<li>${item}</li>`).join('')}
      </ul>
      <a href="#contact" class="btn ${i === 5 ? 'btn--primary' : 'btn--ghost'}" style="margin-top:1.5rem;">
        ${i === 5 ? "Let's Talk" : 'Inquire'}
      </a>
    </div>`).join('');
}

/* ─── About Values ─── */
function buildValues(content) {
  const root = document.getElementById('values-root');
  if (!root || !content.about?.values) return;
  root.innerHTML = content.about.values.map(v => `
    <div class="value-card" data-reveal>
      <div class="value-card__icon">${v.icon}</div>
      <h3>${v.title}</h3>
      <p>${v.text}</p>
    </div>`).join('');
}

/* ─── About Timeline ─── */
function buildTimeline(content) {
  const root = document.getElementById('timeline-root');
  if (!root || !content.about?.timeline) return;
  root.innerHTML = content.about.timeline.map(e => `
    <div class="timeline-item" data-reveal>
      <div class="timeline-year">${e.year}</div>
      <div class="timeline-content">
        <h3>${e.title}</h3>
        <p>${e.text}</p>
      </div>
    </div>`).join('');
}
