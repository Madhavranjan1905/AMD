const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authorize } = require('../middleware/auth');

const router = express.Router();

// Create patient profile (patient only)
router.post('/', authorize(['patient']), [
  body('date_of_birth').optional().isISO8601(),
  body('blood_group').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      date_of_birth,
      blood_group,
      allergies,
      medical_history,
      emergency_contact,
      emergency_contact_phone
    } = req.body;

    const result = await pool.query(
      `INSERT INTO patients (
        user_id, date_of_birth, blood_group, allergies, medical_history,
        emergency_contact, emergency_contact_phone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        req.user.id,
        date_of_birth,
        blood_group,
        allergies,
        medical_history,
        emergency_contact,
        emergency_contact_phone
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create patient profile' });
  }
});

// Get all patients (admin only)
router.get('/', authorize(['admin']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.first_name, u.last_name, u.email, u.phone
      FROM patients p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Get patient by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.first_name, u.last_name, u.email, u.phone
      FROM patients p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// Update patient profile (patient only)
router.put('/:id', authorize(['patient']), async (req, res) => {
  try {
    const {
      date_of_birth,
      blood_group,
      allergies,
      medical_history,
      emergency_contact,
      emergency_contact_phone
    } = req.body;

    const result = await pool.query(`
      UPDATE patients SET
        date_of_birth = $1, blood_group = $2, allergies = $3,
        medical_history = $4, emergency_contact = $5,
        emergency_contact_phone = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND user_id = $8
      RETURNING *
    `, [
      date_of_birth,
      blood_group,
      allergies,
      medical_history,
      emergency_contact,
      emergency_contact_phone,
      req.params.id,
      req.user.id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found or unauthorized' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update patient profile' });
  }
});

// Get current user patient profile
router.get('/me/profile', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.first_name, u.last_name, u.email, u.phone
      FROM patients p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch patient profile' });
  }
});

module.exports = router;
