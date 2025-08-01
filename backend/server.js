const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { addNotificationJob } = require('./queue');
const { query } = require('./db');

const app = express();

// Configure CORS to allow requests from frontend origin
app.use(cors({
  origin: ['https://notification-system-poc.vercel.app', 'http://localhost:3000'], // allow both deployed and local frontend
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(bodyParser.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Broadcast function to send data to all connected clients
wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

const { v4: uuidv4 } = require('uuid');

app.post('/api/comments', async (req, res) => {
  let { userId, postId, text } = req.body;
  try {
    // Expect UUID strings for userId and postId
    if (!userId || !postId) {
      return res.status(400).json({ error: 'userId and postId are required' });
    }
    // Validate UUID format (basic check)
    if (typeof userId !== 'string' || typeof postId !== 'string') {
      return res.status(400).json({ error: 'userId and postId must be UUID strings' });
    }
    const insertCommentQuery = `
      INSERT INTO comments (id, user_id, post_id, text, created_at)
      VALUES ($1, $2, $3, $4, NOW()) RETURNING *;
    `;
    const commentId = uuidv4();
    const values = [commentId, userId, postId, text];
    const result = await query(insertCommentQuery, values);
    const comment = result.rows[0];

    // async notify (non-blocking)
    addNotificationJob({ type: 'COMMENT_ADDED', userId, postId });

    res.status(201).json({ message: 'Comment saved', comment });
  } catch (err) {
    console.log('Error saving comment:', err);
    res.status(500).json({ error: 'Failed to save comment' });
  }
});

app.get('/api/comments/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    if (typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId must be a UUID string' });
    }
    const result = await query(
      'SELECT * FROM comments WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comments not found for user' });
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.get('/notifications/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    // Validate UUID string
    if (typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId must be a UUID string' });
    }
    const result = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notifications not found for user' });
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.post('/notify', async (req, res) => {
  const { userId, type, message } = req.body;
  if (!userId || !type || !message) {
    return res.status(400).json({ error: 'Missing userId, type or message' });
  }
  // Add notification job asynchronously
  addNotificationJob({ userId, type, message });
  res.json({ status: 'Notification event received' });
});

// 404 handler for unknown API endpoints
app.use((req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

server.listen(4000, () => {
  console.log('Backend running at http://localhost:4000');
});

module.exports = { wss, app, server };
