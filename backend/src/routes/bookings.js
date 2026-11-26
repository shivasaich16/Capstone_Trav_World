
import { Router } from 'express';
import { readStore, writeStore } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const paymentMethods = ['UPI', 'CARD', 'NET_BANKING'];
const transportModes = ['CAR', 'BUS', 'TRAIN', 'SELF'];
const PAYMENT_WINDOW_MS = 60 * 1000;

// --------------------------------------------------
// VALIDATION HELPERS
// --------------------------------------------------

function validDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function validTime(time) {
  return (
    typeof time === 'string' &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  );
}

function belongsToUser(booking, user) {
  return (
    String(booking.userId) === String(user.id) ||
    (
      !booking.userId &&
      booking.customerEmail?.toLowerCase() === user.email.toLowerCase()
    )
  );
}

// --------------------------------------------------
// CREATE BOOKING
// --------------------------------------------------

router.post('/', requireAuth, (req, res) => {
  const {
    experienceId,
    date,
    time,
    guests,
    transportMode,
    pickupLocation,
    customerName,
    customerPhone,
    paymentMethod
  } = req.body || {};

  if (typeof experienceId !== 'string' || !experienceId.trim()) {
    return res.status(400).json({
      error: 'Please select an experience.'
    });
  }

  if (!validDate(date)) {
    return res.status(400).json({
      error: 'Please provide a valid date.'
    });
  }

  if (!validTime(time)) {
    return res.status(400).json({
      error: 'Please provide a valid time.'
    });
  }

  if (!Number.isInteger(guests) || guests < 1 || guests > 30) {
    return res.status(400).json({
      error: 'Guest count must be between 1 and 30.'
    });
  }

  if (!transportModes.includes(transportMode)) {
    return res.status(400).json({
      error: 'Please select a valid transport mode.'
    });
  }

  if (typeof pickupLocation !== 'string' || !pickupLocation.trim()) {
    return res.status(400).json({
      error: 'Please provide a pickup location.'
    });
  }

  if (typeof customerName !== 'string' || !customerName.trim()) {
    return res.status(400).json({
      error: 'Please provide your name.'
    });
  }

  // Correct phone number validation
  if (
    typeof customerPhone !== 'string' ||
    !/^\+?[0-9\s-]{7,15}$/.test(customerPhone.trim())
  ) {
    return res.status(400).json({
      error: 'Please provide a valid phone number.'
    });
  }

  if (!paymentMethods.includes(paymentMethod)) {
    return res.status(400).json({
      error: 'Please select a valid payment method.'
    });
  }

  const store = readStore();

  const experience = store.experiences.find(
    item => item.id === experienceId && item.isActive !== false
  );

  if (!experience) {
    return res.status(404).json({
      error: 'Experience not found.'
    });
  }

  const unitPrice = Number(experience.price);

  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    return res.status(400).json({
      error: 'Invalid experience price.'
    });
  }

  const now = Date.now();
  const subtotal = unitPrice * guests;

  const booking = {
    id: now,
    bookingReference: `TW-${now}`,

    userId: req.user.id,
    experienceId,
    experienceTitle: experience.title,

    customerName: customerName.trim(),
    customerEmail: req.user.email,
    customerPhone: customerPhone.trim(),

    date,
    time,
    guests,

    transportMode,
    pickupLocation: pickupLocation.trim(),
    paymentMethod,

    pricing: {
      unitPrice,
      guests,
      subtotal,
      transportCharge: 0,
      tax: 0,
      total: subtotal,
      currency: 'INR'
    },

    status: 'pending_payment',
    paymentStatus: 'unpaid',

    createdAt: new Date(now).toISOString(),

    // Server-controlled 60-second payment deadline
    paymentExpiresAt: new Date(
      now + PAYMENT_WINDOW_MS
    ).toISOString()
  };

  store.bookings.push(booking);
  writeStore(store);

  return res.status(201).json({
    message: 'Booking created. Complete payment within 60 seconds.',
    booking
  });
});

// --------------------------------------------------
// SIMULATE PAYMENT
// --------------------------------------------------

router.post('/:id/pay', requireAuth, (req, res) => {
  const store = readStore();

  const booking = store.bookings.find(
    item => String(item.id) === String(req.params.id)
  );

  if (!booking || !belongsToUser(booking, req.user)) {
    return res.status(404).json({
      error: 'Booking not found.'
    });
  }

  // Prevent duplicate payments
  if (booking.paymentStatus === 'paid') {
    return res.json({
      message: 'Payment has already been completed.',
      booking
    });
  }

  if (booking.status !== 'pending_payment') {
    return res.status(400).json({
      error: 'This booking is not awaiting payment.'
    });
  }

  // Check payment deadline
  const expiresAt = booking.paymentExpiresAt
    ? new Date(booking.paymentExpiresAt).getTime()
    : 0;

  if (!expiresAt || Date.now() >= expiresAt) {
    booking.status = 'payment_expired';
    booking.paymentStatus = 'expired';

    writeStore(store);

    return res.status(410).json({
      error: 'The 60-second payment window has expired.',
      booking
    });
  }

  if (req.body?.confirm !== true) {
    return res.status(400).json({
      error: 'Please confirm the demo payment.'
    });
  }

  if (!paymentMethods.includes(booking.paymentMethod)) {
    return res.status(400).json({
      error: 'Invalid payment method on booking.'
    });
  }

  const paymentReference = `TWPAY-${Date.now()}`;

  const payment = {
    id: Date.now(),
    paymentReference,
    bookingId: booking.id,
    bookingReference: booking.bookingReference,
    userId: booking.userId,
    method: booking.paymentMethod,
    amount: booking.pricing.total,
    currency: 'INR',
    status: 'success',
    simulated: true,
    createdAt: new Date().toISOString()
  };

  // Update booking
  booking.paymentStatus = 'paid';
  booking.status = 'confirmed';
  booking.paidAt = payment.createdAt;
  booking.paymentReference = paymentReference;

  store.payments.push(payment);
  writeStore(store);

  return res.json({
    message: 'Demo payment successful. Booking confirmed!',
    booking,
    payment
  });
});

// --------------------------------------------------
// MY BOOKINGS
// --------------------------------------------------

router.get('/my', requireAuth, (req, res) => {
  const store = readStore();
  const now = Date.now();

  let storeChanged = false;

  // Automatically expire unpaid bookings
  for (const booking of store.bookings) {
    if (
      belongsToUser(booking, req.user) &&
      booking.status === 'pending_payment' &&
      booking.paymentStatus !== 'paid'
    ) {
      const expiresAt = booking.paymentExpiresAt
        ? new Date(booking.paymentExpiresAt).getTime()
        : 0;

      if (!expiresAt || now >= expiresAt) {
        booking.status = 'payment_expired';
        booking.paymentStatus = 'expired';
        storeChanged = true;
      }
    }
  }

  if (storeChanged) {
    writeStore(store);
  }

  const bookings = store.bookings
    .filter(booking => belongsToUser(booking, req.user))
    .sort(
      (a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );

  return res.json({ bookings });
});

// --------------------------------------------------
// SINGLE BOOKING DETAILS / RECEIPT
// --------------------------------------------------

router.get('/:id', requireAuth, (req, res) => {
  const store = readStore();

  const booking = store.bookings.find(
    item => String(item.id) === String(req.params.id)
  );

  if (!booking || !belongsToUser(booking, req.user)) {
    return res.status(404).json({
      error: 'Booking not found.'
    });
  }

  const payment = store.payments.find(
    item => String(item.bookingId) === String(booking.id)
  );

  return res.json({
    booking,
    payment: payment || null
  });
});

// --------------------------------------------------
// DEVELOPMENT INSPECTION ONLY
// --------------------------------------------------

router.get('/', (_req, res) => {
  return res.json(readStore().bookings);
});

export default router;
