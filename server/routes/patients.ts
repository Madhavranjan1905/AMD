import { Router } from 'express';
import { db } from '../firebase-admin.js';
import { verifyToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', verifyToken, async (req: AuthRequest, res) => {
  try {
    const snapshot = await db.collection('patients').get();
    const patients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

router.get('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    const doc = await db.collection('patients').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Patient not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

router.post('/', verifyToken, async (req: AuthRequest, res) => {
  try {
    const data = { ...req.body, createdAt: new Date().toISOString() };
    const docRef = await db.collection('patients').add(data);
    res.status(201).json({ id: docRef.id, ...data });
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

router.put('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    const ref = db.collection('patients').doc(req.params.id);
    await ref.update({ ...req.body, updatedAt: new Date().toISOString() });
    const updated = await ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

router.delete('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    await db.collection('patients').doc(req.params.id).delete();
    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

export default router;
