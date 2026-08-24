/**
 * ============================================================================
 * SHANTANU PACKERS AND MOVERS - GLOBAL SCRIPTS & INTERACTIVITY
 * Pure Vanilla JavaScript (No React / No Framework Overhead)
 * ============================================================================
 */

(function() {
  document.addEventListener('DOMContentLoaded', () => {
    initLucideIcons();
    initMobileNav();
    initFaqAccordion();
    initChecklist();
    initGalleryFilter();
    initHeroNormalQuoteForm();
  });

  /**
   * Initialize Lucide Icons via CDN
   */
  function initLucideIcons() {
    if (typeof window.lucide !== 'undefined' && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  /**
   * Mobile Navigation Drawer Toggle
   */
  function initMobileNav() {
    const hamburgerBtn = document.getElementById('btn-hamburger');
    const drawer = document.getElementById('mobile-nav-drawer');
    const closeBtn = document.getElementById('btn-close-drawer');

    if (hamburgerBtn && drawer) {
      hamburgerBtn.addEventListener('click', () => {
        drawer.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    }

    if (closeBtn && drawer) {
      closeBtn.addEventListener('click', () => {
        drawer.classList.remove('open');
        document.body.style.overflow = '';
      });
    }

    if (drawer) {
      drawer.addEventListener('click', (e) => {
        if (e.target === drawer) {
          drawer.classList.remove('open');
          document.body.style.overflow = '';
        }
      });

      // Close drawer when clicking any link inside
      drawer.querySelectorAll('.mobile-nav-link, a').forEach(link => {
        link.addEventListener('click', () => {
          drawer.classList.remove('open');
          document.body.style.overflow = '';
        });
      });

      // Close on ESC key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer.classList.contains('open')) {
          drawer.classList.remove('open');
          document.body.style.overflow = '';
        }
      });
    }
  }

  /**
   * FAQ Accordion Toggle
   */
  function initFaqAccordion() {
    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        if (!item) return;

        const isOpen = item.classList.contains('open');
        
        // Close other FAQ items
        document.querySelectorAll('.faq-item').forEach(other => {
          if (other !== item) other.classList.remove('open');
        });

        if (isOpen) {
          item.classList.remove('open');
        } else {
          item.classList.add('open');
        }
      });
    });
  }

  /**
   * Interactive 4-Week Moving Checklist
   */
  function initChecklist() {
    document.querySelectorAll('.checklist-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Toggle done status
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (e.target !== checkbox && checkbox) {
          checkbox.checked = !checkbox.checked;
        }
        if (checkbox && checkbox.checked) {
          item.classList.add('done');
        } else {
          item.classList.remove('done');
        }
      });
    });
  }

  /**
   * Gallery Filter Tabs
   */
  function initGalleryFilter() {
    const filterBtns = document.querySelectorAll('.gallery-filter-btn');
    const galleryCards = document.querySelectorAll('.gallery-card');

    if (filterBtns.length && galleryCards.length) {
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          filterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          const filter = btn.getAttribute('data-filter');

          galleryCards.forEach(card => {
            const cat = card.getAttribute('data-category');
            if (filter === 'all' || cat === filter) {
              card.style.display = 'block';
            } else {
              card.style.display = 'none';
            }
          });
        });
      });
    }
  }

  /**
   * Normal Quotes Form on Home Page (Hero Section)
   * Fields: full name, mobile no, pickup location, drop location, service choose, date, time
   * Actions: Send on WhatsApp OR Submit Quote
   */
  function initHeroNormalQuoteForm() {
    const form = document.getElementById('hero-normal-quote-form');
    if (!form) return;

    // Set default min date to tomorrow
    const dateInput = document.getElementById('hero-date');
    if (dateInput) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const minDateStr = tomorrow.toISOString().split('T')[0];
      dateInput.min = minDateStr;
      if (!dateInput.value) {
        dateInput.value = minDateStr;
      }
    }

    function getHeroFormData() {
      const fullName = document.getElementById('hero-fullname')?.value.trim() || '';
      const mobileNo = document.getElementById('hero-phone')?.value.trim() || '';
      const pickup = document.getElementById('hero-pickup')?.value.trim() || '';
      const drop = document.getElementById('hero-drop')?.value.trim() || '';
      const service = document.getElementById('hero-service')?.value || 'Household Shifting';
      const date = document.getElementById('hero-date')?.value || '';
      const time = document.getElementById('hero-time')?.value || 'Morning (7:30 AM - 10:30 AM)';

      return { fullName, mobileNo, pickup, drop, service, date, time };
    }

    function validateHeroForm(data) {
      if (!data.fullName || data.fullName.length < 2) {
        alert('Please enter your full name (at least 2 characters).');
        document.getElementById('hero-fullname')?.focus();
        return false;
      }
      const cleanPhone = data.mobileNo.replace(/[^0-9]/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        alert('Please enter a valid 10-digit mobile number.');
        document.getElementById('hero-phone')?.focus();
        return false;
      }
      if (!data.pickup || data.pickup.length < 2) {
        alert('Please enter your pickup location.');
        document.getElementById('hero-pickup')?.focus();
        return false;
      }
      if (!data.drop || data.drop.length < 2) {
        alert('Please enter your delivery destination.');
        document.getElementById('hero-drop')?.focus();
        return false;
      }
      if (!data.date) {
        alert('Please choose your moving date.');
        document.getElementById('hero-date')?.focus();
        return false;
      }
      return true;
    }

    // Action 1: Send on WhatsApp
    const btnWa = document.getElementById('btn-hero-whatsapp');
    if (btnWa) {
      btnWa.addEventListener('click', (e) => {
        e.preventDefault();
        const data = getHeroFormData();
        if (!validateHeroForm(data)) return;

        const waText = `Hello Shantanu Packers and Movers (Govt. Reg: UDYAM-MH-17-0244739),\n\nI need a relocation quote:\n\n*Full Name:* ${data.fullName}\n*Mobile No:* ${data.mobileNo}\n*Pickup Location:* ${data.pickup}\n*Drop Location:* ${data.drop}\n*Service Chosen:* ${data.service}\n*Moving Date:* ${data.date}\n*Time Slot:* ${data.time}\n\nPlease share the official written estimate with zero hidden charges.`;

        const waUrl = `https://wa.me/918218059678?text=${encodeURIComponent(waText)}`;
        window.open(waUrl, '_blank');
      });
    }

    // Action 2: Submit Quote
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = getHeroFormData();
      if (!validateHeroForm(data)) return;

      const submitBtn = document.getElementById('btn-hero-submit');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Submitting...';
      }

      const quoteId = window.ShantanuDB ? window.ShantanuDB.generateQuoteId() : `STN-${new Date().getFullYear()}-${Math.floor(100000 + Math.random()*900000)}`;

      const payload = {
        quote_id: quoteId,
        full_name: data.fullName,
        phone: data.mobileNo,
        email: `${data.mobileNo}@shantanupackers.com`,
        pickup_location: data.pickup,
        drop_location: data.drop,
        moving_date: data.date,
        moving_time: data.time,
        service_type: data.service,
        vehicle_type: data.service,
        floor_number: 'Ground / Lift',
        lift_available: true,
        packing_required: '4-Layer Packaging',
        additional_notes: `Requested via Quick Quote Form on Home Page`
      };

      try {
        if (window.ShantanuDB) {
          await window.ShantanuDB.submitQuoteRequest(payload);
        }
      } catch (err) {
        console.warn('Saved quote locally:', err);
      }

      // Show success receipt
      const formElem = document.getElementById('hero-normal-quote-form');
      const successElem = document.getElementById('hero-quote-success');
      const nameElem = document.getElementById('hero-success-name');
      const idElem = document.getElementById('hero-success-id');
      const waLinkElem = document.getElementById('hero-success-wa-link');

      if (nameElem) nameElem.textContent = `Thank You, ${data.fullName}!`;
      if (idElem) idElem.textContent = quoteId;
      if (waLinkElem) {
        const waText = `Hello Shantanu Packers and Movers,\n\nI have registered a new quote request.\n\n*Booking ID:* ${quoteId}\n*Name:* ${data.fullName}\n*Phone:* ${data.mobileNo}\n*Pickup:* ${data.pickup}\n*Drop:* ${data.drop}\n*Service:* ${data.service}\n*Date:* ${data.date}\n*Time:* ${data.time}\n\nPlease share the official written estimate.`;
        waLinkElem.href = `https://wa.me/918218059678?text=${encodeURIComponent(waText)}`;
      }

      if (formElem) formElem.style.display = 'none';
      if (successElem) successElem.style.display = 'block';

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit Quote';
      }

      if (window.lucide) {
        window.lucide.createIcons();
      }
    });

    // Reset button
    const btnAgain = document.getElementById('btn-hero-quote-again');
    if (btnAgain) {
      btnAgain.addEventListener('click', () => {
        const formElem = document.getElementById('hero-normal-quote-form');
        const successElem = document.getElementById('hero-quote-success');
        if (formElem) formElem.style.display = 'block';
        if (successElem) successElem.style.display = 'none';
        form.reset();
      });
    }
  }
})();
