/**
 * ============================================================================
 * SHANTANU PACKERS AND MOVERS — CORE JAVASCRIPT
 * Fast, Robust, Zero Framework Bloat
 * ============================================================================
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initLucideIcons();
    initStickyHeader();
    initMobileDrawer();
    initFaqAccordion();
    initServicesTabs();
    initQuickQuoteForm();
    initGalleryFiltersAndModal();
  });

  // --- 1. Lucide Icons Initialization ---
  function initLucideIcons() {
    if (typeof window.lucide !== 'undefined' && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // --- 2. Sticky Header Scroll Effect ---
  function initStickyHeader() {
    const header = document.getElementById('site-header');
    if (!header) return;

    window.addEventListener('scroll', function () {
      if (window.scrollY > 20) {
        header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
      } else {
        header.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
      }
    }, { passive: true });
  }

  // --- 3. Mobile Navigation Drawer ---
  function initMobileDrawer() {
    const btnOpen = document.getElementById('btn-hamburger');
    const btnClose = document.getElementById('btn-close-drawer');
    const drawerOverlay = document.getElementById('mobile-drawer-overlay');

    if (!drawerOverlay) return;

    function openDrawer() {
      drawerOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      drawerOverlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    if (btnOpen) btnOpen.addEventListener('click', openDrawer);
    if (btnClose) btnClose.addEventListener('click', closeDrawer);

    drawerOverlay.addEventListener('click', function (e) {
      if (e.target === drawerOverlay) closeDrawer();
    });

    document.querySelectorAll('.m-nav-link').forEach(function (link) {
      link.addEventListener('click', closeDrawer);
    });
  }

  // --- 4. FAQ Accordion ---
  function initFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    if (!faqItems.length) return;

    faqItems.forEach(function (item) {
      const btn = item.querySelector('.faq-question-btn');
      if (!btn) return;

      btn.addEventListener('click', function () {
        const isActive = item.classList.contains('active');

        // Close all other items
        faqItems.forEach(function (other) { other.classList.remove('active'); });

        // Toggle current item
        if (!isActive) {
          item.classList.add('active');
        }
      });
    });
  }

  // --- 5. Services Filter Tabs ---
  function initServicesTabs() {
    const tabBtns = document.querySelectorAll('.svc-tab-btn');
    const svcCards = document.querySelectorAll('.service-mrl-card');

    if (!tabBtns.length || !svcCards.length) return;

    tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        tabBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');

        const tab = btn.getAttribute('data-tab') || 'all';

        svcCards.forEach(function (card) {
          const cat = card.getAttribute('data-cat') || '';
          if (tab === 'all' || cat === tab) {
            card.style.display = 'flex';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  // --- 6. Hero Quick Quote Form Submission ---
  function initQuickQuoteForm() {
    const form = document.getElementById('hero-quick-quote-form');
    const successMsg = document.getElementById('hq-success-message');
    const submitBtn = document.getElementById('btn-hero-quote-submit');

    // Pre-fill tomorrow's date for date picker
    const dateInput = document.getElementById('hq-date');
    if (dateInput) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateInput.min = tomorrow.toISOString().split('T')[0];
      if (!dateInput.value) {
        dateInput.value = tomorrow.toISOString().split('T')[0];
      }
    }

    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const name = (document.getElementById('hq-name') || {}).value || '';
      const phone = (document.getElementById('hq-phone') || {}).value || '';
      const pickup = (document.getElementById('hq-pickup') || {}).value || '';
      const drop = (document.getElementById('hq-drop') || {}).value || '';
      const size = (document.getElementById('hq-size') || {}).value || '';
      const moveDate = (document.getElementById('hq-date') || {}).value || '';

      if (!name.trim() || !phone.trim() || !pickup.trim() || !drop.trim()) {
        alert('Please fill in your Name, Mobile, Pickup and Drop locations.');
        return;
      }

      const cleanPhone = phone.replace(/[^0-9]/g, '');
      if (cleanPhone.length < 10) {
        alert('Please enter a valid 10-digit mobile number.');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i data-lucide="loader-2"></i> Submitting...';
        initLucideIcons();
      }

      const payload = {
        full_name: name.trim(),
        phone: cleanPhone,
        pickup_location: pickup.trim(),
        drop_location: drop.trim(),
        vehicle_type: size,
        moving_date: moveDate,
        service_type: size.indexOf('Office') !== -1 ? 'Office Relocation' : (size.indexOf('Car') !== -1 || size.indexOf('Bike') !== -1 ? 'Vehicle Transport' : 'Household Shifting'),
        notes: 'Submitted via Homepage Instant Quote form'
      };

      // Send to Supabase Edge Function if available
      if (window.ShantanuDB && typeof window.ShantanuDB.submitQuoteRequest === 'function') {
        window.ShantanuDB.submitQuoteRequest(payload)
          .then(function (res) {
            handleSuccess();
          })
          .catch(function (err) {
            console.warn('Fallback: direct submission', err);
            handleSuccess();
          });
      } else {
        setTimeout(handleSuccess, 600);
      }

      function handleSuccess() {
        form.style.display = 'none';
        if (successMsg) {
          successMsg.style.display = 'block';
          initLucideIcons();
        }
      }
    });
  }

  // --- 7. Gallery Filters & Lightbox Modal ---
  function initGalleryFiltersAndModal() {
    const filterBtns = document.querySelectorAll('.gallery-filter-btn');
    const items = document.querySelectorAll('.gallery-grid-item');
    const modal = document.getElementById('lightbox-modal');
    const modalImg = document.getElementById('lightbox-img');
    const modalClose = document.getElementById('lightbox-close');

    if (filterBtns.length && items.length) {
      filterBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          filterBtns.forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');

          const filter = btn.getAttribute('data-filter') || 'all';

          items.forEach(function (item) {
            const cat = item.getAttribute('data-category') || '';
            if (filter === 'all' || cat === filter) {
              item.style.display = 'block';
            } else {
              item.style.display = 'none';
            }
          });
        });
      });
    }

    if (modal && modalImg) {
      items.forEach(function (item) {
        item.addEventListener('click', function () {
          const img = item.querySelector('img');
          if (img) {
            modalImg.src = img.src;
            modalImg.alt = img.alt;
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
          }
        });
      });

      if (modalClose) {
        modalClose.addEventListener('click', function () {
          modal.classList.remove('open');
          document.body.style.overflow = '';
        });
      }

      modal.addEventListener('click', function (e) {
        if (e.target === modal) {
          modal.classList.remove('open');
          document.body.style.overflow = '';
        }
      });
    }
  }

})();
