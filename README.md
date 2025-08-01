# Notification System POC

## Overview

This project is a proof-of-concept (POC) implementation of a lightweight, cost-effective notification system designed to not affect other key operations. It demonstrates the notification system for the "comment" operation.


## Project Structure

- `backend/` - Backend server code and API routes.
- `api/` - Serverless API routes for comments and notifications.
- `frontend/` - Frontend React application.

## Backend

- Uses PostgreSQL for data storage.
- API routes:
  - `api/comments.js` - Handles adding and fetching comments. Inserts notifications synchronously when a comment is added.
  - `api/notifications.js` - Fetches notifications for a user.
- Uses Pusher for real-time notification delivery.
- CORS Configuration:
  - The CORS middleware in `api/comments.js` and `api/notifications.js` uses a hardcoded list of allowed origins.
  - Ensure the origin URLs in the CORS configuration exactly match the frontend origin URLs without trailing slashes to avoid CORS errors.
  - Example:
    ```js
    const cors = Cors({
      methods: ['GET', 'POST', 'OPTIONS'],
      origin: ['https://your-frontend-url.com', 'http://localhost:3000'],
    });
    ```
  - If you modify the frontend URL, update the origins in these files accordingly.

## Frontend

- React app that allows users to add comments and view notifications.
- Connects to backend API routes to fetch and post data.
- Uses Pusher client to receive real-time notification updates.

## Setup and Running Locally

1. Ensure you have PostgreSQL running and configured.
2. Set environment variables for database connection and Pusher credentials.
3. Run backend server (if applicable) or deploy API routes to Vercel.
4. Run frontend React app with correct API base URL configuration.
5. Use the app to add comments and see notifications in real-time.

## Notes

- The notification processing is synchronous within API routes to be compatible with serverless environments like Vercel.
- The system uses Pusher for real-time notification delivery.
- The design document provides detailed insights into the system architecture and design choices.

## Future Improvements

- Add support for other notification types (like, share).
- Implement notification read/unread status management.
- Add authentication and authorization.
- Use managed queue services for scalable notification processing.
