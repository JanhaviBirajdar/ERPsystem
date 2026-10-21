const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db/database');
const { authenticate, authorize, logAudit } = require('../middleware/auth');

// GET /api/service-desk/tickets - Ticket directory
router.get('/tickets', authenticate, (req, res) => {
  const { student_id, category, status } = req.query;

  let query = `
    SELECT t.*, s.full_name as student_name, s.prn, s.roll_no,
           d.name as department_name, d.code as department_code
    FROM service_desk_tickets t
    JOIN students s ON t.student_id = s.id
    JOIN departments d ON s.department_id = d.id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role === 'STUDENT') {
    const st = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    if (!st) return res.status(404).json({ error: 'Student profile not found' });
    query += ' AND t.student_id = ?';
    params.push(st.id);
  } else if (student_id) {
    query += ' AND t.student_id = ?';
    params.push(student_id);
  }

  if (category) {
    query += ' AND t.category = ?';
    params.push(category);
  }

  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }

  query += ' ORDER BY t.created_at DESC';

  const tickets = db.prepare(query).all(...params);
  res.json({ count: tickets.length, tickets });
});

// POST /api/service-desk/tickets - Student submits service request
router.post('/tickets', authenticate, (req, res) => {
  const { category, title, description, priority } = req.body;

  if (!category || !title) {
    return res.status(400).json({ error: 'Category and title are required' });
  }

  // Detect student ID
  let targetStudentId = req.body.student_id;
  if (req.user.role === 'STUDENT') {
    const st = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    if (!st) return res.status(404).json({ error: 'Student profile not found' });
    targetStudentId = st.id;
  }

  if (!targetStudentId) {
    return res.status(400).json({ error: 'student_id is required' });
  }

  const ticketId = `tck-${Date.now()}`;
  const ticketNo = `TCK-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  db.prepare(`
    INSERT INTO service_desk_tickets (id, ticket_no, student_id, category, title, description, priority, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
  `).run(ticketId, ticketNo, targetStudentId, category, title, description || '', priority || 'NORMAL');

  logAudit(req.user.id, req.user.role, 'CREATE_SERVICE_TICKET', 'SERVICE_TICKET', ticketId, { ticketNo, category, title }, req);
  res.status(201).json({ success: true, message: 'Service ticket submitted successfully', ticket: { id: ticketId, ticketNo } });
});

// PUT /api/service-desk/tickets/:id/status - Approve, reject or resolve ticket
router.put('/tickets/:id/status', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'ACCOUNTANT']), (req, res) => {
  const { status, resolution_notes } = req.body;
  const valid = ['PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: 'Invalid ticket status' });
  }

  const ticket = db.prepare(`
    SELECT t.*, s.prn, s.full_name
    FROM service_desk_tickets t
    JOIN students s ON t.student_id = s.id
    WHERE t.id = ?
  `).get(req.params.id);

  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  let certificateHash = ticket.certificate_hash;
  // If approved and is a Bonafide or Leaving certificate, generate cryptographic verification token
  if (status === 'APPROVED' && ['BONAFIDE_CERTIFICATE', 'LEAVING_CERTIFICATE'].includes(ticket.category) && !certificateHash) {
    const raw = `${ticket.student_id}-${ticket.prn}-${Date.now()}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex').substring(0, 12).toUpperCase();
    certificateHash = `AIT-${ticket.category.slice(0, 4)}-2026-${ticket.prn}-${hash}`;
  }

  db.prepare(`
    UPDATE service_desk_tickets
    SET status = ?,
        resolution_notes = COALESCE(?, resolution_notes),
        assigned_to = ?,
        certificate_hash = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, resolution_notes, req.user.full_name, certificateHash, req.params.id);

  logAudit(req.user.id, req.user.role, 'UPDATE_TICKET_STATUS', 'SERVICE_TICKET', req.params.id, { newStatus: status, certificateHash }, req);

  res.json({
    success: true,
    message: `Ticket ${ticket.ticket_no} updated to ${status}`,
    certificate_hash: certificateHash
  });
});

// GET /api/service-desk/verify/:hash - Public QR Verification for Official Certificates & IDs
router.get('/verify/:hash', (req, res) => {
  const ticket = db.prepare(`
    SELECT t.ticket_no, t.category, t.certificate_hash, t.updated_at,
           s.full_name as student_name, s.prn, s.roll_no, s.category as student_quota,
           d.name as department_name, d.code as department_code,
           inst.name as institution_name, inst.naac_grade, inst.affiliation
    FROM service_desk_tickets t
    JOIN students s ON t.student_id = s.id
    JOIN departments d ON s.department_id = d.id
    CROSS JOIN institutions inst
    WHERE t.certificate_hash = ?
  `).get(req.params.hash);

  if (!ticket) {
    return res.status(404).json({
      valid: false,
      message: 'Certificate hash could not be verified in the institution ledger. Possible invalid or counterfeit document.'
    });
  }

  res.json({
    valid: true,
    verification_status: 'AUTHENTIC & VERIFIED BY REGISTRAR',
    certificate_details: ticket
  });
});

module.exports = router;
