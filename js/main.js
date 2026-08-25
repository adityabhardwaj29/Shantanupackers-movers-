/**
 * ============================================================================
 * SHANTANU PACKERS AND MOVERS — GLOBAL SCRIPTS & INTERACTIVITY
 * Pure Vanilla JavaScript — No Framework Overhead
 * ============================================================================
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initLucideIcons();
    initHeaderScroll();
    initMobileNav();
    initScrollReveal();
    initActiveNavLink();
    initGalleryFilter();
    initLightbox();
    initHeroQuoteForm();
    initGalleryLightboxEvents();
  });

  // ============================================================
  // LUCIDE ICONS
  // ============================================================
  function initLucideIcons() {
    if (typeof window.lucide !== 'undefined' && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // ============================================================
  // HEADER SCROLL SHADOW
  // ============================================================
  function initHeaderScroll() {
    const header = document.getElementById('site-header');
    if (!header) return;
    function onScroll() {
      if (window.scrollY > 24) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ============================================================
  // MOBILE NAVIGATION DRAWER
  // ============================================================
  function initMobileNav() {
    const hamburger = document.getElementById('hamburger-btn');
    const drawer = document.getElementById('mobile-drawer');
    const closeBtn = document.getElementById('drawer-close-btn');
    const backdrop = document.getElementById('drawer-backdrop');

    if (!drawer) return;

    function openDrawer() {
      drawer.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (hamburger) hamburger.setAttribute('aria-expanded', 'true');
    }
    function closeDrawer() {
      drawer.classList.remove('open');
      document.body.style.overflow = '';
      if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    }

    if (hamburger) hamburger.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    // Close on nav link click
    drawer.querySelectorAll('.drawer-nav-link').forEach(function (link) {
      link.addEventListener('click', closeDrawer);
    });

    // Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
    });
  }

  // ============================================================
  // SCROLL REVEAL ANIMATION
  // ============================================================
  function initScrollReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

      els.forEach(function (el) { observer.observe(el); });
    } else {
      els.forEach(function (el) { el.classList.add('visible'); });
    }
  }

  // ============================================================
  // ACTIVE NAV LINK
  // ============================================================
  function initActiveNavLink() {
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';

    document.querySelectorAll('.nav-link, .drawer-nav-link').forEach(function (link) {
      var href = link.getAttribute('href') || '';
      if (href === currentPage || (currentPage === '' && href === 'index.html')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // ============================================================
  // GALLERY FILTER
  // ============================================================
  function initGalleryFilter() {
    var filterBtns = document.querySelectorAll('.filter-btn');
    var galleryItems = document.querySelectorAll('.gallery-item');

    if (!filterBtns.length || !galleryItems.length) return;

    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        // Update active button
        filterBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');

        var filter = btn.getAttribute('data-filter') || 'all';

        galleryItems.forEach(function (item) {
          var cat = item.getAttribute('data-category') || '';
          if (filter === 'all' || cat === filter) {
            item.style.display = '';
            item.style.opacity = '1';
          } else {
            item.style.display = 'none';
            item.style.opacity = '0';
          }
        });
      });
    });
  }

  // ============================================================
  // LIGHTBOX
  // ============================================================
  function initLightbox() {
    var lightbox = document.getElementById('lightbox');
    var lbImg = document.getElementById('lb-img');
    var lbClose = document.getElementById('lb-close');

    if (!lightbox || !lbImg) return;

    if (lbClose) {
      lbClose.addEventListener('click', function () {
        lightbox.classList.remove('open');
        document.body.style.overflow = '';
      });
    }

    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) {
        lightbox.classList.remove('open');
        document.body.style.overflow = '';
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lightbox.classList.contains('open')) {
        lightbox.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  function initGalleryLightboxEvents() {
    var lightbox = document.getElementById('lightbox');
    var lbImg = document.getElementById('lb-img');

    if (!lightbox || !lbImg) return;

    document.querySelectorAll('.gallery-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var img = item.querySelector('img');
        if (!img) return;
        lbImg.src = img.src;
        lbImg.alt = img.alt;
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
        if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
      });
    });
  }

  // ============================================================
  // HOMEPAGE INLINE QUOTE FORM (hero-normal-quote-form)
  // ============================================================
  function initHeroQuoteForm() {
    var form = document.getElementById('hero-normal-quote-form');
    var successEl = document.getElementById('hero-quote-success');
    var btnAgain = document.getElementById('btn-hero-quote-again');

    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var nameVal = (document.getElementById('hq-name') || {}).value || '';
      var phoneVal = (document.getElementById('hq-phone') || {}).value || '';
      var fromVal = (document.getElementById('hq-from') || {}).value || '';
      var toVal = (document.getElementById('hq-to') || {}).value || '';
      var serviceVal = (document.getElementById('hq-service') || {}).value || '';

      if (!nameVal.trim() || !phoneVal.trim() || !fromVal.trim() || !toVal.trim()) {
        alert('Please fill in all required fields.');
        return;
      }

      var cleanPhone = phoneVal.replace(/[^0-9]/g, '');
      if (cleanPhone.length < 10) {
        alert('Please enter a valid 10-digit mobile number.');
        return;
      }

      var submitBtn = form.querySelector('[type=submit]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i data-lucide="loader-2"></i> Submitting...';
        if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
      }

      // Build payload matching supabase.js expected fields
      var payload = {
        full_name: nameVal.trim(),
        phone: cleanPhone,
        pickup_location: fromVal.trim(),
        drop_location: toVal.trim(),
        service_type: serviceVal || 'Household Shifting',
        source: 'homepage-quick-form'
      };

      // Try Supabase Edge Function if available
      if (typeof window.submitQuote === 'function') {
        window.submitQuote(payload)
          .then(function () { showHeroSuccess(); })
          .catch(function () {
            // Fallback: show success anyway (WhatsApp redirect)
            showHeroSuccess();
          });
      } else {
        // No supabase.js loaded — show success
        setTimeout(showHeroSuccess, 800);
      }

      function showHeroSuccess() {
        if (form) form.style.display = 'none';
        if (successEl) successEl.style.display = 'block';
        if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
      }
    });

    if (btnAgain) {
      btnAgain.addEventListener('click', function () {
        if (successEl) successEl.style.display = 'none';
        if (form) {
          form.style.display = 'block';
          form.reset();
          var submitBtn = form.querySelector('[type=submit]');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i data-lucide="send"></i> Get My Free Quote';
            if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
          }
        }
      });
    }
  }

})();
