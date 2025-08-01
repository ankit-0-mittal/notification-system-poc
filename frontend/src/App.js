import React, { useState, useEffect } from 'react';
import Pusher from 'pusher-js';

function App() {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [comments, setComments] = useState([]);

  const userId = "00000000-0000-0000-0000-000000000002"; 
  const backendUrl = 'https://notification-system-poc.vercel.app/api';

  useEffect(() => {
    console.log('Pusher Key:', process.env.REACT_APP_PUSHER_KEY);
    fetchComments();
    fetchNotifications();

    const pusher = new Pusher(process.env.REACT_APP_PUSHER_KEY, {
      cluster: process.env.REACT_APP_PUSHER_CLUSTER,
    });

    const channel = pusher.subscribe('notifications');
    channel.bind('comment-added', function(data) {
      fetchNotifications();
      fetchComments();
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, []);

  const submitComment = async () => {
    if (!comment.trim()) return;
    setLoading(true);
    try {
      await fetch(`${backendUrl}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          postId: "00000000-0000-0000-0000-000000000002",
          text: comment
        }),
      });
      setComment('');
      fetchComments();
      fetchNotifications();
    } catch (error) {
      console.error('Error submitting comment:', error);
    }
    setLoading(false);
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${backendUrl}/notifications?userId=${userId}`);
      const data = await res.json();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`${backendUrl}/comments?userId=${userId}`);
      const data = await res.json();
      setComments(data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ color: '#333' }}>Add Comment (Triggers Notification)</h2>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={4}
        style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', borderRadius: 4, border: '1px solid #ccc', resize: 'vertical' }}
        placeholder="Write your comment here..."
        disabled={loading}
      />
      <button
        onClick={submitComment}
        disabled={loading || !comment.trim()}
        style={{
          marginTop: '0.5rem',
          padding: '0.5rem 1rem',
          fontSize: '1rem',
          borderRadius: 4,
          border: 'none',
          backgroundColor: loading || !comment.trim() ? '#ccc' : '#007bff',
          color: 'white',
          cursor: loading || !comment.trim() ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.3s ease'
        }}
      >
        {loading ? 'Submitting...' : 'Submit'}
      </button>

      <h2 style={{ marginTop: '2rem', color: '#333' }}>Comments</h2>
      <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 4, padding: '1rem', backgroundColor: '#fefefe' }}>
        {comments.length === 0 ? (
          <p style={{ color: '#666' }}>No comments yet</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {comments.map(comment => (
              <li
                key={comment.id}
                style={{
                  padding: '0.5rem',
                  borderBottom: '1px solid #ddd',
                  fontSize: '0.9rem',
                  color: '#444'
                }}
              >
                {comment.text}
                <br />
                <small style={{ color: '#999' }}>{new Date(comment.created_at).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2 style={{ marginTop: '2rem', color: '#333' }}>Notifications</h2>
      <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 4, padding: '1rem', backgroundColor: '#fafafa' }}>
        {notifications.length === 0 ? (
          <p style={{ color: '#666' }}>No notifications</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {notifications.map(notif => (
              <li
                key={notif.id}
                style={{
                  padding: '0.5rem',
                  borderBottom: '1px solid #ddd',
                  fontSize: '0.9rem',
                  color: '#444'
                }}
              >
                {notif.content}
                <br />
                <small style={{ color: '#999' }}>{new Date(notif.created_at).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
