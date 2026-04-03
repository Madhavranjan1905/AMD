const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authorize } = require('../middleware/auth');

const router = express.Router();

// Create doctor profile (doctor only)
router.post('/', authorize(['doctor']), [
  body('license_number').notEmpty(),
  body('specialization').notEmpty(),
  body('consultation_fee').isFloat({ min: 0 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      license_number,
      specialization,
      bio,
      clinic_address,
      clinic_phone,
      consultation_fee,
      available_from,
      available_to,
      years_experience
    } = req.body;

    const result = await pool.query(
      `INSERT INTO doctors (
        user_id, license_number, specialization, bio, clinic_address,
        clinic_phone, consultation_fee, available_from, available_to, years_experience
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        req.user.id,
        license_number,
        specialization,
        bio,
        clinic_address,
        clinic_phone,
        consultation_fee,
        available_from,
        available_to,
        years_experience
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create doctor profile' });
  }
});

// Get all doctors
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, u.first_name, u.last_name, u.email, u.phone
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      ORDER BY d.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// Get doctor by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, u.first_name, u.last_name, u.email, u.phone
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      WHERE d.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch doctor' });
  }
});

// Update doctor profile (doctor only)
router.put('/:id', authorize(['doctor']), async (req, res) => {
  try {
    const {
      specialization,
      bio,
      clinic_address,
      clinic_phone,
      consultation_fee,
      available_from,
      available_to,
      years_experience
    } = req.body;

    const result = await pool.query(`
      UPDATE doctors SET
        specialization = $1, bio = $2, clinic_address = $3,
        clinic_phone = $4, consultation_fee = $5, available_from = $6,
        available_to = $7, years_experience = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND user_id = $10
      RETURNING *
    `, [
      specialization,
      bio,
      clinic_address,
      clinic_phone,
      consultation_fee,
      available_from,
      available_to,
      years_experience,
      req.params.id,
      req.user.id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found or unauthorized' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update doctor profile' });
  }
});

// Get doctors by specialization
router.get('/specialization/:spec', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, u.first_name, u.last_name, u.email, u.phone
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      WHERE LOWER(d.specialization) LIKE LOWER($1)
      ORDER BY d.created_at DESC
    `, [`%${req.params.spec}%`]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

module.exports = router;
