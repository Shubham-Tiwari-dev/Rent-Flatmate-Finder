import express from 'express';
import { createServer as createHttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import apiRouter from './src/backend/routes.js';
import { db } from './src/backend/db.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  // Initialize Neon database or local JSON database
  try {
    await db.init();
  } catch (err) {
    console.error('Database initialization failed:', err);
  }

  const app = express();
  app.set('trust proxy', 1);
  const httpServer = createHttpServer(app);
  
  // Apply Helmet with relaxed options for AI Studio preview iframe compatibility
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    frameguard: false,
  }));

  // Rate Limiting for API routes
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000, // increased limit to prevent false positives in tests and active use
    standardHeaders: true,
    legacyHeaders: false,
    validate: false, // completely disable internal validation checks (trust proxy, X-Forwarded-For, Forwarded headers) to prevent throwing errors on different environments
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  });
  app.use('/api', limiter);

  // Configure socket.io
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Body parser middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Routes
  app.use('/api', apiRouter);

  // Keep track of online user IDs (socket.id -> userId)
  const onlineUsers = new Map<string, string>();

  // Socket.IO event mapping
  io.on('connection', (socket) => {
    console.log(`Socket client connected: ${socket.id}`);

    // Register user ID and broadcast online status
    socket.on('register-user', (userId: string) => {
      onlineUsers.set(socket.id, userId);
      io.emit('online-users', Array.from(new Set(onlineUsers.values())));
      console.log(`Socket register-user: ${userId} (${socket.id})`);
    });

    // Join room
    socket.on('join-room', (chatId: string) => {
      socket.join(chatId);
      console.log(`Socket ${socket.id} joined room: ${chatId}`);
    });

    // Leave room
    socket.on('leave-room', (chatId: string) => {
      socket.leave(chatId);
      console.log(`Socket ${socket.id} left room: ${chatId}`);
    });

    // Typing indicator
    socket.on('typing', (data: { chatId: string; userId: string; isTyping: boolean }) => {
      socket.to(data.chatId).emit('typing', data);
    });

    // Handle incoming messages
    socket.on('send-message', async (data: { chatId: string; senderId: string; text: string }) => {
      try {
        if (!data.text || !data.text.trim()) return;

        // Save into Neon PostgreSQL database
        const newMessage = await db.messages.create({
          chatId: data.chatId,
          senderId: data.senderId,
          text: data.text,
        });

        // Broadcast to everyone in the room (including sender to maintain state)
        io.to(data.chatId).emit('receive-message', newMessage);
      } catch (err) {
        console.error('Socket send-message handling error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
      onlineUsers.delete(socket.id);
      io.emit('online-users', Array.from(new Set(onlineUsers.values())));
    });
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    console.log('Running in DEVELOPMENT mode. Initializing Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Running in PRODUCTION mode. Serving pre-compiled static files...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind to host 0.0.0.0 and port 3000
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 Rent & Flatmate Finder server live on port ${PORT}`);
    console.log(`👉 Access URL: http://0.0.0.0:${PORT}`);
    console.log(`====================================================`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting application server:', err);
});
