(() => {
  'use strict';

  const API_BASE = window.SERVICE_BOOKER_API || 'http://localhost:4000/api';
  const $ = id => document.getElementById(id);
  const tokenKey = 'travworld_token';
  const emailKey = 'travworld_email';

  let experiences = [];
  let activeFilter = 'All';
  let selectedExperience = null;
  let pendingExperience = null;
  let authMode = 'login';
  let currentBooking = null;
  let checkoutTimer = null;
  let checkoutDeadline = 0;
  let checkoutExpired = false;
  let toastTimer = null;

  const fallbackImages = [
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1100&q=85',
    'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1100&q=85',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1100&q=85',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1100&q=85',
    'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1100&q=85',
    'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1100&q=85'
  ];

  const sampleExperiences = [
    {id:'sample-01',title:'Himalayan Mountain Escape',location:'Manali, Himachal Pradesh',category:'Adventure',price:2499,unit:'person',image:fallbackImages[0],description:'A refreshing mountain escape with guided local experiences.'},
    {id:'sample-02',title:'A Slow Stay in the Hills',location:'Coorg, Karnataka',category:'Stay',price:3899,unit:'night',image:fallbackImages[1],description:'Unwind in a peaceful hideaway surrounded by greenery.'},
    {id:'sample-03',title:'Coastal Flavours Trail',location:'Goa, India',category:'Food',price:1499,unit:'person',image:fallbackImages[2],description:'Taste regional favourites with a local food host.'},
    {id:'sample-04',title:'Sunrise Valley Trek',location:'Araku Valley, Andhra Pradesh',category:'Adventure',price:1799,unit:'person',image:fallbackImages[3],description:'A guided early morning walk through scenic trails.'},
    {id:'sample-05',title:'Heritage City Walk',location:'Jaipur, Rajasthan',category:'Local tours',price:999,unit:'person',image:fallbackImages[4],description:'Explore old streets, architecture and stories with a local.'},
    {id:'sample-06',title:'Backwater Day Experience',location:'Alappuzha, Kerala',category:'Local tours',price:2199,unit:'person',image:fallbackImages[5],description:'Enjoy a relaxed day discovering Kerala’s waterways.'}
  ];

  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[ch]);

  const money = amount => new Intl.NumberFormat('en-IN', {
    style:'currency', currency:'INR', maximumFractionDigits:0
  }).format(Number(amount) || 0);

  const token = () => localStorage.getItem(tokenKey);
  const authHeaders = () => ({
    'Content-Type':'application/json',
    Authorization:`Bearer ${token()}`
  });

  async function api(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...(options.headers || {}) }
    });
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(data.error || data.message || `Request failed (${response.status})`);
    return data;
  }

  function showDialog(id) {
    const dialog = $(id);
    if (dialog && !dialog.open) dialog.showModal();
  }

  function closeDialog(id) {
    const dialog = $(id);
    if (dialog?.open) dialog.close();
  }

  function message(id, text, error = false) {
    const node = $(id);
    if (!node) return;
    node.textContent = text || '';
    node.style.color = error ? '#a34135' : '';
  }

  function toast(text) {
    const node = $('toast');
    if (!node) return;
    node.textContent = text;
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('show'), 2800);
  }

  function imageFor(item, index) {
    return item.image || fallbackImages[index % fallbackImages.length];
  }

  function renderExperiences() {
    const grid = $('experienceGrid');
    if (!grid) return;

    const query = ($('destinationInput')?.value || '').trim().toLowerCase();
    const category = $('categoryInput')?.value || '';
    const filtered = experiences.filter(item => {
      const itemCategory = String(item.category || '');
      const categoryMatch = activeFilter === 'All' ||
        itemCategory.toLowerCase() === activeFilter.toLowerCase();
      const selectMatch = !category || itemCategory.toLowerCase() === category.toLowerCase();
      const searchable = [item.title, item.location, item.destination, item.category, item.description]
        .join(' ').toLowerCase();
      return categoryMatch && selectMatch && searchable.includes(query);
    });

    if (!filtered.length) {
      grid.innerHTML = '<div class="loading-card"><p>No experiences found. Try another destination or category.</p></div>';
      return;
    }

    grid.innerHTML = filtered.map(item => {
      const originalIndex = experiences.indexOf(item);
      const title = escapeHTML(item.title || 'A memorable experience');
      const location = escapeHTML(item.location || item.destination || 'India');
      const categoryLabel = escapeHTML(item.category || 'Experience');
      const description = escapeHTML(item.description || 'Discover something memorable with Trav-World.');
      const price = money(item.price ?? item.unitPrice ?? item.pricePerPerson);
      const image = escapeHTML(imageFor(item, originalIndex));
      const id = escapeHTML(item.id);
      const unit = escapeHTML(item.unit || 'person');
      return `
        <article class="experience-card">
          <div class="experience-image-wrap">
            <img class="experience-image" src="${image}" alt="${title} in ${location}" loading="lazy"
              onerror="this.onerror=null;this.src='${fallbackImages[originalIndex % fallbackImages.length]}'">
            <span class="experience-tag">${categoryLabel}</span>
            <span class="experience-save" aria-hidden="true">✳</span>
          </div>
          <div class="experience-card-content">
            <p class="card-location">✳ &nbsp;${location}</p>
            <h3>${title}</h3>
            <p class="card-description">${description}</p>
            <div class="card-bottom">
              <div class="card-price">${price} <small>/ ${unit}</small></div>
              <button class="card-book" type="button" data-book="${id}">Explore & book ↗</button>
            </div>
          </div>
        </article>`;
    }).join('');
  }

  async function loadExperiences() {
    const note = $('apiNote');
    try {
      const result = await api('/experiences');
      experiences = Array.isArray(result) ? result : (result.experiences || result.items || []);
      if (!experiences.length) experiences = sampleExperiences;
      if (note) note.textContent = '';
    } catch (error) {
      experiences = sampleExperiences;
      if (note) note.textContent = 'Showing preview experiences because the local API is not connected. Start the backend to load your saved listings and enable bookings.';
    }
    renderExperiences();
  }

  function setAuthMode(mode) {
    authMode = mode;
    $('dialogTitle').textContent = mode === 'register' ? 'Start your story here.' : 'Good to have you back.';
    $('authSubmit').innerHTML = mode === 'register' ? 'Create account <span>→</span>' : 'Sign in <span>→</span>';
    $('authSwitch').innerHTML = mode === 'register'
      ? 'Already have an account? <button type="button">Sign in</button>'
      : 'New to Trav-World? <button type="button">Create an account</button>';
    message('authMessage', '');
    showDialog('authDialog');
  }

  function openBooking(item) {
    selectedExperience = item;
    $('bookingExperienceId').value = item.id;
    $('bookingTitle').textContent = `A little getaway: ${item.title}`;
    $('customerEmail').value = localStorage.getItem(emailKey) || '';
    $('customerName').value = '';
    $('customerPhone').value = '';
    $('bookingDate').value = '';
    $('bookingTime').value = '';
    $('guestCount').value = '1';
    $('transportMode').value = '';
    $('pickupLocation').value = '';
    $('paymentMethod').value = '';
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0,10);
    $('bookingDate').min = localDate;
    updateTotal();
    message('bookingMessage', '');
    showDialog('bookingDialog');
  }

  function updateTotal() {
    if (!selectedExperience) return 0;
    const guests = Math.max(1, Number($('guestCount')?.value || 1));
    const unit = Number(selectedExperience.price ?? selectedExperience.unitPrice ?? selectedExperience.pricePerPerson ?? 0);
    const total = unit * guests;
    $('bookingTotal').textContent = money(total);
    return total;
  }

  function showBookingsAfterAuth() {
    if (pendingExperience) {
      const item = pendingExperience;
      pendingExperience = null;
      openBooking(item);
    } else if (window.showBookingsAfterAuth) {
      window.showBookingsAfterAuth = false;
      openMyBookings();
    }
  }

  async function submitAuth(event) {
    event.preventDefault();
    const email = $('email').value.trim().toLowerCase();
    const password = $('password').value;
    const endpoint = authMode === 'register' ? '/auth/register' : '/auth/login';
    $('authSubmit').disabled = true;
    message('authMessage', 'Just a moment...');
    try {
      const result = await api(endpoint, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,password})
      });
      if (!result.token) throw new Error('The server did not return a sign-in token.');
      localStorage.setItem(tokenKey, result.token);
      localStorage.setItem(emailKey, result.user?.email || email);
      $('loginBtn').textContent = 'My account ↗';
      closeDialog('authDialog');
      toast(authMode === 'register' ? 'Your account is ready. Welcome!' : 'Welcome back!');
      showBookingsAfterAuth();
    } catch (error) {
      message('authMessage', error.message, true);
    } finally {
      $('authSubmit').disabled = false;
    }
  }

  function startCheckout(booking) {
    currentBooking = booking;
    checkoutExpired = false;
    clearInterval(checkoutTimer);
    checkoutDeadline = Date.now() + 60000;
    $('checkoutHeading').textContent = 'Your journey is almost set.';
    $('checkoutStatus').textContent = 'Confirm your simulated payment before the timer ends.';
    $('checkoutReference').textContent = booking.bookingReference || booking.id || '—';
    $('checkoutExperience').textContent = booking.experienceTitle || selectedExperience?.title || 'Your experience';
    $('checkoutMethod').textContent = booking.paymentMethod || '—';
    $('checkoutAmount').textContent = money(booking.pricing?.total || booking.total || updateTotal());
    $('timerText').textContent = '01:00';
    $('confirmCheckout').disabled = false;
    $('confirmCheckout').textContent = 'Confirm demo payment →';
    message('checkoutMessage', '');
    closeDialog('bookingDialog');
    showDialog('checkoutDialog');
    checkoutTimer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((checkoutDeadline - Date.now()) / 1000));
      $('timerText').textContent = `${String(Math.floor(remaining / 60)).padStart(2,'0')}:${String(remaining % 60).padStart(2,'0')}`;
      if (remaining <= 0) {
        checkoutExpired = true;
        clearInterval(checkoutTimer);
        $('checkoutHeading').textContent = 'Time for this checkout has passed.';
        $('checkoutStatus').textContent = 'The booking payment window has expired. You can close this and make a new booking.';
        $('confirmCheckout').disabled = true;
        message('checkoutMessage', 'Payment window expired.', true);
      }
    }, 250);
  }

  async function submitBooking(event) {
    event.preventDefault();
    if (!token()) {
      closeDialog('bookingDialog');
      pendingExperience = selectedExperience;
      setAuthMode('login');
      message('authMessage', 'Sign in first, then your selected experience will be ready to book.');
      return;
    }

    const payload = {
      experienceId: $('bookingExperienceId').value,
      customerName: $('customerName').value.trim(),
      customerPhone: $('customerPhone').value.trim(),
      date: $('bookingDate').value,
      time: $('bookingTime').value,
      guests: Number($('guestCount').value),
      transportMode: $('transportMode').value,
      pickupLocation: $('pickupLocation').value.trim(),
      paymentMethod: $('paymentMethod').value
    };

    if (!payload.paymentMethod) {
      message('bookingMessage', 'Choose a payment preference to continue.', true);
      return;
    }

    $('bookingSubmit').disabled = true;
    $('bookingSubmit').textContent = 'Creating your booking...';
    message('bookingMessage', '');
    try {
      const result = await api('/bookings', {
        method:'POST',
        headers:authHeaders(),
        body:JSON.stringify(payload)
      });
      startCheckout(result.booking || result);
    } catch (error) {
      message('bookingMessage', error.message, true);
    } finally {
      $('bookingSubmit').disabled = false;
      $('bookingSubmit').innerHTML = 'Continue to checkout <span>→</span>';
    }
  }

  async function confirmPayment() {
    if (!currentBooking?.id || checkoutExpired) return;
    $('confirmCheckout').disabled = true;
    $('confirmCheckout').textContent = 'Processing...';
    message('checkoutMessage', '');
    try {
      const result = await api(`/bookings/${encodeURIComponent(currentBooking.id)}/pay`, {
        method:'POST',
        headers:authHeaders(),
        body:JSON.stringify({confirm:true})
      });
      currentBooking = result.booking || currentBooking;
      clearInterval(checkoutTimer);
      checkoutExpired = true;
      $('checkoutHeading').textContent = 'A good thing is on its way.';
      $('checkoutStatus').textContent = 'Your demo booking has been confirmed successfully.';
      $('confirmCheckout').textContent = 'Confirmed ✓';
      toast('Booking confirmed!');
      setTimeout(() => {
        closeDialog('checkoutDialog');
        openMyBookings();
      }, 1000);
    } catch (error) {
      message('checkoutMessage', error.message, true);
      $('confirmCheckout').disabled = false;
      $('confirmCheckout').textContent = 'Try again →';
    }
  }

  function statusClass(booking) {
    const status = String(booking.status || '').toLowerCase();
    if (booking.paymentStatus === 'paid' || status === 'confirmed') return 'confirmed';
    if (booking.paymentStatus === 'expired' || status.includes('expired')) return 'expired';
    return 'pending';
  }

  async function openMyBookings() {
    if (!token()) {
      window.showBookingsAfterAuth = true;
      setAuthMode('login');
      message('authMessage', 'Sign in to see your booking history.');
      return;
    }
    showDialog('bookingsDialog');
    $('bookingsList').innerHTML = '<p class="modal-lead">Gathering your journeys...</p>';
    message('bookingsMessage', '');
    try {
      const result = await api('/bookings/my', {headers:authHeaders()});
      const bookings = Array.isArray(result) ? result : (result.bookings || []);
      if (!bookings.length) {
        $('bookingsList').innerHTML = '<div class="empty-bookings">No bookings yet. Your next story is waiting in <a href="#experiences" class="underlined-link">experiences</a>.</div>';
        return;
      }
      $('bookingsList').innerHTML = bookings.map(booking => {
        const status = statusClass(booking);
        const total = booking.pricing?.total ?? booking.total ?? 0;
        const date = booking.date ? new Date(`${booking.date}T00:00:00`).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—';
        return `<article class="booking-history-card">
          <div class="booking-history-heading"><div><div class="booking-ref">BOOKING ${escapeHTML(booking.bookingReference || booking.id)}</div><h3>${escapeHTML(booking.experienceTitle || 'Travel experience')}</h3></div><span class="booking-status ${status}">${status === 'confirmed' ? 'Confirmed' : status === 'expired' ? 'Payment expired' : 'Awaiting payment'}</span></div>
          <div class="booking-info"><span><strong>Date:</strong> ${escapeHTML(date)}</span><span><strong>Time:</strong> ${escapeHTML(booking.time || '—')}</span><span><strong>Guests:</strong> ${escapeHTML(booking.guests || '—')}</span><span><strong>Total:</strong> ${money(total)}</span></div>
        </article>`;
      }).join('');
    } catch (error) {
      $('bookingsList').innerHTML = '';
      message('bookingsMessage', error.message, true);
    }
  }

  function wireEvents() {
    $('year').textContent = new Date().getFullYear();
    if (token()) $('loginBtn').textContent = 'My account ↗';

    $('loginBtn').addEventListener('click', () => setAuthMode('login'));
    $('authForm').addEventListener('submit', submitAuth);
    $('authSwitch').addEventListener('click', () => setAuthMode(authMode === 'login' ? 'register' : 'login'));
    $('bookingForm').addEventListener('submit', submitBooking);
    $('guestCount').addEventListener('input', updateTotal);
    $('confirmCheckout').addEventListener('click', confirmPayment);
    $('myBookingsBtn').addEventListener('click', openMyBookings);

    $('filterRow').addEventListener('click', event => {
      const chip = event.target.closest('[data-filter]');
      if (!chip) return;
      activeFilter = chip.dataset.filter;
      document.querySelectorAll('.filter-chip').forEach(button => button.classList.toggle('active', button === chip));
      renderExperiences();
    });

    $('searchForm').addEventListener('submit', event => {
      event.preventDefault();
      renderExperiences();
      $('experiences').scrollIntoView({behavior:'smooth'});
    });
    $('destinationInput').addEventListener('input', renderExperiences);
    $('categoryInput').addEventListener('change', renderExperiences);

    $('experienceGrid').addEventListener('click', event => {
      const button = event.target.closest('[data-book]');
      if (!button) return;
      const item = experiences.find(experience => String(experience.id) === button.dataset.book);
      if (!item) return;
      if (!token()) {
        pendingExperience = item;
        setAuthMode('login');
        message('authMessage', 'Sign in first. We will keep this experience ready for you.');
        return;
      }
      openBooking(item);
    });

    $('menuToggle').addEventListener('click', () => $('mainNav').classList.toggle('active'));
    $('mainNav').addEventListener('click', event => {
      if (event.target.closest('a')) $('mainNav').classList.remove('active');
    });

    document.querySelectorAll('[data-close]').forEach(button => {
      button.addEventListener('click', () => closeDialog(button.dataset.close));
    });

    ['authDialog','bookingDialog','checkoutDialog','bookingsDialog'].forEach(id => {
      $(id).addEventListener('click', event => {
        if (event.target === $(id)) closeDialog(id);
      });
    });

    $('cancelCheckout').addEventListener('click', () => {
      clearInterval(checkoutTimer);
      closeDialog('checkoutDialog');
    });
    $('checkoutDialog').addEventListener('close', () => clearInterval(checkoutTimer));
  }

  document.addEventListener('DOMContentLoaded', () => {
    wireEvents();
    loadExperiences();
  });
})();
