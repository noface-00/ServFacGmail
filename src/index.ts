import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ScannerController } from './scanner.controller.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3005;

// Middleware
app.use(cors());
// Set limits high enough to handle base64 files transfer
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Controller instantiation
const scannerController = new ScannerController();

// Routes
app.post('/scan', scannerController.scan);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'gmail-scanner-service' });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`===============================================`);
    console.log(`  Gmail Invoice Scanner Service running on port ${port}`);
    console.log(`  POST /scan is active and ready`);
    console.log(`===============================================`);
  });
}

export default app;
