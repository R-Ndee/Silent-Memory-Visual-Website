/**
 * SILENT MEMORY PHOTOGRAPHY - MAIN JS MODULE
 * Shared header behaviors, mobile menu, scroll observers, deep-linking helper
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileMenu();
  initActiveNavLink();
  initScrollObserver();
  initHashDeepLinking();
});

/**
 * Handle navbar background shift on scroll
 */
function initNavbar() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/**
 * Handle mobile navigation drawer open/close
 */
function initMobileMenu() {
  const toggleBtn = document.querySelector('.mobile-menu-toggle');
  const drawer = document.querySelector('.mobile-drawer');
  if (!toggleBtn || !drawer) return;

  toggleBtn.addEventListener('click', () => {
    const isOpen = toggleBtn.classList.toggle('open');
    drawer.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close drawer when clicking a link
  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggleBtn.classList.remove('open');
      drawer.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

/**
 * Mark current page link as active in header
 */
function initActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const links = document.querySelectorAll('.nav-link, .mobile-nav-link');

  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const pageName = href.split('/').pop().split('#')[0].split('?')[0];

    if (
      pageName === currentPath ||
      (currentPath === '' && pageName === 'index.html') ||
      (currentPath === 'index.html' && pageName === 'index.html')
    ) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/**
 * Intersection Observer for smooth fade-in sections
 */
function initScrollObserver() {
  const fadeElements = document.querySelectorAll('.fade-in-section');
  if (fadeElements.length === 0) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  fadeElements.forEach(el => observer.observe(el));
}

/**
 * Handle URL hash deep linking (e.g. #graduation or #event-documentation on pricelist page)
 */
function initHashDeepLinking() {
  if (!window.location.hash) return;
  const hash = window.location.hash.substring(1);
  if (!hash) return;

  // Small delay to ensure tab JS or page elements are initialized
  setTimeout(() => {
    const targetElement = document.getElementById(hash);
    if (targetElement) {
      // Trigger tab click if target is inside a tab or is a tab container
      const tabButton = document.querySelector(`.tab-btn[data-tab="${hash}"]`);
      if (tabButton) {
        tabButton.click();
      }
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  }, 100);
}
