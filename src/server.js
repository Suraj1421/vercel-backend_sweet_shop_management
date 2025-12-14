import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import serverless from 'serverless-http';

import authRoutes from './routes/auth.routes.js';
import sweetRoutes from './routes/sweet.routes.js';

dotenv.config();

const app = express();

app.use(cors());
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/sweets', sweetRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
}

app.use(async (req, res, next) => {
  await connectDB();
  next();
});

export default serverless(app);
