const { query } = require('./db');
const { wss } = require('./server');
const { v4: uuidv4 } = require('uuid');

const notificationBatch = [];
const BATCH_SIZE = 10;
const BATCH_INTERVAL_MS = 5000; // 5 seconds

// Mock email sending function
function sendEmailNotification(notification) {
  console.log(`[Email] Sent to user ${notification.user_id}: ${notification.content}`);
}

// Mock push notification sending function
function sendPushNotification(notification) {
  console.log(`[Push] Sent to user ${notification.user_id}: ${notification.content}`);
}

// Function to process batch insert and delivery
async function processBatch() {
  if (notificationBatch.length === 0) return;

  const batch = notificationBatch.splice(0, BATCH_SIZE);

  const insertValues = [];
  const params = [];
  let paramIndex = 1;

  batch.forEach(n => {
    insertValues.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
    params.push(n.id, n.user_id, n.type, n.content, n.is_read, n.created_at, n.expires_at);
  });

  const insertQuery = `
    INSERT INTO notifications (id, user_id, type, content, is_read, created_at, expires_at)
    VALUES ${insertValues.join(', ')}
    RETURNING *;
  `;

  try {
    const res = await query(insertQuery, params);
    const insertedNotifications = res.rows;

    // Broadcast and send additional delivery channels
    insertedNotifications.forEach(notification => {
      if (wss) {
        wss.broadcast(JSON.stringify(notification));
      }
      sendEmailNotification(notification);
      sendPushNotification(notification);
      console.log('[Notification]:', notification.content);
    });
  } catch (err) {
    console.error('Error inserting batch notifications:', err);
  }
}

// Periodic batch processing
setInterval(processBatch, BATCH_INTERVAL_MS);

// Periodic cleanup of expired notifications (TTL)
async function cleanupExpiredNotifications() {
  const now = new Date().toISOString();
  const deleteQuery = `
    DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at < $1;
  `;
  try {
    await query(deleteQuery, [now]);
    console.log('[Cleanup] Expired notifications removed');
  } catch (err) {
    console.error('Error cleaning up expired notifications:', err);
  }
}
setInterval(cleanupExpiredNotifications, 60 * 60 * 1000); // every hour

async function handleNotification(event) {
  const { type, userId, postId } = event;
  const content = `User ${userId} commented on Post ${postId}`;

  const created_at = new Date().toISOString();
  const is_read = false;
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days TTL

  const notification = {
    id: uuidv4(),
    user_id: userId,
    type,
    content,
    is_read,
    created_at,
    expires_at
  };

  notificationBatch.push(notification);

  // For immediate feedback, optionally process batch if size reached
  if (notificationBatch.length >= BATCH_SIZE) {
    processBatch();
  }
}

module.exports = { handleNotification };
