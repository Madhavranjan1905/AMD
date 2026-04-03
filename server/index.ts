import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

import patientsRouter from './routes/patients.js';
import doctorsRouter from './routes/doctors.js';
import recordsRouter from './routes/records.js';
import aiRouter from './routes/ai.js';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.use('/api/patients', patientsRouter);
app.use('/api/doctors', doctorsRouter);
app.use('/api/records', recordsRouter);
app.use('/api/ai', aiRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', service: 'AMD Healthcare Backend', time: new Date() });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`AMD Healthcare Backend running on port ${PORT}`);
});

export default app;
