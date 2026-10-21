import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Search, Check, X, RotateCcw, Clock, AlertCircle, 
  Bookmark, Bell, Mail, Send, Calendar, CheckCircle2, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';

export default function LibraryPage({ user }) {
  const [activeTab, setActiveTab] = useState('catalog');
  const [books, setBooks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [overdues, setOverdues] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Add Book Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBook, setNewBook] = useState({
    isbn: '',
    title: '',
    author: '',
    publisher: 'McGraw Hill',
    edition: '6th Edition',
    department_id: 'dept-comp',
    total_copies: 10,
    shelf_location: 'Rack C-05',
    price: 850
  });

  // Issue Book Modal State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueData, setIssueData] = useState({
    book_id: '',
    student_id: 'stud-101',
    days: 14
  });

  // Reserve Book Modal State
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [reserveData, setReserveData] = useState({
    book_id: '',
    student_id: 'stud-101'
  });

  useEffect(() => {
    loadBooks();
    loadLoans();
    loadReservations();
    loadOverdues();
  }, [user]);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const res = await api.library.getBooks({ search });
      setBooks(res.books || []);
    } catch (err) {
      console.error('Failed to load books:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLoans = async () => {
    try {
      const res = await api.library.getLoans();
      setLoans(res.loans || []);
    } catch (err) {
      console.error('Failed to load loans:', err);
    }
  };

  const loadReservations = async () => {
    try {
      const res = await api.library.getReservations();
      setReservations(res.reservations || []);
    } catch (err) {
      console.error('Failed to load reservations:', err);
    }
  };

  const loadOverdues = async () => {
    try {
      const res = await api.library.getOverdue();
      setOverdues(res.overdue_loans || []);
    } catch (err) {
      console.error('Failed to load overdues:', err);
    }
  };

  const handleAddBook = async (e) => {
    e.preventDefault();
    try {
      await api.library.addBook(newBook);
      alert('Book cataloged into library collection successfully!');
      setShowAddModal(false);
      loadBooks();
    } catch (err) {
      alert(`Error adding book: ${err.message}`);
    }
  };

  const handleIssueBook = async (e) => {
    e.preventDefault();
    try {
      await api.library.issueBook(issueData);
      alert('Book issued to student successfully!');
      setShowIssueModal(false);
      loadBooks();
      loadLoans();
      loadReservations();
    } catch (err) {
      alert(`Issue failed: ${err.message}`);
    }
  };

  const handleReturnBook = async (loanId) => {
    try {
      const res = await api.library.returnBook(loanId);
      if (res.fine_amount > 0) {
        alert(`Book returned! Late fine of ₹${res.fine_amount} assessed.`);
      } else {
        alert('Book returned on time with zero fine assessed.');
      }
      loadBooks();
      loadLoans();
      loadOverdues();
    } catch (err) {
      alert(`Return failed: ${err.message}`);
    }
  };

  const handleReserveBook = async (e) => {
    e.preventDefault();
    try {
      await api.library.reserveBook(reserveData);
      alert('Book reservation placed successfully in the library queue!');
      setShowReserveModal(false);
      loadReservations();
    } catch (err) {
      alert(`Reservation failed: ${err.message}`);
    }
  };

  const handleSendOverdueReminders = async () => {
    try {
      const res = await api.library.sendOverdueReminders();
      alert(res.message || 'Automated overdue reminders dispatched to student email and parent portal!');
    } catch (err) {
      alert(`Failed to send reminders: ${err.message}`);
    }
  };

  const isLibrarianOrAdmin = ['SUPER_ADMIN', 'LIBRARIAN'].includes(user?.role);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen className="text-primary" size={24} />
            Central Library & Digital Circulation Desk
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Book inventory catalog, automated due dates, circulation loans, waitlist reservations, and overdue reminder engine
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowReserveModal(true)}>
            <Bookmark size={14} />
            <span>Place Reservation</span>
          </button>

          {isLibrarianOrAdmin && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowIssueModal(true)}>
                <RotateCcw size={14} />
                <span>Issue Circulation Book</span>
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                <Plus size={14} />
                <span>Catalog New Book</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
        <button 
          className={`tab-btn ${activeTab === 'catalog' ? 'active' : ''}`} 
          onClick={() => setActiveTab('catalog')}
          style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'catalog' ? '2px solid var(--primary)' : 'none', fontWeight: 600, color: activeTab === 'catalog' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Book Inventory & ISBN Catalog ({books.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'loans' ? 'active' : ''}`} 
          onClick={() => setActiveTab('loans')}
          style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'loans' ? '2px solid var(--primary)' : 'none', fontWeight: 600, color: activeTab === 'loans' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Active Circulation Loans ({loans.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'reservations' ? 'active' : ''}`} 
          onClick={() => setActiveTab('reservations')}
          style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'reservations' ? '2px solid var(--primary)' : 'none', fontWeight: 600, color: activeTab === 'reservations' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Reservations Queue ({reservations.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'overdue' ? 'active' : ''}`} 
          onClick={() => setActiveTab('overdue')}
          style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'overdue' ? '2px solid var(--primary)' : 'none', fontWeight: 600, color: activeTab === 'overdue' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Overdue Tracking & Notices ({overdues.length})
        </button>
      </div>

      {/* TAB 1: BOOK CATALOG */}
      {activeTab === 'catalog' && (
        <div>
          <div className="card" style={{ padding: '14px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search catalog by title, author, or ISBN number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadBooks(); }}
              />
              <button className="btn btn-secondary" onClick={loadBooks}>
                <Search size={15} />
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ISBN</th>
                  <th>Title & Edition</th>
                  <th>Author</th>
                  <th>Department</th>
                  <th>Copies Available</th>
                  <th>Shelf Location</th>
                  <th>Price</th>
                  <th style={{ textAlign: 'right' }}>Quick Reserve</th>
                </tr>
              </thead>
              <tbody>
                {books.map(b => (
                  <tr key={b.id}>
                    <td><code>{b.isbn}</code></td>
                    <td>
                      <strong>{b.title}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{b.edition} • {b.publisher}</div>
                    </td>
                    <td>{b.author}</td>
                    <td>{b.department_code || 'COMP'}</td>
                    <td>
                      <span className={`badge ${b.available_copies > 0 ? 'badge-success' : 'badge-danger'}`}>
                        {b.available_copies} / {b.total_copies} Available
                      </span>
                    </td>
                    <td><span className="badge badge-secondary">{b.shelf_location}</span></td>
                    <td>₹{b.price}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setReserveData({ ...reserveData, book_id: b.id });
                          setShowReserveModal(true);
                        }}
                      >
                        <Bookmark size={13} />
                        <span>Reserve</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE CIRCULATION LOANS */}
      {activeTab === 'loans' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>PRN</th>
                <th>Book Title</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Fine Assessed</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loans.map(loan => (
                <tr key={loan.id}>
                  <td><strong>{loan.student_name}</strong></td>
                  <td><code>{loan.prn}</code></td>
                  <td>{loan.title}</td>
                  <td>{loan.issue_date}</td>
                  <td>
                    <strong>{loan.due_date}</strong>
                  </td>
                  <td>
                    {loan.fine_amount > 0 ? (
                      <span style={{ color: '#dc2626', fontWeight: 700 }}>₹{loan.fine_amount}</span>
                    ) : '₹0'}
                  </td>
                  <td>
                    <span className={`badge ${loan.status === 'ISSUED' ? 'badge-info' : loan.status === 'OVERDUE' ? 'badge-danger' : 'badge-success'}`}>
                      {loan.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {loan.status !== 'RETURNED' && isLibrarianOrAdmin && (
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleReturnBook(loan.id)}
                      >
                        <Check size={13} />
                        <span>Accept Return</span>
                      </button>
                    )}
                    {loan.status === 'RETURNED' && (
                      <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>Returned</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: RESERVATIONS QUEUE */}
      {activeTab === 'reservations' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reservation ID</th>
                <th>Student</th>
                <th>Book Title & Author</th>
                <th>Reserved Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Circulation Desk Action</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map(res => (
                <tr key={res.id}>
                  <td><code>{res.id}</code></td>
                  <td>
                    <strong>{res.student_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Roll: {res.roll_no} | PRN: {res.prn}</div>
                  </td>
                  <td>
                    <strong>{res.book_title}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>by {res.author} (ISBN: {res.isbn})</div>
                  </td>
                  <td>{new Date(res.reserved_at).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${
                      res.status === 'RESERVED' ? 'badge-warning' :
                      res.status === 'FULFILLED' ? 'badge-success' : 'badge-secondary'
                    }`}>
                      {res.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {isLibrarianOrAdmin && res.status === 'RESERVED' && (
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setIssueData({
                            book_id: res.book_id,
                            student_id: res.student_id,
                            days: 14
                          });
                          setShowIssueModal(true);
                        }}
                      >
                        <RotateCcw size={13} />
                        <span>Issue Reserved Copy</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {reservations.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No pending book reservations in queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: OVERDUE TRACKING & NOTICES */}
      {activeTab === 'overdue' && (
        <div>
          <div className="card" style={{ padding: '16px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: '#fef2f2', border: '1px solid #fecaca' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle className="text-danger" size={24} />
              <div>
                <strong style={{ color: '#991b1b', fontSize: '0.95rem' }}>Automated Circulation Overdue Policy</strong>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#b91c1c' }}>
                  Books overdue past 14 days accrue ₹5.00/day fine. Batch dispatch automated SMS & Email notices with payment links.
                </p>
              </div>
            </div>

            {isLibrarianOrAdmin && (
              <button className="btn btn-primary btn-sm" onClick={handleSendOverdueReminders}>
                <Send size={14} />
                <span>Send Overdue Reminders ({overdues.length})</span>
              </button>
            )}
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>PRN</th>
                  <th>Book Title</th>
                  <th>Due Date</th>
                  <th>Days Overdue</th>
                  <th>Calculated Fine</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {overdues.map(od => (
                  <tr key={od.id}>
                    <td><strong>{od.student_name}</strong></td>
                    <td><code>{od.prn}</code></td>
                    <td>{od.title}</td>
                    <td style={{ color: '#dc2626', fontWeight: 600 }}>{od.due_date}</td>
                    <td>
                      <span className="badge badge-danger">
                        {od.days_overdue || Math.max(1, Math.floor((new Date() - new Date(od.due_date)) / (1000 * 60 * 60 * 24)))} days late
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: '#dc2626' }}>
                        ₹{od.fine_amount || (Math.max(1, Math.floor((new Date() - new Date(od.due_date)) / (1000 * 60 * 60 * 24))) * 5)}
                      </strong>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleReturnBook(od.id)}
                      >
                        <Check size={13} />
                        <span>Clear Fine & Return</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {overdues.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No overdue books. Circulation is 100% compliant!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Book Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Catalog New Library Book</h3>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddBook}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Book Title *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                  />
                </div>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Author *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={newBook.author}
                      onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ISBN Code *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="978-0131103627"
                      value={newBook.isbn}
                      onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Shelf Location</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newBook.shelf_location}
                      onChange={(e) => setNewBook({ ...newBook, shelf_location: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Copies</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={newBook.total_copies}
                      onChange={(e) => setNewBook({ ...newBook, total_copies: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Catalog Book</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Book Modal */}
      {showIssueModal && (
        <div className="modal-overlay" onClick={() => setShowIssueModal(false)}>
          <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Issue Book to Student</h3>
              <button className="icon-btn" onClick={() => setShowIssueModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleIssueBook}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Select Book *</label>
                  <select
                    className="form-select"
                    required
                    value={issueData.book_id}
                    onChange={(e) => setIssueData({ ...issueData, book_id: e.target.value })}
                  >
                    <option value="">Select Book from Catalog</option>
                    {books.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({b.available_copies} available)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Select Student *</label>
                  <select
                    className="form-select"
                    value={issueData.student_id}
                    onChange={(e) => setIssueData({ ...issueData, student_id: e.target.value })}
                  >
                    <option value="stud-101">Aarav Sharma (PRN: 2023COMP0045)</option>
                    <option value="stud-102">Rohan Verma (PRN: 2023COMP0078)</option>
                    <option value="stud-103">Ananya Iyer (PRN: 2023AIDS0012)</option>
                    <option value="stud-104">Diya Patel (PRN: 2023COMP0018)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowIssueModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Issue</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reserve Book Modal */}
      {showReserveModal && (
        <div className="modal-overlay" onClick={() => setShowReserveModal(false)}>
          <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Place Library Book Reservation</h3>
              <button className="icon-btn" onClick={() => setShowReserveModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleReserveBook}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Select Book to Reserve *</label>
                  <select
                    className="form-select"
                    required
                    value={reserveData.book_id}
                    onChange={(e) => setReserveData({ ...reserveData, book_id: e.target.value })}
                  >
                    <option value="">Select Book</option>
                    {books.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({b.author})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Student Record *</label>
                  <select
                    className="form-select"
                    value={reserveData.student_id}
                    onChange={(e) => setReserveData({ ...reserveData, student_id: e.target.value })}
                  >
                    <option value="stud-101">Aarav Sharma (PRN: 2023COMP0045)</option>
                    <option value="stud-102">Rohan Verma (PRN: 2023COMP0078)</option>
                    <option value="stud-103">Ananya Iyer (PRN: 2023AIDS0012)</option>
                    <option value="stud-104">Diya Patel (PRN: 2023COMP0018)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowReserveModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Place Hold / Reserve</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
