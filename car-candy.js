/* ============================================
   CAR CANDY — Gallery & Lightbox JS
   ============================================ */

/* ── Filter Tabs ── */
const filterTabs = document.querySelectorAll('.filter-tab');
const galleryItems = document.querySelectorAll('.gallery-item');

filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const filter = tab.dataset.filter;
    galleryItems.forEach(item => {
      const show = filter === 'all' || item.dataset.category === filter;
      item.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
      if (show) {
        item.style.display = '';
        setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'scale(1)'; }, 10);
      } else {
        item.style.opacity = '0';
        item.style.transform = 'scale(0.95)';
        setTimeout(() => { item.style.display = 'none'; }, 350);
      }
    });
  });
});

/* ── Lightbox ── */
const lightbox       = document.getElementById('lightbox');
const lightboxImg    = document.getElementById('lightboxImg');
const lightboxCap    = document.getElementById('lightboxCaption');
const lightboxClose  = document.getElementById('lightboxClose');
const lightboxPrev   = document.getElementById('lightboxPrev');
const lightboxNext   = document.getElementById('lightboxNext');

let currentIndex = 0;
let imageList    = [];

function buildImageList() {
  imageList = Array.from(document.querySelectorAll('.gallery-item img, .featured-car__image img'));
}

function openLightbox(idx) {
  buildImageList();
  currentIndex = idx;
  showImage(currentIndex);
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

function showImage(idx) {
  const img = imageList[idx];
  if (!img) return;
  lightboxImg.src = img.src.replace(/w=\d+/, 'w=1200');
  lightboxImg.alt = img.alt;
  lightboxCap.textContent = img.alt || '';
}

function prevImage() {
  currentIndex = (currentIndex - 1 + imageList.length) % imageList.length;
  showImage(currentIndex);
}

function nextImage() {
  currentIndex = (currentIndex + 1) % imageList.length;
  showImage(currentIndex);
}

document.querySelectorAll('.gallery-item, .featured-car').forEach(item => {
  item.style.cursor = 'pointer';
  item.addEventListener('click', () => {
    buildImageList();
    const img = item.querySelector('img');
    const idx = imageList.indexOf(img);
    openLightbox(idx >= 0 ? idx : 0);
  });
});

if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
if (lightboxPrev)  lightboxPrev.addEventListener('click', prevImage);
if (lightboxNext)  lightboxNext.addEventListener('click', nextImage);

if (lightbox) {
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
}

document.addEventListener('keydown', e => {
  if (!lightbox || !lightbox.classList.contains('open')) return;
  if (e.key === 'Escape')      closeLightbox();
  if (e.key === 'ArrowLeft')   prevImage();
  if (e.key === 'ArrowRight')  nextImage();
});
