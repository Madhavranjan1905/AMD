import { Router } from 'express';
import { db } from '../firebase-admin.js';
import { verifyToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/:patientId', verifyToken, async (req: AuthRequest, res) => {
  try {
    const snapshot = await db
      .collection('healthRecords')
      .where('patientId', '==', req.params.patientId)
      .orderBy('date', 'desc')
      .get();
    const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(records);
  } catch (error) {
    console.error('Error fetching health records:', error);
    res.status(500).json({ error: 'Failed to fetch health records' });
  }
});

router.post('/', verifyToken, async (req: AuthRequest, res) => {
  try {
    const data = { ...req.body, createdAt: new Date().toISOString() };
    const docRef = await db.collection('healthRecords').add(data);
    res.status(201).json({ id: docRef.id, ...data });
  } catch (error) {
    console.error('Error creating health record:', error);
    res.status(500).json({ error: 'Failed to create health record' });
  }
});

export default router;
