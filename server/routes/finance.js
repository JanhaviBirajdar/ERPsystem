const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db/database');
const { authenticate, authorize, logAudit } = require('../middleware/auth');

// GET /api/finance/structures - Annual fee structures by department and category
router.get('/structures', authenticate, (req, res) => {
  const structures = db.prepare(`
    SELECT fs.*, d.name as department_name, d.code as department_code, fc.name as category_name
    FROM fee_structures fs
    JOIN departments d ON fs.department_id = d.id
    JOIN fee_categories fc ON fs.fee_category_id = fc.id
    ORDER BY d.code, fc.name
  `).all();
  res.json({ structures });
});

// GET /api/finance/invoices - Student fee invoices
router.get('/invoices', authenticate, (req, res) => {
  const { student_id, status, department_id } = req.query;

  let query = `
    SELECT inv.*, s.roll_no, s.full_name as student_name, s.prn, s.category,
           d.name as department_name, d.code as department_code,
           ay.name as academic_year_name
    FROM student_invoices inv
    JOIN students s ON inv.student_id = s.id
    JOIN departments d ON s.department_id = d.id
    JOIN academic_years ay ON inv.academic_year_id = ay.id
    WHERE 1=1
  `;
  const params = [];

  // If logged in as student, restrict to own invoices
  if (req.user.role === 'STUDENT') {
    const st = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    if (!st) return res.status(404).json({ error: 'Student profile not found' });
    query += ' AND inv.student_id = ?';
    params.push(st.id);
  } else if (student_id) {
    query += ' AND inv.student_id = ?';
    params.push(student_id);
  }

  if (status) {
    query += ' AND inv.status = ?';
    params.push(status);
  }

  if (department_id) {
    query += ' AND s.department_id = ?';
    params.push(department_id);
  }

  query += ' ORDER BY inv.created_at DESC';

  const invoices = db.prepare(query).all(...params);
  res.json({ invoices });
});

// POST /api/finance/payments - Record fee payment atomically
router.post('/payments', authenticate, (req, res) => {
  const { invoice_id, amount, payment_mode, transaction_ref } = req.body;

  if (!invoice_id || !amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Valid invoice_id and positive amount are required' });
  }

  const invoice = db.prepare('SELECT * FROM student_invoices WHERE id = ?').get(invoice_id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  const payAmount = parseFloat(amount);
  if (payAmount > invoice.balance_amount) {
    return res.status(400).json({ error: `Payment amount ₹${payAmount} exceeds outstanding balance ₹${invoice.balance_amount}` });
  }

  const paymentId = `pay-${Date.now()}`;
  const receiptNumber = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const txRef = transaction_ref || `TXN-UPI-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const newPaid = invoice.paid_amount + payAmount;
  const newBalance = invoice.balance_amount - payAmount;
  const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';

  const tx = db.transaction(() => {
    // 1. Insert fee payment
    db.prepare(`
      INSERT INTO fee_payments (id, invoice_id, student_id, receipt_number, amount, payment_mode, transaction_ref, received_by, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SUCCESS')
    `).run(
      paymentId, invoice_id, invoice.student_id, receiptNumber, payAmount,
      payment_mode || 'ONLINE_UPI', txRef, req.user.full_name || 'Online Gateway'
    );

    // 2. Update invoice balances
    db.prepare(`
      UPDATE student_invoices
      SET paid_amount = ?, balance_amount = ?, status = ?
      WHERE id = ?
    `).run(newPaid, newBalance, newStatus, invoice_id);

    logAudit(req.user.id, req.user.role, 'RECORD_FEE_PAYMENT', 'FEE_PAYMENT', paymentId, { receiptNumber, amount: payAmount, invoice_id }, req);
  });

  tx();

  res.status(201).json({
    success: true,
    message: 'Payment recorded and official receipt generated',
    payment: {
      id: paymentId,
      receipt_number: receiptNumber,
      amount: payAmount,
      balance_remaining: newBalance,
      status: newStatus,
      transaction_ref: txRef
    }
  });
});

// GET /api/finance/receipt/:id - Printable official receipt
router.get('/receipt/:id', authenticate, (req, res) => {
  const payment = db.prepare(`
    SELECT p.*, inv.invoice_number, inv.total_amount as invoice_total, inv.balance_amount as invoice_balance,
           s.full_name as student_name, s.prn, s.roll_no, s.category,
           d.name as department_name, d.code as department_code,
           inst.name as institution_name, inst.address as institution_address, inst.naac_grade
    FROM fee_payments p
    JOIN student_invoices inv ON p.invoice_id = inv.id
    JOIN students s ON p.student_id = s.id
    JOIN departments d ON s.department_id = d.id
    CROSS JOIN institutions inst
    WHERE p.id = ? OR p.receipt_number = ?
  `).get(req.params.id, req.params.id);

  if (!payment) {
    return res.status(404).json({ error: 'Receipt not found' });
  }

  res.json({ receipt: payment });
});

// GET /api/finance/summary - Financial metrics
router.get('/summary', authenticate, authorize(['SUPER_ADMIN', 'PRINCIPAL', 'ACCOUNTANT']), (req, res) => {
  const overall = db.prepare(`
    SELECT 
      SUM(total_amount) as total_billed,
      SUM(paid_amount) as total_collected,
      SUM(balance_amount) as total_outstanding,
      COUNT(*) as total_invoices,
      SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) as fully_paid_count,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as fully_pending_count,
      SUM(CASE WHEN status = 'PARTIAL' THEN 1 ELSE 0 END) as partial_count
    FROM student_invoices
  `).get();

  const departmentBreakdown = db.prepare(`
    SELECT d.code, d.name as department_name,
           SUM(inv.total_amount) as billed,
           SUM(inv.paid_amount) as collected,
           SUM(inv.balance_amount) as outstanding
    FROM student_invoices inv
    JOIN students s ON inv.student_id = s.id
    JOIN departments d ON s.department_id = d.id
    GROUP BY d.id
  `).all();

  const recentTransactions = db.prepare(`
    SELECT p.*, s.full_name as student_name, s.prn, d.code as department_code
    FROM fee_payments p
    JOIN students s ON p.student_id = s.id
    JOIN departments d ON s.department_id = d.id
    ORDER BY p.payment_date DESC
    LIMIT 8
  `).all();

  res.json({
    summary: overall,
    departmentBreakdown,
    recentTransactions
  });
});

module.exports = router;
