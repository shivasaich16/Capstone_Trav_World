
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const dataDir = process.env.DATA_DIR || path.resolve(currentDir, '..', 'data');
const dataFile = path.join(dataDir, 'service-booker.json');

const seedExperiences = [
  {
    id: 'exp-001',
    title: 'Himalayan Mountain Escape',
    location: 'Manali, Himachal Pradesh',
    category: 'Adventure',
    price: 2499,
    unit: 'person',
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1000&q=80',
    description: 'A refreshing mountain escape with guided local experiences.'
  },
  {
    id: 'exp-002',
    title: 'A Slow Stay in the Hills',
    location: 'Coorg, Karnataka',
    category: 'Stay',
    price: 3899,
    unit: 'night',
    image: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1000&q=80',
    description: 'Unwind in a peaceful hideaway surrounded by greenery.'
  },
  {
    id: 'exp-003',
    title: 'Coastal Flavours Trail',
    location: 'Goa, India',
    category: 'Food',
    price: 1499,
    unit: 'person',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80',
    description: 'Taste regional favourites with a local food host.'
  },
  {
    id: 'exp-004',
    title: 'Sunrise Valley Trek',
    location: 'Araku Valley, Andhra Pradesh',
    category: 'Adventure',
    price: 1799,
    unit: 'person',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80',
    description: 'A guided early morning walk through scenic trails.'
  },
  {
    id: 'exp-005',
    title: 'Heritage City Walk',
    location: 'Jaipur, Rajasthan',
    category: 'Local tours',
    price: 999,
    unit: 'person',
    image: 'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=1000&q=80',
    description: 'Explore old streets, architecture and stories with a local.'
  },
  {
    id: 'exp-006',
    title: 'Backwater Day Experience',
    location: 'Alappuzha, Kerala',
    category: 'Local tours',
    price: 2199,
    unit: 'person',
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1000&q=80',
    description: 'Enjoy a relaxed day discovering Kerala’s waterways.'
  }
];

function createEmptyStore() {
  return {
    schemaVersion: 2,
    users: [],
    experiences: seedExperiences,
    bookings: [],
    payments: []
  };
}

export function readStore() {
  fs.mkdirSync(dataDir, { recursive: true });

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(
      dataFile,
      JSON.stringify(createEmptyStore(), null, 2)
    );
  }

  const store = JSON.parse(
    fs.readFileSync(dataFile, 'utf8')
  );

  if (!Array.isArray(store.users)) {
    store.users = [];
  }

  if (!Array.isArray(store.experiences) || store.experiences.length === 0) {
    store.experiences = seedExperiences;
  }

  if (!Array.isArray(store.bookings)) {
    store.bookings = [];
  }

  if (!Array.isArray(store.payments)) {
    store.payments = [];
  }

  if (!store.schemaVersion || store.schemaVersion < 2) {
    store.schemaVersion = 2;
  }

  return store;
}

export function writeStore(store) {
  fs.mkdirSync(dataDir, { recursive: true });

  const tempFile = `${dataFile}.tmp`;

  fs.writeFileSync(
    tempFile,
    JSON.stringify(store, null, 2)
  );

  fs.renameSync(tempFile, dataFile);
}

export function initializeStore() {
  const store = readStore();

  writeStore(store);

  return dataFile;
}
