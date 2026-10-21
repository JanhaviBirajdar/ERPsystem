const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, authorize, logAudit } = require('../middleware/auth');

// GET /api/library/books - Catalog search
router.get('/books', authenticate, (req, res) => {
  const { search, department_id } = req.query;

  let query = `
    SELECT b.*, d.name as department_name, d.code as department_code
    FROM library_books b
    LEFT JOIN departments d ON b.department_id = d.id
    WHERE 1=1
  `;
  const params = [];

  if (department_id) {
    query += ' AND b.department_id = ?';
    params.push(department_id);
  }

  if (search) {
    query += ' AND (b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY b.title ASC';

  const books = db.prepare(query).all(...params);
  res.json({ books });
});

// POST /api/library/books - Add book to inventory
router.post('/books', authenticate, authorize(['SUPER_ADMIN', 'LIBRARIAN']), (req, res) => {
  const { isbn, title, author, publisher, edition, department_id, total_copies, shelf_location, price } = req.body;

  if (!isbn || !title || !author) {
    return res.status(400).json({ error: 'ISBN, title, and author are required' });
  }

  const id = `bk-${Date.now()}`;
  const copies = parseInt(total_copies) || 5;

  db.prepare(`
    INSERT INTO library_books (id, isbn, title, author, publisher, edition, department_id, total_copies, available_copies, shelf_location, price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, isbn, title, author, publisher, edition, department_id, copies, copies, shelf_location, price || 500);

  logAudit(req.user.id, req.user.role, 'ADD_LIBRARY_BOOK', 'BOOK', id, { title, isbn, copies }, req);
  res.status(201).json({ success: true, message: 'Book cataloged successfully', bookId: id });
});

// GET /api/library/loans - Active circulation loans & overdue tracking
router.get('/loans', authenticate, (req, res) => {
  const { student_id, status } = req.query;

  let query = `
    SELECT bi.*, b.title, b.author, b.isbn, b.shelf_location,
           s.full_name as student_name, s.prn, s.roll_no, d.code as department_code
    FROM book_issues bi
    JOIN library_books b ON bi.book_id = b.id
    JOIN students s ON bi.student_id = s.id
    JOIN departments d ON s.department_id = d.id
    WHERE 1=1
  `;
  const params = [];

  // Scoping for student role
  if (req.user.role === 'STUDENT') {
    const st = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    if (!st) return res.status(404).json({ error: 'Student profile not found' });
    query += ' AND bi.student_id = ?';
    params.push(st.id);
  } else if (student_id) {
    query += ' AND bi.student_id = ?';
    params.push(student_id);
  }

  if (status) {
    query += ' AND bi.status = ?';
    params.push(status);
  }

  query += ' ORDER BY bi.due_date ASC';

  const loans = db.prepare(query).all(...params);
  res.json({ loans });
});

// POST /api/library/issue - Issue book to student
router.post('/issue', authenticate, authorize(['SUPER_ADMIN', 'LIBRARIAN']), (req, res) => {
  const { book_id, student_id, days = 14 } = req.body;

  if (!book_id || !student_id) {
    return res.status(400).json({ error: 'book_id and student_id are required' });
  }

  const book = db.prepare('SELECT * FROM library_books WHERE id = ?').get(book_id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  if (book.available_copies <= 0) {
    return res.status(400).json({ error: 'All copies of this book are currently on loan.' });
  }

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const loanId = `iss-${Date.now()}`;
  const now = new Date();
  const issueDate = now.toISOString().split('T')[0];
  const dueDateObj = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const dueDate = dueDateObj.toISOString().split('T')[0];

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO book_issues (id, book_id, student_id, issue_date, due_date, status)
      VALUES (?, ?, ?, ?, ?, 'ISSUED')
    `).run(loanId, book_id, student_id, issueDate, dueDate);

    db.prepare('UPDATE library_books SET available_copies = available_copies - 1 WHERE id = ?').run(book_id);

    logAudit(req.user.id, req.user.role, 'ISSUE_BOOK', 'BOOK_LOAN', loanId, { bookTitle: book.title, studentPRN: student.prn }, req);
  });

  tx();

  res.status(201).json({ success: true, message: 'Book issued successfully', loanId, dueDate });
});

// POST /api/library/return - Return book & compute late fine
router.post('/return', authenticate, authorize(['SUPER_ADMIN', 'LIBRARIAN']), (req, res) => {
  const { loan_id } = req.body;
  if (!loan_id) {
    return res.status(400).json({ error: 'loan_id is required' });
  }

  const loan = db.prepare('SELECT * FROM book_issues WHERE id = ?').get(loan_id);
  if (!loan) return res.status(404).json({ error: 'Loan record not found' });
  if (loan.status === 'RETURNED') return res.status(400).json({ error: 'Book is already marked returned' });

  const now = new Date();
  const returnDate = now.toISOString().split('T')[0];
  const due = new Date(loan.due_date);

  let fine = 0;
  if (now > due) {
    const diffDays = Math.ceil((now - due) / (1000 * 60 * 60 * 24));
    fine = diffDays * 5.0; // Rs. 5 per day standard university library fine
  }

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE book_issues
      SET return_date = ?, status = 'RETURNED', fine_amount = ?
      WHERE id = ?
    `).run(returnDate, fine, loan_id);

    db.prepare('UPDATE library_books SET available_copies = available_copies + 1 WHERE id = ?').run(loan.book_id);

    logAudit(req.user.id, req.user.role, 'RETURN_BOOK', 'BOOK_LOAN', loan_id, { fineAssessed: fine }, req);
  });

  tx();

  res.json({ success: true, message: 'Book returned successfully', fine_amount: fine });
});

module.exports = router;
