/**
 * SILENT MEMORY PHOTOGRAPHY - GALLERY ENGINE
 * Handles manifest loading, 2-level filtering, curated ALL view, stagger entrance,
 * mouse follower ("Lihat"), lightbox, and dynamic Dual-CTA.
 */

// Category Metadata Mapping
const CATEGORIES_DATA = {
  'all': {
    name: 'All Works',
    subcategories: [],
    hasPricelist: false
  },
  'graduation': {
    name: 'Graduation',
    subcategories: [],
    hasPricelist: true,
    pricelistAnchor: 'graduation'
  },
  'private-photoshoot': {
    name: 'Private Photoshoot',
    subcategories: [
      { id: 'all', label: 'All Private' },
      { id: 'model', label: 'Model' },
      { id: 'pageant', label: 'Pageant' },
      { id: 'others', label: 'Others' }
    ],
    hasPricelist: false
  },
  'romantic-package': {
    name: 'Love Package',
    subcategories: [
      { id: 'all', label: 'All Romantic' },
      { id: 'couple', label: 'Couple' },
      { id: 'prewedding', label: 'Prewedding' },
      { id: 'engagement', label: 'Engagement' },
      { id: 'wedding', label: 'Wedding' }
    ],
    hasPricelist: false
  },
  'love-package': {
    name: 'Love Package',
    subcategories: [
      { id: 'all', label: 'All Romantic' },
      { id: 'couple', label: 'Couple' },
      { id: 'prewedding', label: 'Prewedding' },
      { id: 'engagement', label: 'Engagement' },
      { id: 'wedding', label: 'Wedding' }
    ],
    hasPricelist: false
  },
  'event-documentation': {
    name: 'Event Documentation',
    subcategories: [
      { id: 'all', label: 'All Events' },
      { id: 'birthday', label: 'Birthday' },
      { id: 'pageant', label: 'Pageant' },
      { id: 'church-event', label: 'Church Event' },
      { id: 'others', label: 'Others' }
    ],
    hasPricelist: true,
    pricelistAnchor: 'event-documentation'
  },
  'commercial': {
    name: 'Commercial',
    subcategories: [],
    hasPricelist: false
  }
};

let manifestData = [];
let currentCategory = 'all';
let currentSubcategory = 'all';
let currentFilteredList = [];
let currentLightboxIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
  initCursorFollower();
  initLightbox();

  // Load manifest JSON with script fallback for direct file:// browsing
  try {
    const response = await fetch('data/gallery-manifest.json');
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    manifestData = await response.json();
  } catch (err) {
    if (window.GALLERY_MANIFEST && Array.isArray(window.GALLERY_MANIFEST)) {
      manifestData = window.GALLERY_MANIFEST;
    } else {
      console.error('Failed to load gallery manifest:', err);
      manifestData = [];
    }
  }

  // Parse initial category from URL query parameters (e.g. ?category=graduation)
  const urlParams = new URLSearchParams(window.location.search);
  const paramCategory = urlParams.get('category');
  if (paramCategory && CATEGORIES_DATA[paramCategory]) {
    currentCategory = paramCategory;
  }

  initMainFilters();
  renderGallery();
});

/**
 * Initialize Main Category Filter Buttons
 */
function initMainFilters() {
  const mainFilterBtns = document.querySelectorAll('.filter-btn-main');

  mainFilterBtns.forEach(btn => {
    const cat = btn.getAttribute('data-category');
    if (cat === currentCategory) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }

    btn.addEventListener('click', () => {
      if (currentCategory === cat) return;

      mainFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      currentCategory = cat;
      currentSubcategory = 'all'; // Reset subcategory on main category switch

      // Update URL query string without reloading page
      const newUrl = new URL(window.location);
      if (cat === 'all') {
        newUrl.searchParams.delete('category');
      } else {
        newUrl.searchParams.set('category', cat);
      }
      window.history.pushState({}, '', newUrl);

      renderSubFilters();
      renderGallery();
    });
  });

  renderSubFilters();
}

/**
 * Render Level 2 Sub-category Filter Buttons dynamically
 */
function renderSubFilters() {
  const subFilterContainer = document.getElementById('sub-filter-bar');
  if (!subFilterContainer) return;

  const catMeta = CATEGORIES_DATA[currentCategory];

  if (!catMeta || !catMeta.subcategories || catMeta.subcategories.length === 0) {
    subFilterContainer.innerHTML = '';
    subFilterContainer.style.display = 'none';
    return;
  }

  subFilterContainer.style.display = 'flex';
  subFilterContainer.innerHTML = catMeta.subcategories.map(sub => `
    <button class="filter-btn-sub ${sub.id === currentSubcategory ? 'active' : ''}" data-subcategory="${sub.id}">
      ${sub.label}
    </button>
  `).join('');

  subFilterContainer.querySelectorAll('.filter-btn-sub').forEach(btn => {
    btn.addEventListener('click', () => {
      const subId = btn.getAttribute('data-subcategory');
      if (currentSubcategory === subId) return;

      subFilterContainer.querySelectorAll('.filter-btn-sub').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      currentSubcategory = subId;
      renderGallery();
    });
  });
}

/**
 * Render Gallery Masonry Items & handle category mood tint + dual CTA
 */
function renderGallery() {
  const gridSection = document.getElementById('gallery-grid-section');
  const masonryContainer = document.getElementById('gallery-masonry');
  const contextCtaBar = document.getElementById('gallery-context-cta');

  if (!masonryContainer || !gridSection) return;

  // Set category mood tint on grid section
  gridSection.setAttribute('data-active-category', currentCategory);

  // Update Dynamic Dual CTA bar
  updateDualCtaBar(contextCtaBar);

  // Filter Data
  if (currentCategory === 'all') {
    // "ALL" = Curated list items (featured: true) interleaved
    currentFilteredList = manifestData.filter(item => item.featured !== false);
  } else {
    currentFilteredList = manifestData.filter(item => {
      const matchCat = item.category === currentCategory || 
                       (currentCategory === 'romantic-package' && item.category === 'love-package') || 
                       (currentCategory === 'love-package' && item.category === 'romantic-package');
      if (!matchCat) return false;
      if (currentSubcategory === 'all') return true;
      return item.subcategory === currentSubcategory;
    });
  }

  // Clear existing items
  masonryContainer.innerHTML = '';

  if (currentFilteredList.length === 0) {
    masonryContainer.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; color: var(--text-secondary);">
        <p style="font-family: var(--font-heading); font-size: 1.5rem; color: var(--text-primary); margin-bottom: 0.5rem;">Belum ada foto dalam kategori ini</p>
        <p style="font-size: 0.95rem; max-width: 550px; margin: 0 auto; line-height: 1.6;">
          Portofolio untuk kategori ini sedang kami siapkan. <a href="contact.html" style="color: var(--accent-gold); text-decoration: underline; font-weight: 500;">Hubungi kami</a> untuk melihat contoh karya terbaru.
        </p>
      </div>
    `;
    return;
  }

  // Render items with stagger entrance
  currentFilteredList.forEach((item, index) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'gallery-item';
    itemEl.setAttribute('data-index', index);

    // Image variant srcset pattern (900w, 1600w, 2560w WebP)
    const srcset = `assets/images/${item.src}-900.webp 900w, assets/images/${item.src}-1600.webp 1600w, assets/images/${item.src}-2560.webp 2560w`;
    const fallbackSrc = `assets/images/${item.src}-900.webp`;

    itemEl.innerHTML = `
      <img src="${fallbackSrc}" 
           srcset="${srcset}" 
           sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
           alt="${item.title || 'Silent Memory Photography'}"
           loading="lazy"
           onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';">
      <div class="gallery-placeholder-box ${item.orientation || 'portrait'}" style="display: none;">
        <span class="gallery-placeholder-cat">${(item.category || '').toUpperCase()} · ${item.year || '2026'}</span>
        <h3 class="gallery-placeholder-title">${item.title || 'Silent Memory Photography'}</h3>
      </div>
      <div class="gallery-item-info">
        <span style="font-size: 0.72rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--accent-gold); display: block;">${(item.category || '').toUpperCase()}</span>
        <span style="font-family: var(--font-heading); font-size: 1.1rem; color: #FFFFFF; display: block; margin-top: 0.2rem;">${item.title || 'Silent Memory Photography'}</span>
      </div>
    `;

    // Click handler to open Lightbox
    itemEl.addEventListener('click', () => {
      openLightbox(index);
    });

    masonryContainer.appendChild(itemEl);

    // Stagger reveal animation (~30-50ms per item)
    setTimeout(() => {
      itemEl.classList.add('revealed');
    }, Math.min(index * 40, 600));
  });
}

/**
 * Update dynamic Dual-CTA bar in gallery
 */
function updateDualCtaBar(ctaBarEl) {
  if (!ctaBarEl) return;

  if (currentCategory === 'all') {
    ctaBarEl.classList.remove('visible');
    ctaBarEl.innerHTML = '';
    return;
  }

  const catMeta = CATEGORIES_DATA[currentCategory];
  if (!catMeta) return;

  ctaBarEl.classList.add('visible');

  if (catMeta.hasPricelist) {
    ctaBarEl.innerHTML = `
      <span style="font-size: 0.9rem; color: var(--text-primary);">Ingin melihat paket harga lengkap untuk <strong>${catMeta.name}</strong>?</span>
      <a href="pricelist.html#${catMeta.pricelistAnchor}" class="btn btn-primary" style="padding: 0.5rem 1.25rem; font-size: 0.78rem;">Lihat Pricelist ${catMeta.name}</a>
    `;
  } else {
    ctaBarEl.innerHTML = `
      <span style="font-size: 0.9rem; color: var(--text-primary);">Tertarik dengan konsep foto <strong>${catMeta.name}</strong>?</span>
      <a href="contact.html?category=${currentCategory}" class="btn btn-primary" style="padding: 0.5rem 1.25rem; font-size: 0.78rem;">Konsultasi Penawaran Khusus</a>
    `;
  }
}

/**
 * Cursor follower "Lihat" label on hover
 */
function initCursorFollower() {
  const follower = document.getElementById('cursor-follower');
  if (!follower || window.innerWidth <= 1024) return;

  let mouseX = 0;
  let mouseY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    follower.style.left = `${mouseX}px`;
    follower.style.top = `${mouseY}px`;
  });

  document.addEventListener('mouseover', (e) => {
    if (e.target.closest('.gallery-item')) {
      follower.classList.add('active');
    } else {
      follower.classList.remove('active');
    }
  });
}

/**
 * Lightbox Modal Management
 */
function initLightbox() {
  const modal = document.getElementById('lightbox-modal');
  const closeBtn = document.getElementById('lightbox-close');
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');

  if (!modal) return;

  closeBtn?.addEventListener('click', closeLightbox);
  prevBtn?.addEventListener('click', prevLightbox);
  nextBtn?.addEventListener('click', nextLightbox);

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('lightbox-content-wrap')) {
      closeLightbox();
    }
  });

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') prevLightbox();
    if (e.key === 'ArrowRight') nextLightbox();
  });

  // Mobile swipe gestures
  let touchStartX = 0;
  let touchStartY = 0;

  modal.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  modal.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) prevLightbox();
      else nextLightbox();
    } else if (diffY > 100) {
      closeLightbox(); // Swipe down to close
    }
  }, { passive: true });
}

function openLightbox(index) {
  const modal = document.getElementById('lightbox-modal');
  if (!modal || index < 0 || index >= currentFilteredList.length) return;

  currentLightboxIndex = index;
  updateLightboxContent();

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const modal = document.getElementById('lightbox-modal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

function prevLightbox() {
  if (currentFilteredList.length === 0) return;
  currentLightboxIndex = (currentLightboxIndex - 1 + currentFilteredList.length) % currentFilteredList.length;
  updateLightboxContent();
}

function nextLightbox() {
  if (currentFilteredList.length === 0) return;
  currentLightboxIndex = (currentLightboxIndex + 1) % currentFilteredList.length;
  updateLightboxContent();
}

function updateLightboxContent() {
  const imgEl = document.getElementById('lightbox-img');
  const captionEl = document.getElementById('lightbox-caption');
  const placeholderEl = document.getElementById('lightbox-placeholder');

  const item = currentFilteredList[currentLightboxIndex];
  if (!item) return;

  const fallbackSrc = `assets/images/${item.src}-1600.webp`;
  const categoryUpper = (item.category || '').toUpperCase().replace('-', ' ');

  if (captionEl) {
    captionEl.innerText = `${categoryUpper} · ${item.year || '2026'} — ${item.title || ''}`;
  }

  if (imgEl && placeholderEl) {
    imgEl.style.display = 'none';
    placeholderEl.style.display = 'flex';
    placeholderEl.innerHTML = `
      <span style="font-size: 0.8rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent-gold);">${categoryUpper} · ${item.year || '2026'}</span>
      <h3 style="font-family: var(--font-heading); font-size: 1.8rem; margin-top: 0.5rem; color: #FFFFFF;">${item.title || 'Silent Memory Photography'}</h3>
    `;

    imgEl.src = fallbackSrc;
    imgEl.onload = () => {
      imgEl.style.display = 'block';
      placeholderEl.style.display = 'none';
    };
    imgEl.onerror = () => {
      imgEl.style.display = 'none';
      placeholderEl.style.display = 'flex';
    };
  }
}
