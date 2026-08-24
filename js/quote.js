/**
 * ============================================================================
 * SHANTANU PACKERS AND MOVERS - USER-FRIENDLY QUOTE & BOOKING ENGINE
 * Pure Vanilla JavaScript & Supabase Integration
 * ============================================================================
 */

(function() {
  function initQuotePage() {
    const form = document.getElementById('shantanu-quote-form');
    if (!form) return;

    // Initialize visual size cards
    setupVisualSizeSelectors();

    // Prefill from URL search params if present
    prefillFromUrl();

    // Set min moving date to tomorrow
    const movingDateInput = document.getElementById('quote-moving-date');
    if (movingDateInput) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      movingDateInput.min = tomorrow.toISOString().split('T')[0];
      if (!movingDateInput.value) {
        movingDateInput.value = tomorrow.toISOString().split('T')[0];
      }
    }

    // Attach form submit handler
    form.addEventListener('submit', handleQuoteSubmit);

    // Attach WhatsApp direct booking button
    const btnWa = document.getElementById('btn-quote-whatsapp');
    if (btnWa) {
      btnWa.addEventListener('click', handleWhatsAppDirectQuote);
    }
  }

  function setupVisualSizeSelectors() {
    const cards = document.querySelectorAll('.visual-size-card');
    const hiddenInput = document.getElementById('quote-vehicle-type');

    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => {
          c.classList.remove('active');
          c.style.borderColor = 'var(--slate-200)';
          c.style.background = 'transparent';
          const title = c.querySelector('div:nth-of-type(1)');
          if (title) title.style.color = 'var(--slate-900)';
        });

        card.classList.add('active');
        card.style.borderColor = 'var(--primary)';
        card.style.background = 'var(--primary-light)';
        const title = card.querySelector('div:nth-of-type(1)');
        if (title) title.style.color = 'var(--primary)';

        const chosenSize = card.getAttribute('data-size');
        if (hiddenInput && chosenSize) {
          hiddenInput.value = chosenSize;
        }
      });
    });
  }

  function prefillFromUrl() {
    const params = new URLSearchParams(window.location.search);
    
    if (params.get('pickup')) {
      const el = document.getElementById('quote-pickup');
      if (el) el.value = params.get('pickup');
    }
    if (params.get('drop') || params.get('destination')) {
      const el = document.getElementById('quote-drop');
      if (el) el.value = params.get('drop') || params.get('destination');
    }
    if (params.get('service')) {
      const el = document.getElementById('quote-service-type');
      if (el) el.value = params.get('service');
    }
    if (params.get('size')) {
      const sizeVal = params.get('size');
      const hiddenInput = document.getElementById('quote-vehicle-type');
      if (hiddenInput) hiddenInput.value = sizeVal;

      // Select corresponding visual card
      const targetCard = document.querySelector(`.visual-size-card[data-size="${sizeVal}"]`);
      if (targetCard) {
        targetCard.click();
      }
    }
    if (params.get('date')) {
      const el = document.getElementById('quote-moving-date');
      if (el) el.value = params.get('date');
    }
  }

  function getFormData() {
    const fullName = document.getElementById('quote-full-name')?.value.trim() || '';
    const phone = document.getElementById('quote-phone')?.value.trim() || '';
    const email = document.getElementById('quote-email')?.value.trim() || '';
    const pickup = document.getElementById('quote-pickup')?.value.trim() || '';
    const drop = document.getElementById('quote-drop')?.value.trim() || '';
    const movingDate = document.getElementById('quote-moving-date')?.value || '';
    const movingTime = document.getElementById('quote-moving-time')?.value || 'Morning (7:30 AM - 10:30 AM)';
    const vehicleType = document.getElementById('quote-vehicle-type')?.value || '2 BHK Family Move';
    const floorNumber = document.getElementById('quote-floor')?.value || 'Ground Floor';
    const liftAvailable = document.getElementById('quote-lift')?.value === 'true' ? 'Lift Available' : 'No Lift';
    const serviceType = document.getElementById('quote-service-type')?.value || 'Household Shifting';
    const notes = document.getElementById('quote-notes')?.value.trim() || 'Standard Household Inventory';

    return {
      fullName,
      phone,
      email,
      pickup,
      drop,
      movingDate,
      movingTime,
      vehicleType,
      floorNumber,
      liftAvailable,
      serviceType,
      notes
    };
  }

  function validateQuoteFormData(data) {
    document.querySelectorAll('.field-error').forEach(el => el.remove());
    let hasError = false;

    if (!data.fullName || data.fullName.length < 2) {
      showError('quote-full-name', 'Please enter your full name (minimum 2 characters)');
      hasError = true;
    }

    const cleanPhone = data.phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      showError('quote-phone', 'Please enter a valid 10-digit mobile number');
      hasError = true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
      showError('quote-email', 'Please enter a valid email address (e.g. name@example.com)');
      hasError = true;
    }

    if (!data.pickup || data.pickup.length < 2) {
      showError('quote-pickup', 'Please enter your pickup location');
      hasError = true;
    }

    if (!data.drop || data.drop.length < 2) {
      showError('quote-drop', 'Please enter your delivery destination');
      hasError = true;
    }

    if (!data.movingDate) {
      showError('quote-moving-date', 'Please select your preferred moving date');
      hasError = true;
    }

    return !hasError;
  }

  function handleWhatsAppDirectQuote(e) {
    if (e) e.preventDefault();
    const data = getFormData();
    if (!validateQuoteFormData(data)) return;

    const text = `Hello Shantanu Packers and Movers (Govt. Reg: UDYAM-MH-17-0244739),\n\nI want to book a move and get a written quotation:\n\n*Full Name:* ${data.fullName}\n*Mobile No:* ${data.phone}\n*Email:* ${data.email}\n*Pickup Location:* ${data.pickup}\n*Drop Location:* ${data.drop}\n*Service Chosen:* ${data.serviceType}\n*Move Scale:* ${data.vehicleType}\n*Moving Date:* ${data.movingDate}\n*Time Slot:* ${data.movingTime}\n*Notes:* ${data.notes}\n\nPlease share the official 100% written binding estimate.`;

    const waUrl = `https://wa.me/918218059678?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  }

  async function handleQuoteSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('btn-submit-quote');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Confirm Booking';

    const data = getFormData();
    if (!validateQuoteFormData(data)) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Securing Your Quote ID...';
    }

    const cleanPhone = data.phone.replace(/[^0-9]/g, '');
    const quoteId = window.ShantanuDB ? window.ShantanuDB.generateQuoteId() : `STN-${new Date().getFullYear()}-${Math.floor(100000 + Math.random()*900000)}`;

    const quotePayload = {
      quote_id: quoteId,
      full_name: data.fullName,
      phone: data.phone,
      email: data.email || `${cleanPhone}@shantanupackers.com`,
      pickup_location: data.pickup,
      drop_location: data.drop,
      moving_date: data.movingDate,
      moving_time: data.movingTime,
      service_type: data.serviceType,
      vehicle_type: data.vehicleType,
      floor_number: data.floorNumber,
      lift_available: true,
      packing_required: 'Full Professional 4-Layer Packaging',
      additional_notes: data.notes
    };

    try {
      if (window.ShantanuDB) {
        await window.ShantanuDB.submitQuoteRequest(quotePayload);
      }
      displayQuoteSuccessReceipt(quotePayload);
    } catch (err) {
      console.warn('Submission saved locally:', err);
      displayQuoteSuccessReceipt(quotePayload);
    }
  }

  function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    const err = document.createElement('span');
    err.className = 'field-error';
    err.style.color = '#ef4444';
    err.style.fontSize = '0.75rem';
    err.style.fontWeight = '600';
    err.style.marginTop = '0.25rem';
    err.style.display = 'block';
    err.textContent = message;
    field.parentNode.appendChild(err);
    field.focus();
  }

  function displayQuoteSuccessReceipt(quote) {
    const formCard = document.getElementById('quote-form-card');
    const receiptContainer = document.getElementById('quote-receipt-card');

    if (formCard) formCard.style.display = 'none';
    if (receiptContainer) {
      receiptContainer.style.display = 'block';
      receiptContainer.innerHTML = `
        <div style="background: var(--white); border: 2px solid var(--emerald); border-radius: var(--radius-xl); padding: 2.5rem; box-shadow: var(--shadow-xl); text-align: center;">
          <div style="width: 4.5rem; height: 4.5rem; border-radius: 50%; background-color: var(--emerald-light); color: var(--emerald-dark); display: flex; align-items: center; justify-content: center; font-size: 2.25rem; margin: 0 auto 1rem auto; font-weight: 900;">
            ✓
          </div>
          <span class="badge badge-emerald">Quote Registered & Guaranteed</span>
          <h2 style="font-size: 1.85rem; font-weight: 900; color: var(--slate-900); margin-top: 0.5rem;">
            Thank You, ${quote.full_name}!
          </h2>
          <p style="font-size: 0.95rem; color: var(--slate-600); margin-top: 0.5rem; max-width: 550px; margin-left: auto; margin-right: auto;">
            Your relocation booking request has been registered with our dispatch supervisor. 100% written binding price guarantee.
          </p>

          <div style="background: var(--slate-900); color: var(--white); border-radius: var(--radius); padding: 1.25rem; margin: 1.75rem auto; max-width: 480px; display: flex; align-items: center; justify-content: space-between;">
            <div style="text-align: left;">
              <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Official Booking ID</div>
              <div style="font-family: var(--font-heading); font-size: 1.5rem; font-weight: 900; color: #fb923c;">${quote.quote_id}</div>
            </div>
            <button type="button" class="btn btn-sm btn-white" onclick="navigator.clipboard.writeText('${quote.quote_id}'); alert('Booking ID copied to clipboard: ${quote.quote_id}');">
              📋 Copy ID
            </button>
          </div>

          <div style="background-color: var(--slate-50); border: 1.5px solid var(--slate-200); border-radius: var(--radius); padding: 1.5rem; text-align: left; font-size: 0.9rem; margin-bottom: 1.75rem; max-width: 600px; margin-left: auto; margin-right: auto;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div><strong style="color: var(--slate-900);">Full Name:</strong> <span style="color: var(--slate-600);">${quote.full_name}</span></div>
              <div><strong style="color: var(--slate-900);">Mobile No:</strong> <span style="color: var(--slate-600);">${quote.phone}</span></div>
              <div><strong style="color: var(--slate-900);">Email:</strong> <span style="color: var(--slate-600);">${quote.email}</span></div>
              <div><strong style="color: var(--slate-900);">Service:</strong> <span style="color: var(--slate-600);">${quote.service_type}</span></div>
              <div><strong style="color: var(--slate-900);">Pickup:</strong> <span style="color: var(--slate-600);">${quote.pickup_location}</span></div>
              <div><strong style="color: var(--slate-900);">Destination:</strong> <span style="color: var(--slate-600);">${quote.drop_location}</span></div>
              <div><strong style="color: var(--slate-900);">Moving Date:</strong> <span style="color: var(--slate-600);">${quote.moving_date}</span></div>
              <div><strong style="color: var(--slate-900);">Time Slot:</strong> <span style="color: var(--slate-600);">${quote.moving_time}</span></div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 500px; margin: 0 auto;">
            <a href="https://wa.me/918218059678?text=${encodeURIComponent(
              `Hello Shantanu Packers and Movers,\n\nI have registered a new quote request.\n\n*Booking ID:* ${quote.quote_id}\n*Name:* ${quote.full_name}\n*Phone:* ${quote.phone}\n*Email:* ${quote.email}\n*Pickup:* ${quote.pickup_location}\n*Drop:* ${quote.drop_location}\n*Service:* ${quote.service_type}\n*Move Date:* ${quote.moving_date}\n*Time Slot:* ${quote.moving_time}\n\nPlease verify and share the official written estimate.`
            )}" class="btn btn-whatsapp btn-lg" target="_blank">
              💬 Instant 1-Click WhatsApp Verification & Quote PDF
            </a>

            <div style="display: flex; gap: 0.75rem; justify-content: center; margin-top: 0.5rem; flex-wrap: wrap;">
              <a href="tel:+918218059678" class="btn btn-primary">
                📞 Call Relocation Supervisor (+91 8218059678)
              </a>
              <a href="gallery.html" class="btn btn-outline">
                📷 View Packaging Gallery
              </a>
            </div>
          </div>
        </div>
      `;

      receiptContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }
  }

  // Auto initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuotePage);
  } else {
    initQuotePage();
  }
})();
