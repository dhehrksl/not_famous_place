import express, { Request, Response } from 'express';
import cors from 'cors';
import knex from 'knex';
import cron from 'node-cron';

const app = express();
app.use(cors());
app.use(express.json());

// Database setup
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: "./underground.sqlite"
  },
  useNullAsDefault: true
});

// Initialize database
async function initDb() {
  const hasTable = await db.schema.hasTable('places');
  if (!hasTable) {
    await db.schema.createTable('places', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.float('lat').notNullable();
      table.float('lng').notNullable();
      table.string('image_url');
      table.integer('review_count').defaultTo(0);
      table.string('status').defaultTo('ACTIVE');
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('Table "places" created.');
  }
}
initDb();

// Haversine formula for distance calculation
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// API Routes
app.get('/api/places', async (req: Request, res: Response) => {
  const { lat, lng, radius = '5' } = req.query; // radius in km
  
  try {
    let query = db('places').where('status', 'ACTIVE');
    
    // Simple Bounding Box filtering (optimization)
    if (lat && lng) {
      const latFloat = parseFloat(lat as string);
      const lngFloat = parseFloat(lng as string);
      const radiusFloat = parseFloat(radius as string);
      
      // Roughly 0.01 deg ~= 1.1km
      const offset = radiusFloat / 111; 
      query = query.whereBetween('lat', [latFloat - offset, latFloat + offset])
                   .whereBetween('lng', [lngFloat - offset, lngFloat + offset]);
      
      const places = await query;
      
      // Accurate Haversine filtering
      const filteredPlaces = places.filter(place => {
        return getDistance(latFloat, lngFloat, place.lat, place.lng) <= radiusFloat;
      });
      
      return res.json(filteredPlaces);
    }

    const allPlaces = await query;
    res.json(allPlaces);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/places', async (req: Request, res: Response) => {
  const { name, lat, lng } = req.body;
  
  if (!name || !lat || !lng) {
    return res.status(400).json({ error: 'Name, lat, and lng are required.' });
  }

  try {
    // Simulation: Reject if too many reviews (external API mock)
    const mockExternalReviewCount = Math.floor(Math.random() * 200);
    if (mockExternalReviewCount > 100) {
      return res.status(400).json({ error: 'This place is already too popular to be "Underground".' });
    }

    const [id] = await db('places').insert({
      name,
      lat,
      lng,
      review_count: mockExternalReviewCount,
      status: 'ACTIVE'
    });

    res.status(201).json({ id, name, lat, lng, review_count: mockExternalReviewCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/places/:id', async (req: Request, res: Response) => {
  try {
    const place = await db('places').where('id', req.params.id).first();
    if (!place) return res.status(404).json({ error: 'Place not found' });
    res.json(place);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Explosion Engine (Cron Job)
// Runs every minute for testing purposes
cron.schedule('* * * * *', async () => {
  console.log('Running Explosion Engine...');
  try {
    const activePlaces = await db('places').where('status', 'ACTIVE');
    
    for (const place of activePlaces) {
      // Randomly increase review count
      const newReviewCount = place.review_count + Math.floor(Math.random() * 20);
      
      if (newReviewCount >= 500) {
        await db('places').where('id', place.id).update({
          status: 'EXPLODED',
          review_count: newReviewCount
        });
        console.log(`Place "${place.name}" (ID: ${place.id}) has EXPLODED!`);
      } else {
        await db('places').where('id', place.id).update({
          review_count: newReviewCount
        });
      }
    }
  } catch (error) {
    console.error('Explosion Engine Error:', error);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
