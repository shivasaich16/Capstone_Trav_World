
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { readStore, writeStore } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function auth(mode) {
  return (req, res) => {
    const { email, password } = req.body || {};

    // Validate input
    const normalizedEmail =
      typeof email === 'string'
        ? email.trim().toLowerCase()
        : '';

    if (
      !/^\S+@\S+\.\S+$/.test(normalizedEmail) ||
      typeof password !== 'string' ||
      password.length < 6 ||
      password.length > 128
    ) {
      return res.status(400).json({
        error: 'Enter a valid email and password of 6–128 characters.'
      });
    }

    // Verify JWT configuration before modifying data
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        error: 'JWT_SECRET is not configured.'
      });
    }

    const store = readStore();

    let user = store.users.find(
      item => item.email === normalizedEmail
    );

    // Registration
    if (mode === 'register') {
      if (user) {
        return res.status(409).json({
          error: 'An account with this email already exists.'
        });
      }

      user = {
        id: Date.now(),
        email: normalizedEmail,
        passwordHash: bcrypt.hashSync(password, 12),
        createdAt: new Date().toISOString()
      };

      store.users.push(user);
      writeStore(store);

    } else {
      // Login
      if (
        !user ||
        !bcrypt.compareSync(password, user.passwordHash)
      ) {
        return res.status(401).json({
          error: 'Incorrect email or password.'
        });
      }
    }

    // Generate JWT
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(mode === 'register' ? 201 : 200).json({
      message: mode === 'register'
        ? 'Account created successfully.'
        : 'Login successful.',
      user: {
        id: user.id,
        email: user.email
      },
      token
    });
  };
}

// Register
router.post('/register', auth('register'));

// Login
router.post('/login', auth('login'));

// Logged-in customer profile
router.get('/me', requireAuth, (req, res) => {
  const store = readStore();

  const user = store.users.find(
    item => String(item.id) === String(req.user.id)
  );

  if (!user) {
    return res.status(404).json({
      error: 'Customer account not found.'
    });
  }

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt
    }
  });
});

export default router;
