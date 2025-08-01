const Cors = require('cors');
const { Pool } = require('pg');
const Pusher = require('pusher');

// Initialize the cors middleware
const cors = Cors({
  methods: ['GET', 'OPTIONS'],
  origin: ['https://verdant-pie-c5ecce.netlify.app'],
});

// Helper function to run middleware
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

module.exports = async (req, res) => {
  // Run cors
  await runMiddleware(req, res, cors);

  if (req.method === 'GET') {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId query parameter' });
    }
    try {
      const selectQuery = `
        SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC;
      `;
      const result = await pool.query(selectQuery, [userId]);
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};
