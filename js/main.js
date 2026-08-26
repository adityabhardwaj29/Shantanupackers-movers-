/**
 * =========================================================================
 * SHANTANU PACKERS AND MOVERS — CORE APPLICATION JAVASCRIPT
 * Pure Vanilla JavaScript — High Performance, Zero Framework Overhead
 * =========================================================================
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initLucideIcons();
    initMobileDrawer();
    initFaqAccordion();
    initServiceTabs();
    initHeroQuickForm();
    initScrollReveal();
  });

  // =========================================================================
  // 1. LUCIDE ICONS INITIALIZATION
  // =========================================================================
  function initLucideIcons() {
    if (typeof window.lucide !== 'undefined' && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // =========================================================================
  // 2. MOBILE NAVIGATION DRAWER
  // =========================================================================
  function initMobileDrawer() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const drawer = document.getElementById('mobile-drawer');
    const closeBtn = document.getElementById('drawer-close-btn');
    const backdrop = document.getElementById('drawer-backdrop');

    if (!drawer) return;

    function openDrawer() {
      drawer.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'true');
    }

    function closeDrawer() {
      drawer.classList.remove('open');
      document.body.style.overflow = '';
      if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'false');
    }

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    drawer.querySelectorAll('.drawer-link').forEach(function (link) {
      link.addEventListener('click', closeDrawer);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('open')) {
        closeDrawer();
      }
    });
  }

  // =========================================================================
  // 3. FAQ ACCORDION
  // =========================================================================
  function initFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    if (!faqItems.length) return;

    faqItems.forEach(function (item) {
      const questionBtn = item.querySelector('.faq-question');
      if (!questionBtn) return;

      questionBtn.addEventListener('click', function () {
        const isActive = item.classList.contains('active');

        // Close all other items
        faqItems.forEach(function (other) {
          other.classList.remove('active');
        });

        // Toggle clicked
        if (!isActive) {
          item.classList.add('active');
        }
      });
    });
  }

  // =========================================================================
  // 4. SERVICE CATEGORY TABS
  // =========================================================================
  function initServiceTabs() {
    const tabs = document.querySelectorAll('.service-tab-btn');
    const cards = document.querySelectorAll('.mrl-service-card');
    if (!tabs.length || !cards.length) return;

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');

        const filter = tab.getAttribute('data-filter') || 'all';

        cards.forEach(function (card) {
          if (filter === 'all') {
            card.style.display = 'flex';
          } else {
            const title = card.querySelector('.srv-title')?.textContent.toLowerCase() || '';
            if (
              (filter === 'household' && title.includes('household')) ||
              (filter === 'office' && title.includes('office')) ||
              (filter === 'vehicle' && (title.includes('car') || title.includes('bike'))) ||
              (filter === 'storage' && (title.includes('warehouse') || title.includes('storage') || title.includes('packing')))
            ) {
              card.style.display = 'flex';
            } else {
              card.style.display = 'none';
            }
          }
        });
      });
    });
  }

  // =========================================================================
  // 5. HERO INSTANT QUOTE FORM
  // =========================================================================
  function initHeroQuickForm() {
    const form = document.getElementById('hero-normal-quote-form');
    const successEl = document.getElementById('hero-quote-success');
    const btnAgain = document.getElementById('btn-hero-quote-again');

    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const nameVal = document.getElementById('hq-name')?.value.trim();
      const phoneVal = document.getElementById('hq-phone')?.value.trim();
      const fromVal = document.getElementById('hq-from')?.value.trim();
      const toVal = document.getElementById('hq-to')?.value.trim();
      const serviceVal = document.getElementById('hq-service')?.value;
      const dateVal = document.getElementById('hq-date')?.value;

      if (!nameVal || !phoneVal || !fromVal || !toVal) {
        alert('Please fill in your Name, Phone number, Pickup, and Destination.');
        return;
      }

      const cleanPhone = phoneVal.replace(/[^0-9]/g, '');
      if (cleanPhone.length < 10) {
        alert('Please enter a valid 10-digit mobile number.');
        return;
      }

      const submitBtn = document.getElementById('hero-quote-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Securing Quote...';
      }

      const quoteId = `STN-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const payload = {
        quote_id: quoteId,
        full_name: nameVal,
        phone: cleanPhone,
        email: `${cleanPhone}@shantanupackers.com`,
        pickup_location: fromVal,
        drop_location: toVal,
        moving_date: dateVal || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        moving_time: 'Morning (7:30 AM - 10:30 AM)',
        service_type: serviceVal || 'Household Shifting',
        vehicle_type: serviceVal || '2 BHK Family Move',
        floor_number: 'Ground Floor',
        lift_available: true,
        packing_required: 'Full Professional 4-Layer Packaging',
        additional_notes: 'Submitted via Hero Instant Quote Form'
      };

      if (window.ShantanuDB && typeof window.ShantanuDB.submitQuoteRequest === 'function') {
        window.ShantanuDB.submitQuoteRequest(payload)
          .then(function () { showSuccess(); })
          .catch(function () { showSuccess(); });
      } else {
        setTimeout(showSuccess, 600);
      }

      function showSuccess() {
        form.style.display = 'none';
        if (successEl) successEl.style.display = 'block';
        if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
      }
    });

    if (btnAgain) {
      btnAgain.addEventListener('click', function () {
        if (successEl) successEl.style.display = 'none';
        form.style.display = 'block';
        form.reset();
        const submitBtn = document.getElementById('hero-quote-submit-btn');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i data-lucide="sparkles" style="width:18px;height:18px;"></i> GET INSTANT SHIFTING QUOTE';
          if (typeof window.lucide !== 'undefined') window.lucide.createIcons();
        }
      });
    }
  }

  // =========================================================================
  // 6. SCROLL REVEAL UTILITY
  // =========================================================================
  function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      reveals.forEach(function (el) { observer.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add('visible'); });
    }
  }

})();
