import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, Check, X, RotateCcw, Clock, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function LibraryPage({ user }) {
  const [activeTab, setActiveTab] = useState('catalog');
  const [books, setBooks] = useState([]);
  const [loans, setLoans] = useState([]);
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

  useEffect(() => {
    loadBooks();
    loadLoans();
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
    } catch (err) {
      alert(`Return failed: ${err.message}`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Library Information & Circulation Desk</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Book inventory catalog, automated due dates, circulation loans, and late fine calculation
          </p>
        </div>

        {['SUPER_ADMIN', 'LIBRARIAN'].includes(user?.role) && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={() => setShowIssueModal(true)}>
              <RotateCcw size={15} />
              <span>Issue Book</span>
            </button>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={15} />
              <span>Add Book to Catalog</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs-nav">
        <button className={`tab-btn ${activeTab === 'catalog' ? 'active' : ''}`} onClick={() => setActiveTab('catalog')}>
          Book Inventory & ISBN Catalog
        </button>
        <button className={`tab-btn ${activeTab === 'loans' ? 'active' : ''}`} onClick={() => setActiveTab('loans')}>
          Active Circulation Loans & Returns ({loans.length})
        </button>
      </div>

      {/* =========================================================================
          TAB 1: BOOK CATALOG
          ========================================================================= */}
      {activeTab === 'catalog' && (
        <div>
          {/* Search Bar */}
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
                    <td><span className="badge badge-neutral">{b.shelf_location}</span></td>
                    <td>₹{b.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: ACTIVE CIRCULATION LOANS
          ========================================================================= */}
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
                    {loan.status !== 'RETURNED' && ['SUPER_ADMIN', 'LIBRARIAN'].includes(user?.role) && (
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleReturnBook(loan.id)}
                      >
                        <Check size={13} />
                        <span>Accept Return</span>
                      </button>
                    )}
                    {loan.status === 'RETURNED' && (
                      <span style={{ fontSize: '0.75rem', color: '#059669' }}>Returned</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                <div className="form-group">
                  <label className="form-label">Book Title *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                  />
                </div>
                <div className="form-row">
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
                <div className="form-row">
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
              <div className="modal-footer">
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
                <div className="form-group">
                  <label className="form-label">Select Book *</label>
                  <select
                    className="form-select"
                    required
                    value={issueData.book_id}
                    onChange={(e) => setIssueData({ ...issueData, book_id: e.target.value })}
                  >
                    <option value="">Select Book from Catalog</option>
                    {books.filter(b => b.available_copies > 0).map(b => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({b.available_copies} available)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
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
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowIssueModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Issue</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
