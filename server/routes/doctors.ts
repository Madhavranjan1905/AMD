import { Router } from 'express';
import { db } from '../firebase-admin.js';
import { verifyToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', verifyToken, async (req: AuthRequest, res) => {
  try {
    const snapshot = await db.collection('doctors').get();
    const doctors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(doctors);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

router.get('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    const doc = await db.collection('doctors').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Doctor not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching doctor:', error);
    res.status(500).json({ error: 'Failed to fetch doctor' });
  }
});

export default router;
