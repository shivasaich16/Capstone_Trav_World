
const API_BASE = 'http://localhost:4000/api';

const $ = (id) => document.getElementById(id);

let experiences = [];
let currentFilter = 'All';
let currentBooking = null;
let authMode = 'login';

let checkoutInterval = null;
let checkoutExpiresAt = null;
let checkoutExpired = false;

let selectedExperience = null;

const CHECKOUT_DURATION = 60;
const TIMER_RADIUS = 95;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;

// --------------------------------------------------
// GENERAL HELPERS
// --------------------------------------------------

function getToken() {
  return localStorage.getItem('travworld_token');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`
  };
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.error || data.message || 'Something went wrong.'
    );
  }

  return data;
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);
}

function formatDate(date) {
  if (!date) return 'Date not available';

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function setMessage(id, message, isError = false) {
  const element = $(id);
  if (!element) return;

  element.textContent = message;
  element.style.color = isError ? '#b42318' : '';
}

function openDialog(id) {
  const dialog = $(id);
  if (dialog && !dialog.open) dialog.showModal();
}

function closeDialog(id) {
  const dialog = $(id);
  if (dialog?.open) dialog.close();
}

// --------------------------------------------------
// EXPERIENCES
// --------------------------------------------------

const fallbackExperiences = [
  {
    id: 'exp-001',
    title: 'Mountain Adventure',
    destination: 'Himachal Pradesh',
    category: 'Adventure',
    price: 2499,
    description: 'Discover mountain trails and unforgettable views.'
  },
  {
    id: 'exp-002',
    title: 'Luxury Nature Stay',
    destination: 'Kerala',
    category: 'Stay',
    price: 3999,
    description: 'Relax in a peaceful natural setting.'
  },
  {
    id: 'exp-003',
    title: 'Local Food Experience',
    destination: 'Hyderabad',
    category: 'Food',
    price: 999,
    description: 'Explore local flavours and traditional food.'
  },
  {
    id: 'exp-004',
    title: 'Coastal Escape',
    destination: 'Goa',
    category: 'Adventure',
    price: 2999,
    description: 'Enjoy the coast and beautiful beaches.'
  },
  {
    id: 'exp-005',
    title: 'Heritage City Tour',
    destination: 'Jaipur',
    category: 'Local tours',
    price: 1499,
    description: 'Explore historic streets and local culture.'
  },
  {
    id: 'exp-006',
    title: 'Scenic Transport',
    destination: 'Uttarakhand',
    category: 'Transport',
    price: 1299,
    description: 'Travel through beautiful mountain routes.'
  }
];

async function loadExperiences() {
  try {
    const data = await apiRequest('/experiences');

    experiences = Array.isArray(data)
      ? data
      : data.experiences || data.items || fallbackExperiences;

  } catch (error) {
    console.warn('Using sample experiences:', error.message);
    experiences = fallbackExperiences;
  }

  renderExperiences();
}

function renderExperiences() {
  const grid = $('experienceGrid');
  if (!grid) return;

  const destinationQuery = (
    $('destinationInput')?.value || ''
  ).trim().toLowerCase();

  const filtered = experiences.filter(experience => {
    const category = experience.category || '';

    const matchesCategory =
      currentFilter === 'All' ||
      category.toLowerCase() === currentFilter.toLowerCase();

    const searchableText = [
      experience.title,
      experience.destination,
      experience.location,
      experience.category,
      experience.description
    ].join(' ').toLowerCase();

    return matchesCategory &&
      searchableText.includes(destinationQuery);
  });

  if (!filtered.length) {
    grid.innerHTML =
      '<p>No experiences found. Try another search.</p>';
    return;
  }

  grid.innerHTML = filtered.map(experience => {
    const id = escapeHTML(experience.id);
    const title = escapeHTML(
      experience.title || 'Travel experience'
    );

    const destination = escapeHTML(
      experience.destination ||
      experience.location ||
      'India'
    );

    const category = escapeHTML(
      experience.category || 'Experience'
    );

    const description = escapeHTML(
      experience.description ||
      'Discover this experience with Trav-World.'
    );

    const price = formatCurrency(
      experience.price ??
      experience.unitPrice ??
      experience.pricePerPerson
    );

    return `
      <article class="experience-card">
        <div class="experience-card-content">
          <p class="eyebrow dark">${category}</p>
          <h3>${title}</h3>
          <p>${destination}</p>
          <p>${description}</p>
          <strong>${price} <span>/ person</span></strong>

          <button
            type="button"
            class="btn btn-primary book-experience-btn"
            data-experience-id="${id}">
            Book experience
          </button>
        </div>
      </article>
    `;
  }).join('');
}

$('filterRow')?.addEventListener('click', event => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;

  currentFilter = button.dataset.filter;

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.classList.toggle('active', chip === button);
  });

  renderExperiences();
});

$('searchForm')?.addEventListener('submit', event => {
  event.preventDefault();
  renderExperiences();
});

$('destinationInput')?.addEventListener(
  'input',
  renderExperiences
);

// --------------------------------------------------
// AUTHENTICATION
// --------------------------------------------------

function showAuth(mode = 'login') {
  authMode = mode;

  $('dialogTitle').textContent =
    mode === 'register' ? 'Create an account' : 'Log in';

  $('authSubmit').textContent =
    mode === 'register' ? 'Create account' : 'Continue';

  $('authSwitch').innerHTML = mode === 'register'
    ? 'Already registered? <button type="button">Log in</button>'
    : 'New here? <button type="button">Create an account</button>';

  setMessage('authMessage', '');
  openDialog('authDialog');
}

$('loginBtn')?.addEventListener('click', () => showAuth('login'));

$('authSwitch')?.addEventListener('click', () => {
  showAuth(authMode === 'login' ? 'register' : 'login');
});

$('authForm')?.addEventListener('submit', async event => {
  event.preventDefault();

  const email = $('email').value.trim().toLowerCase();
  const password = $('password').value;

  const endpoint = authMode === 'register'
    ? '/auth/register'
    : '/auth/login';

  try {
    $('authSubmit').disabled = true;
    setMessage('authMessage', 'Please wait...');

    const data = await apiRequest(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!data.token) {
      throw new Error('The server did not return a login token.');
    }

    localStorage.setItem('travworld_token', data.token);

    localStorage.setItem(
      'travworld_email',
      data.user?.email || email
    );

    closeDialog('authDialog');
    $('loginBtn').textContent = 'My Account';

    if (window.openBookingsAfterLogin) {
      window.openBookingsAfterLogin = false;
      openMyBookings();
    }

  } catch (error) {
    setMessage('authMessage', error.message, true);

  } finally {
    $('authSubmit').disabled = false;
  }
});

// --------------------------------------------------
// OPEN BOOKING FORM
// --------------------------------------------------

$('experienceGrid')?.addEventListener('click', event => {
  const button = event.target.closest('.book-experience-btn');
  if (!button) return;

  const experience = experiences.find(
    item => String(item.id) === button.dataset.experienceId
  );

  if (!experience) return;

  selectedExperience = experience;

  $('bookingExperienceId').value = experience.id;
  $('bookingTitle').textContent = `Book ${experience.title}`;

  $('customerEmail').value =
    localStorage.getItem('travworld_email') || '';

  const today = new Date();

  const localToday = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
  ).toISOString().split('T')[0];

  $('bookingDate').min = localToday;
  $('bookingDate').value = '';

  if ($('guestCount')) {
    $('guestCount').value = 1;
  }

  setMessage('bookingMessage', '');

  updateTotal();
  resetPaymentOptions();

  openDialog('bookingDialog');
});

// --------------------------------------------------
// PAYMENT METHOD AND TOTAL
// --------------------------------------------------

const paymentRadios = document.querySelectorAll(
  'input[name="paymentMethod"]'
);

const cardDetails = $('cardDetails');
const upiDetails = $('upiDetails');

function updateTotal() {
  const guests = Math.max(
    1,
    Number($('guestCount')?.value || 1)
  );

  selectedExperience = experiences.find(
    item => String(item.id) === String($('bookingExperienceId')?.value)
  );

  const unitPrice = Number(
    selectedExperience?.price ??
    selectedExperience?.unitPrice ??
    selectedExperience?.pricePerPerson ??
    0
  );

  const total = unitPrice * guests;

  if ($('bookingTotal')) {
    $('bookingTotal').textContent = formatCurrency(total);
  }

  if ($('checkoutAmount')) {
    $('checkoutAmount').textContent = formatCurrency(total);
  }

  return total;
}

function resetPaymentOptions() {
  paymentRadios.forEach(radio => {
    radio.checked = false;
  });

  if (cardDetails) cardDetails.hidden = true;
  if (upiDetails) upiDetails.hidden = true;

  ['cardName', 'cardNumber', 'cardExpiry', 'upiId'].forEach(id => {
    if ($(id)) $(id).required = false;
  });
}

paymentRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    const method = document.querySelector(
      'input[name="paymentMethod"]:checked'
    )?.value?.toLowerCase();

    if (cardDetails) cardDetails.hidden = method !== 'card';
    if (upiDetails) upiDetails.hidden = method !== 'upi';

    if ($('cardName')) $('cardName').required = method === 'card';
    if ($('cardNumber')) $('cardNumber').required = method === 'card';
    if ($('cardExpiry')) $('cardExpiry').required = method === 'card';
    if ($('upiId')) $('upiId').required = method === 'upi';
  });
});

$('guestCount')?.addEventListener('input', updateTotal);

// --------------------------------------------------
// BOOKING SUBMISSION
// --------------------------------------------------

$('bookingForm')?.addEventListener('submit', async event => {
  event.preventDefault();

  if (!getToken()) {
    closeDialog('bookingDialog');
    window.openBookingsAfterLogin = false;
    showAuth('login');
    setMessage('authMessage', 'Please log in before booking.');
    return;
  }

  const method = document.querySelector(
    'input[name="paymentMethod"]:checked'
  )?.value;

  if (!method) {
    setMessage('bookingMessage', 'Please select a payment method.', true);
    return;
  }

  if (method.toLowerCase() === 'upi') {
    const upi = $('upiId')?.value.trim() || '';

    if (!/^[\w.-]+@[\w.-]+$/.test(upi)) {
      setMessage('bookingMessage', 'Please enter a valid UPI ID.', true);
      return;
    }
  }

  const total = updateTotal();

  if (!selectedExperience || total <= 0) {
    setMessage('bookingMessage', 'Please select a valid experience.', true);
    return;
  }

  const payload = {
    experienceId: $('bookingExperienceId').value,
    customerName: $('customerName').value.trim(),
    customerEmail: $('customerEmail').value.trim(),
    customerPhone: $('customerPhone')?.value.trim() || '',
    date: $('bookingDate').value,
    time: $('bookingTime')?.value || '',
    guests: Number($('guestCount').value),
    transportMode: $('transportMode')?.value || '',
    pickupLocation: $('pickupLocation')?.value.trim() || '',
    paymentMethod: method.toUpperCase()
  };

  const submitButton = $('bookingForm').querySelector(
    'button[type="submit"]'
  );

  try {
    if (submitButton) submitButton.disabled = true;

    setMessage('bookingMessage', 'Creating your booking...');

    const data = await apiRequest('/bookings', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    currentBooking = data.booking || data;

    if (!currentBooking?.id) {
      throw new Error('The server did not return a booking ID.');
    }

    closeDialog('bookingDialog');
    startCheckout();

  } catch (error) {
    setMessage('bookingMessage', error.message, true);

  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

// --------------------------------------------------
// CHECKOUT DIALOG AND STOPWATCH
// --------------------------------------------------

function setCheckoutStatus(heading, status) {
  if ($('checkoutHeading')) {
    $('checkoutHeading').textContent = heading;
  }

  if ($('checkoutStatus')) {
    $('checkoutStatus').textContent = status;
  }
}

function updateStopwatch(seconds) {
  const timerText = $('timerText');
  const timerProgress = $('timerProgress');

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (timerText) {
    timerText.textContent =
      `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  if (timerProgress) {
    const progress =
      TIMER_CIRCUMFERENCE *
      (1 - seconds / CHECKOUT_DURATION);

    timerProgress.style.strokeDasharray =
      TIMER_CIRCUMFERENCE;

    timerProgress.style.strokeDashoffset =
      progress;
  }

  if (timerProgress) {
    timerProgress.classList.toggle(
      'timer-warning',
      seconds <= 15
    );
  }
}

function startCheckout() {
  clearInterval(checkoutInterval);
  checkoutExpired = false;

  checkoutExpiresAt = Date.now() + CHECKOUT_DURATION * 1000;

  updateStopwatch(CHECKOUT_DURATION);

  setCheckoutStatus(
    'Securing your booking',
    'Securing your reservation...'
  );

  if ($('checkoutAmount')) {
    $('checkoutAmount').textContent =
      $('bookingTotal')?.textContent || formatCurrency(0);
  }

  if ($('cancelCheckout')) {
    $('cancelCheckout').textContent = 'Cancel checkout';
    $('cancelCheckout').disabled = false;
  }

  if ($('confirmCheckout')) {
    $('confirmCheckout').disabled = false;
  }

  openDialog('checkoutDialog');

  checkoutInterval = setInterval(() => {
    const remaining = Math.max(
      0,
      Math.ceil((checkoutExpiresAt - Date.now()) / 1000)
    );

    updateStopwatch(remaining);

    if (remaining > 45) {
      setCheckoutStatus(
        'Securing your booking',
        'Securing your reservation...'
      );
    } else if (remaining > 30) {
      setCheckoutStatus(
        'Verifying details',
        'Verifying your booking details...'
      );
    } else if (remaining > 15) {
      setCheckoutStatus(
        'Preparing confirmation',
        'Preparing your confirmation...'
      );
    } else if (remaining > 0) {
      setCheckoutStatus(
        'Almost there',
        'Almost there...'
      );
    }

    if (remaining <= 0) {
      expireCheckout();
    }
  }, 200);
}

function expireCheckout() {
  if (checkoutExpired) return;

  checkoutExpired = true;

  clearInterval(checkoutInterval);
  checkoutInterval = null;

  updateStopwatch(0);

  setCheckoutStatus(
    'Checkout expired',
    'Your checkout session has expired. Please try again.'
  );

  if ($('cancelCheckout')) {
    $('cancelCheckout').textContent = 'Close';
  }

  if ($('confirmCheckout')) {
    $('confirmCheckout').disabled = true;
  }

  setMessage(
    'checkoutMessage',
    'Your checkout session has expired.',
    true
  );
}

// --------------------------------------------------
// CANCEL CHECKOUT
// --------------------------------------------------

$('cancelCheckout')?.addEventListener('click', () => {
  clearInterval(checkoutInterval);
  checkoutInterval = null;

  closeDialog('checkoutDialog');

  if ($('cancelCheckout')) {
    $('cancelCheckout').textContent = 'Cancel checkout';
  }
});

$('checkoutDialog')?.addEventListener('close', () => {
  clearInterval(checkoutInterval);
  checkoutInterval = null;
});

// --------------------------------------------------
// DEMO PAYMENT CONFIRMATION
// --------------------------------------------------

$('confirmCheckout')?.addEventListener('click', async () => {
  if (!currentBooking?.id || checkoutExpired) return;

  if (Date.now() >= checkoutExpiresAt) {
    expireCheckout();
    return;
  }

  try {
    $('confirmCheckout').disabled = true;
    $('confirmCheckout').textContent = 'Processing...';

    setCheckoutStatus(
      'Processing payment',
      'Processing your demo payment...'
    );

    const data = await apiRequest(
      `/bookings/${encodeURIComponent(currentBooking.id)}/pay`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ confirm: true })
      }
    );

    currentBooking = data.booking || currentBooking;

    clearInterval(checkoutInterval);
    checkoutInterval = null;
    checkoutExpired = true;

    setCheckoutStatus(
      'Booking confirmed!',
      'Your booking has been confirmed successfully.'
    );

    $('confirmCheckout').textContent = 'Confirmed ✓';

    setTimeout(() => {
      closeDialog('checkoutDialog');
      openMyBookings();
    }, 1500);

  } catch (error) {
    setMessage('checkoutMessage', error.message, true);

    if (Date.now() >= checkoutExpiresAt) {
      expireCheckout();
    } else {
      $('confirmCheckout').disabled = false;
      $('confirmCheckout').textContent = 'Try Again';
    }
  }
});

// --------------------------------------------------
// MY BOOKINGS
// --------------------------------------------------

async function openMyBookings() {
  if (!getToken()) {
    window.openBookingsAfterLogin = true;
    showAuth('login');
    setMessage('authMessage', 'Please log in to view your bookings.');
    return;
  }

  openDialog('bookingsDialog');

  $('bookingsList').innerHTML = '<p>Loading your bookings...</p>';

  setMessage('bookingsMessage', '');

  try {
    const data = await apiRequest('/bookings/my', {
      headers: authHeaders()
    });

    const bookings = Array.isArray(data)
      ? data
      : data.bookings || [];

    renderMyBookings(bookings);

  } catch (error) {
    $('bookingsList').innerHTML = '';
    setMessage('bookingsMessage', error.message, true);
  }
}

function getDisplayStatus(booking) {
  const paymentStatus =
    String(booking.paymentStatus || '').toLowerCase();

  const status =
    String(booking.status || '').toLowerCase();

  if (paymentStatus === 'paid' || status === 'confirmed') {
    return 'Confirmed';
  }

  if (
    paymentStatus === 'expired' ||
    status === 'payment_expired'
  ) {
    return 'Payment expired';
  }

  if (status === 'pending_payment') {
    return 'Awaiting payment';
  }

  return status
    ? status.replaceAll('_', ' ')
    : 'Pending';
}

function renderMyBookings(bookings) {
  const container = $('bookingsList');

  if (!container) return;

  if (!bookings.length) {
    container.innerHTML = `
      <div class="empty-bookings">
        <h3>No bookings yet</h3>
        <p>Your next adventure is waiting to be discovered.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = bookings.map(booking => {
    const status = getDisplayStatus(booking);

    const total =
      booking.pricing?.total ??
      booking.total ??
      booking.amount ??
      0;

    const reference = escapeHTML(
      booking.bookingReference || booking.id || '—'
    );

    const title = escapeHTML(
      booking.experienceTitle || 'Travel experience'
    );

    const date = escapeHTML(formatDate(booking.date));
    const time = escapeHTML(booking.time || 'Not specified');
    const guests = escapeHTML(booking.guests ?? '—');
    const method = escapeHTML(booking.paymentMethod || '—');

    const statusClass = status.toLowerCase().includes('confirmed')
      ? 'booking-status-confirmed'
      : status.toLowerCase().includes('expired')
        ? 'booking-status-expired'
        : 'booking-status-pending';

    return `
      <article class="booking-history-card">

        <div class="booking-history-heading">
          <div>
            <p class="eyebrow dark">BOOKING ${reference}</p>
            <h3>${title}</h3>
          </div>

          <span class="${statusClass}">
            ${escapeHTML(status)}
          </span>
        </div>

        <div class="booking-history-info">
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
          <p><strong>Guests:</strong> ${guests}</p>
          <p><strong>Total:</strong> ${formatCurrency(total)}</p>
        </div>

        <details class="booking-receipt">
          <summary>View booking details / receipt</summary>

          <p><strong>Booking reference:</strong> ${reference}</p>
          <p><strong>Experience:</strong> ${title}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
          <p><strong>Guests:</strong> ${guests}</p>
          <p><strong>Payment method:</strong> ${method}</p>

          <p>
            <strong>Payment status:</strong>
            ${escapeHTML(booking.paymentStatus || 'Not recorded')}
          </p>

          <p>
            <strong>Booking status:</strong>
            ${escapeHTML(booking.status || 'Pending')}
          </p>

          <p><strong>Total amount:</strong> ${formatCurrency(total)}</p>

          ${booking.paymentReference
            ? `<p><strong>Payment reference:</strong> ${escapeHTML(booking.paymentReference)}</p>`
            : ''}

          ${booking.paidAt
            ? `<p><strong>Paid at:</strong> ${escapeHTML(new Date(booking.paidAt).toLocaleString('en-IN'))}</p>`
            : ''}

        </details>
      </article>
    `;
  }).join('');
}

$('myBookingsBtn')?.addEventListener('click', openMyBookings);

// --------------------------------------------------
// NAVIGATION
// --------------------------------------------------

$('menuToggle')?.addEventListener('click', () => {
  $('mainNav')?.classList.toggle('active');
});

$('mainNav')?.addEventListener('click', event => {
  if (event.target.closest('a')) {
    $('mainNav')?.classList.remove('active');
  }
});

$('listBtn')?.addEventListener('click', () => {
  alert('Partner registration will be added in a future step.');
});

$('ctaListBtn')?.addEventListener('click', () => {
  alert('Partner registration will be added in a future step.');
});

// --------------------------------------------------
// INITIALIZATION
// --------------------------------------------------

if ($('year')) {
  $('year').textContent = new Date().getFullYear();
}

if (getToken() && $('loginBtn')) {
  $('loginBtn').textContent = 'My Account';
}

loadExperiences();
