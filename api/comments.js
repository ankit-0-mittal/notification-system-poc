const Cors = require('cors');
const { Pool } = require('pg');
const Pusher = require('pusher');
const { v4: uuidv4 } = require('uuid');

// Initialize the cors middleware
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
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

  if (req.method === 'POST') {
    const { userId, postId, text } = req.body;
    if (!userId || !postId || !text) {
      return res.status(400).json({ error: 'Missing userId, postId or text' });
    }
    try {
      const commentId = uuidv4();
      const insertCommentQuery = `
        INSERT INTO comments (id, user_id, post_id, text, created_at)
        VALUES ($1, $2, $3, $4, NOW()) RETURNING *;
      `;
      const commentValues = [commentId, userId, postId, text];
      const commentResult = await pool.query(insertCommentQuery, commentValues);
      const comment = commentResult.rows[0];

      const notificationId = uuidv4();
      const content = `User ${userId} commented ${text} on Post ${postId}`;
      const insertNotificationQuery = `
        INSERT INTO notifications (id, user_id, type, content, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW());
      `;
      const notificationValues = [notificationId, userId, 'comment', content, false];
      await pool.query(insertNotificationQuery, notificationValues);

      // Trigger Pusher event for notification
      await pusher.trigger('notifications', 'comment-added', {
        user_id: userId,
        post_id: postId,
        comment_id: commentId,
        content,
        created_at: new Date().toISOString()
      });

      return res.status(201).json({ message: 'Comment saved', comment });
    } catch (error) {
      console.error('Error saving comment:', error);
      return res.status(500).json({ error: 'Failed to save comment' });
    }
  } else if (req.method === 'GET') {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId query parameter' });
    }
    try {
      const selectQuery = `
        SELECT * FROM comments WHERE user_id = $1 ORDER BY created_at DESC;
      `;
      const result = await pool.query(selectQuery, [userId]);
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error fetching comments:', error);
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};
