import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import dotenv from 'dotenv';
import productRoutes from './routes/productRoutes';
import categoryRoutes from './routes/categoryRoutes';
import authRoutes from './routes/authRoutes';
import cartRoutes from './routes/cartRoutes';
import orderRoutes from './routes/orderRoutes';
import enquiryRoutes from './routes/enquiryRoutes';
import mpesaRoutes from './routes/mpesaRoutes';

dotenv.config();

const app = express();

// Set allowed origins (strip any trailing slashes)
const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  frontendUrl,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Standardize origin by removing trailing slash if present
    const cleanOrigin = origin?.replace(/\/$/, '');

    // Allow requests with no origin (Postman, server-to-server callbacks) or matched origins
    if (!origin || allowedOrigins.includes(cleanOrigin!)) {
      callback(null, true);
    } else {
      console.warn(`[CORS Blocked] Request Origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/mpesa', mpesaRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});