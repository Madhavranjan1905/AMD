const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authorize } = require('../middleware/auth');

const router = express.Router();

// Create appointment (patient only)
router.post('/', authorize(['patient']), [
  body('doctor_id').isInt(),
  body('appointment_date').isISO8601(),
  body('reason').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { doctor_id, appointment_date, reason, notes } = req.body;

    // Get patient ID
    const patientResult = await pool.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
    if (patientResult.rows.length === 0) {
      return res.status(400).json({ error: 'Patient profile not found' });
    }

    const patient_id = patientResult.rows[0].id;

    const result = await pool.query(
      `INSERT INTO appointments (doctor_id, patient_id, appointment_date, reason, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [doctor_id, patient_id, appointment_date, reason, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Get all appointments
router.get('/', async (req, res) => {
  try {
    let query = `
      SELECT a.*, 
        d.specialization, u1.first_name as doctor_first_name, u1.last_name as doctor_last_name,
        u2.first_name as patient_first_name, u2.last_name as patient_last_name
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u1 ON d.user_id = u1.id
      JOIN patients p ON a.patient_id = p.id
      JOIN users u2 ON p.user_id = u2.id
    `;
    const params = [];

    // Filter by role
    if (req.user.role === 'doctor') {
      query += ` WHERE d.user_id = $1`;
      params.push(req.user.id);
    } else if (req.user.role === 'patient') {
      query += ` WHERE p.user_id = $1`;
      params.push(req.user.id);
    }

    query += ` ORDER BY a.appointment_date DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Get appointment by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, 
        d.specialization, u1.first_name as doctor_first_name, u1.last_name as doctor_last_name,
        u2.first_name as patient_first_name, u2.last_name as patient_last_name
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u1 ON d.user_id = u1.id
      JOIN patients p ON a.patient_id = p.id
      JOIN users u2 ON p.user_id = u2.id
      WHERE a.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
});

// Update appointment (doctor and patient)
router.put('/:id', [
  body('status').optional().isIn(['scheduled', 'completed', 'cancelled', 'no-show'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { status, notes } = req.body;

    // Check authorization
    const appointmentResult = await pool.query(`
      SELECT a.*, d.user_id as doctor_user_id, p.user_id as patient_user_id
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN patients p ON a.patient_id = p.id
      WHERE a.id = $1
    `, [req.params.id]);

    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointment = appointmentResult.rows[0];
    if (req.user.id !== appointment.doctor_user_id && req.user.id !== appointment.patient_user_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(`
      UPDATE appointments SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [status, notes, req.params.id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Cancel appointment
router.delete('/:id', async (req, res) => {
  try {
    const appointmentResult = await pool.query(`
      SELECT a.*, d.user_id as doctor_user_id, p.user_id as patient_user_id
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN patients p ON a.patient_id = p.id
      WHERE a.id = $1
    `, [req.params.id]);

    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appointment = appointmentResult.rows[0];
    if (req.user.id !== appointment.doctor_user_id && req.user.id !== appointment.patient_user_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(`
      UPDATE appointments SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [req.params.id]);

    res.json({ message: 'Appointment cancelled', appointment: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

// Get appointments by doctor
router.get('/doctor/:doctor_id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, 
        u1.first_name as doctor_first_name, u1.last_name as doctor_last_name,
        u2.first_name as patient_first_name, u2.last_name as patient_last_name
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u1 ON d.user_id = u1.id
      JOIN patients p ON a.patient_id = p.id
      JOIN users u2 ON p.user_id = u2.id
      WHERE a.doctor_id = $1
      ORDER BY a.appointment_date DESC
    `, [req.params.doctor_id]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

module.exports = router;
