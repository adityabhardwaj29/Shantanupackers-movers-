/**
 * ============================================================================
 * SHANTANU PACKERS AND MOVERS - LIVE GPS CONSIGNMENT TRACKING
 * Pure Vanilla JavaScript
 * ============================================================================
 */

(function() {
  const SAMPLE_TRACKING_DATA = {
    'SPM-74921': {
      consignmentId: 'SPM-74921',
      customerName: 'Kunal Verma',
      pickupCity: 'Nalasopara East, Palghar',
      deliveryCity: 'Kothrud, Pune, Maharashtra',
      serviceType: '2 BHK Household Express Move',
      bookingDate: '2026-08-20',
      expectedDelivery: '2026-08-22 (Today, By 4:00 PM)',
      currentStatus: 'Out for Delivery',
      progressPercentage: 85,
      driverName: 'Suresh Yadav',
      driverPhone: '+91 8218059678',
      vehicleNumber: 'MH-48-AZ-8921 (19ft Container)',
      lastLocation: 'Pune Expressway Toll Plaza / Katraj Entry',
      lastUpdated: '15 Mins Ago',
      timeline: [
        {
          status: 'Order Placed & Survey Verified',
          description: 'Inventory confirmed and moving schedule booked.',
          timestamp: '20 Aug 2026, 10:00 AM',
          completed: true
        },
        {
          status: 'Packing & Barcode Tagging Completed',
          description: '4-layer protective packaging executed with room labels.',
          timestamp: '21 Aug 2026, 02:30 PM',
          completed: true
        },
        {
          status: 'Dispatched from Nalasopara Hub',
          description: 'Loaded onto 19ft weatherproof container truck.',
          timestamp: '21 Aug 2026, 06:00 PM',
          completed: true
        },
        {
          status: 'In Transit on Mumbai-Pune Highway',
          description: 'Vehicle GPS tracking active; steady transit speed maintained.',
          timestamp: '22 Aug 2026, 06:30 AM',
          completed: true
        },
        {
          status: 'Out for Final Delivery in Pune',
          description: 'Unloading team on-site preparing hydraulic ramps.',
          timestamp: '22 Aug 2026, 01:15 PM',
          completed: true,
          current: true
        },
        {
          status: 'Delivered & Unpacked',
          description: 'Furniture reassembly and client sign-off.',
          timestamp: 'Pending Final Delivery Handover',
          completed: false
        }
      ]
    },
    'SPM-83912': {
      consignmentId: 'SPM-83912',
      customerName: 'Meenakshi Iyer',
      pickupCity: 'Vasai West, Mumbai MMR',
      deliveryCity: 'Indiranagar, Bengaluru, Karnataka',
      serviceType: '3 BHK Intercity Relocation',
      bookingDate: '2026-08-19',
      expectedDelivery: '2026-08-23',
      currentStatus: 'In Transit',
      progressPercentage: 60,
      driverName: 'Ramesh Singh',
      driverPhone: '+91 9371482180',
      vehicleNumber: 'MH-04-EK-4590 (24ft Multi-Axle Container)',
      lastLocation: 'Hubballi - Davanagere NH-48 Highway',
      lastUpdated: '35 Mins Ago',
      timeline: [
        {
          status: 'Booking Confirmed',
          description: 'White-glove 3 BHK inventory booked.',
          timestamp: '19 Aug 2026, 11:00 AM',
          completed: true
        },
        {
          status: 'Wooden Crating & Packing Finished',
          description: 'High-value furniture and glassware safely packed.',
          timestamp: '20 Aug 2026, 04:00 PM',
          completed: true
        },
        {
          status: 'Dispatched from Mumbai Central Hub',
          description: 'En-route to Karnataka corridor via NH-48.',
          timestamp: '21 Aug 2026, 08:00 AM',
          completed: true
        },
        {
          status: 'In Transit (Karnataka Section)',
          description: 'GPS active; driver adhering to safety speed limits.',
          timestamp: '22 Aug 2026, 08:30 AM',
          completed: true,
          current: true
        },
        {
          status: 'Out for Delivery',
          description: 'Scheduled arrival at Bengaluru local transit hub.',
          timestamp: '23 Aug 2026, Expected 10:00 AM',
          completed: false
        },
        {
          status: 'Delivered & Assembled',
          description: 'Room placement and unpacking.',
          timestamp: '23 Aug 2026, Expected 03:00 PM',
          completed: false
        }
      ]
    }
  };

  function initTracking() {
    const trackInput = document.getElementById('tracking-input-id');
    const trackBtn = document.getElementById('btn-track-submit');
    const quickTrackPills = document.querySelectorAll('.quick-track-id');

    if (trackBtn && trackInput) {
      trackBtn.addEventListener('click', () => {
        handleTrackSearch(trackInput.value.trim());
      });

      trackInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleTrackSearch(trackInput.value.trim());
        }
      });
    }

    if (quickTrackPills) {
      quickTrackPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
          e.preventDefault();
          const id = pill.getAttribute('data-id');
          if (trackInput) trackInput.value = id;
          handleTrackSearch(id);
        });
      });
    }

    // Auto-search if URL query param exists (?track=SPM-74921)
    const urlParams = new URLSearchParams(window.location.search);
    const queryTrackId = urlParams.get('track');
    if (queryTrackId) {
      if (trackInput) trackInput.value = queryTrackId;
      handleTrackSearch(queryTrackId);
    }
  }

  function handleTrackSearch(id) {
    const resultContainer = document.getElementById('tracking-result-area');
    if (!resultContainer) return;

    if (!id) {
      resultContainer.innerHTML = `
        <div style="padding: 1.5rem; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius); color: #991b1b; text-align: center;">
          Please enter a valid Consignment / Quote ID (e.g. <strong>SPM-74921</strong>).
        </div>
      `;
      return;
    }

    const cleanId = id.toUpperCase();

    // Check sample database
    let record = SAMPLE_TRACKING_DATA[cleanId];

    // If not in sample, check local quotes saved by user
    if (!record && window.ShantanuDB) {
      const localQuotes = window.ShantanuDB.getLocalQuotes();
      const match = localQuotes.find(q => q.quote_id.toUpperCase() === cleanId);
      if (match) {
        record = {
          consignmentId: match.quote_id,
          customerName: match.full_name,
          pickupCity: match.pickup_location,
          deliveryCity: match.drop_location,
          serviceType: match.service_type,
          bookingDate: match.moving_date,
          expectedDelivery: 'Under Scheduling',
          currentStatus: 'Survey & Dispatch Scheduled',
          progressPercentage: 25,
          driverName: 'Move Coordinator Assigned',
          driverPhone: '+91 8218059678',
          vehicleNumber: 'Dedicated Closed Container',
          lastLocation: 'Nalasopara Dispatch Desk',
          lastUpdated: 'Just now',
          timeline: [
            {
              status: 'Quote Request Received',
              description: 'Quote reference registered in database.',
              timestamp: 'Confirmed',
              completed: true
            },
            {
              status: 'Supervisor Survey Scheduled',
              description: 'Move coordinator assigning packaging crew & truck.',
              timestamp: 'In Progress',
              completed: true,
              current: true
            },
            {
              status: 'Packing & Loading',
              description: '4-layer protective packaging on moving day.',
              timestamp: match.moving_date,
              completed: false
            },
            {
              status: 'Dispatched & En-Route',
              description: 'Highway transit with live GPS tracking.',
              timestamp: 'Upcoming',
              completed: false
            },
            {
              status: 'Delivered',
              description: 'Doorstep unloading and setup.',
              timestamp: 'Upcoming',
              completed: false
            }
          ]
        };
      }
    }

    if (!record) {
      resultContainer.innerHTML = `
        <div style="padding: 2rem; background-color: var(--slate-50); border: 1px dashed var(--slate-300); border-radius: var(--radius); text-align: center;">
          <div style="font-size: 1.15rem; font-weight: 800; color: var(--slate-800);">No Live Consignment Found for "${cleanId}"</div>
          <p style="font-size: 0.875rem; color: var(--slate-600); margin-top: 0.5rem; max-width: 500px; margin-left: auto; margin-right: auto;">
            Please double check your 8-digit Consignment Number or contact our 24/7 Helpline at <strong>+91 8218059678</strong> / <strong>+91 9371482180</strong> for instant vehicle location updates.
          </p>
          <div style="margin-top: 1rem;">
            <a href="https://wa.me/918218059678?text=${encodeURIComponent('Hello Shantanu Packers, please update me on tracking ID: ' + cleanId)}" class="btn btn-whatsapp btn-sm" target="_blank">
              Check via WhatsApp Dispatch Desk
            </a>
          </div>
        </div>
      `;
      return;
    }

    // Render Tracking Card
    resultContainer.innerHTML = `
      <div style="background-color: var(--slate-900); color: var(--white); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 1.5rem;">
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; border-bottom: 1px solid var(--slate-800); padding-bottom: 1rem;">
          <div>
            <span class="badge badge-orange" style="margin-bottom: 0.25rem;">Live Active Transit</span>
            <h3 style="font-size: 1.5rem; font-weight: 900; font-family: var(--font-mono); color: #fb923c;">${record.consignmentId}</h3>
            <div style="font-size: 0.8125rem; color: var(--slate-300);">${record.serviceType} &bull; Client: <strong>${record.customerName}</strong></div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.75rem; color: var(--slate-400);">Current Status</div>
            <div style="font-size: 1.125rem; font-weight: 800; color: #4ade80;">${record.currentStatus}</div>
            <div style="font-size: 0.7rem; color: var(--slate-400);">Updated: ${record.lastUpdated}</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-top: 1.25rem;">
          <div style="background-color: rgba(255, 255, 255, 0.05); padding: 0.75rem; border-radius: var(--radius-sm);">
            <div style="font-size: 0.7rem; color: var(--slate-400); text-transform: uppercase;">Origin</div>
            <div style="font-size: 0.875rem; font-weight: 700; color: var(--white);">${record.pickupCity}</div>
          </div>
          <div style="background-color: rgba(255, 255, 255, 0.05); padding: 0.75rem; border-radius: var(--radius-sm);">
            <div style="font-size: 0.7rem; color: var(--slate-400); text-transform: uppercase;">Destination</div>
            <div style="font-size: 0.875rem; font-weight: 700; color: var(--white);">${record.deliveryCity}</div>
          </div>
          <div style="background-color: rgba(255, 255, 255, 0.05); padding: 0.75rem; border-radius: var(--radius-sm);">
            <div style="font-size: 0.7rem; color: var(--slate-400); text-transform: uppercase;">Assigned Vehicle</div>
            <div style="font-size: 0.875rem; font-weight: 700; color: var(--white);">${record.vehicleNumber}</div>
          </div>
          <div style="background-color: rgba(255, 255, 255, 0.05); padding: 0.75rem; border-radius: var(--radius-sm);">
            <div style="font-size: 0.7rem; color: var(--slate-400); text-transform: uppercase;">Driver / Coordinator</div>
            <div style="font-size: 0.875rem; font-weight: 700; color: #fb923c;">
              <a href="tel:${record.driverPhone.replace(/[^0-9+]/g, '')}" style="color: inherit; text-decoration: none;">📞 ${record.driverName}</a>
            </div>
          </div>
        </div>
      </div>

      <!-- Timeline Stepper -->
      <div class="timeline-stepper">
        ${record.timeline.map((step, idx) => `
          <div class="timeline-step ${step.completed ? 'completed' : ''} ${step.current ? 'active' : ''}">
            <div class="timeline-dot">
              ${step.completed ? '✓' : idx + 1}
            </div>
            <div style="font-size: 0.95rem; font-weight: 800; color: var(--slate-900);">${step.status}</div>
            <div style="font-size: 0.8125rem; color: var(--slate-600); margin-top: 0.15rem;">${step.description}</div>
            <div style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--primary); margin-top: 0.25rem;">🕒 ${step.timestamp}</div>
          </div>
        `).join('')}
      </div>
    `;

    // Re-trigger Lucide icons if present
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // Auto initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTracking);
  } else {
    initTracking();
  }
})();
