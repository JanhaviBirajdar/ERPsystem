import React, { useState, useEffect } from 'react';
import { 
  Building2, Bus, Wrench, ShieldAlert, CheckCircle2, Plus, 
  MapPin, Phone, UserCheck, AlertTriangle, Check, X, Filter, 
  Calendar, Layers, Clock, Users, Home, AlertCircle, FileText
} from 'lucide-react';
import { api } from '../services/api';

export default function CampusOperationsPage({ user }) {
  const [activeTab, setActiveTab] = useState('hostel');
  const [loading, setLoading] = useState(true);

  // 1. Hostel State
  const [hostelRooms, setHostelRooms] = useState([]);
  const [hostelAllocations, setHostelAllocations] = useState([]);
  const [showAllocateHostelModal, setShowAllocateHostelModal] = useState(false);
  const [hostelForm, setHostelForm] = useState({
    student_id: 'stud-101',
    hostel_room_id: '',
    bed_number: 'Bed-1'
  });
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [roomForm, setRoomForm] = useState({
    hostel_name: 'Dr. Kalam Boys Residence Hall (BH-1)',
    room_number: '105',
    floor: 1,
    capacity: 3,
    fee_per_semester: 35000
  });

  // 2. Transport State
  const [transportRoutes, setTransportRoutes] = useState([]);
  const [transportAllocations, setTransportAllocations] = useState([]);
  const [showAllocateTransportModal, setShowAllocateTransportModal] = useState(false);
  const [transportForm, setTransportForm] = useState({
    student_id: 'stud-102',
    route_id: '',
    pickup_stop: 'Swargate Bus Station'
  });
  const [showAddRouteModal, setShowAddRouteModal] = useState(false);
  const [routeForm, setRouteForm] = useState({
    route_number: 'Route-04',
    route_name: 'Hadapsar - Magarpatta - Campus',
    bus_number: 'MH-12-EQ-8899',
    driver_name: 'Suresh Shinde',
    driver_phone: '+91 98230 45678',
    total_seats: 45,
    fee_annual: 18000
  });

  // 3. Equipment State
  const [equipmentList, setEquipmentList] = useState([]);
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [equipmentForm, setEquipmentForm] = useState({
    item_code: 'COMP-LAB1-025',
    item_name: 'Dell Precision High-Performance Workstation',
    category: 'LAB_EQUIPMENT',
    department_id: 'dept-comp',
    room_or_lab: 'Advanced Computing Lab 1 (Room 304)',
    purchase_date: '2026-06-15',
    warranty_status: 'Under 3-Year OEM Warranty'
  });

  // 4. Maintenance State
  const [maintenanceTickets, setMaintenanceTickets] = useState([]);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    category: 'ELECTRICAL',
    title: '',
    description: '',
    location: '',
    priority: 'NORMAL'
  });
  const [selectedTicketToResolve, setSelectedTicketToResolve] = useState(null);
  const [resolveForm, setResolveForm] = useState({
    status: 'RESOLVED',
    assigned_technician: 'Ramesh Powar (Campus Electrician)',
    resolution_notes: 'Replaced faulty circuit breaker and tested voltage.'
  });

  useEffect(() => {
    if (activeTab === 'hostel') {
      loadHostel();
    } else if (activeTab === 'transport') {
      loadTransport();
    } else if (activeTab === 'equipment') {
      loadEquipment();
    } else if (activeTab === 'maintenance') {
      loadMaintenance();
    }
  }, [activeTab]);

  const loadHostel = async () => {
    setLoading(true);
    try {
      const [roomsRes, allocRes] = await Promise.all([
        api.campus.hostel.getRooms(),
        api.campus.hostel.getAllocations()
      ]);
      setHostelRooms(roomsRes.rooms || []);
      setHostelAllocations(allocRes.allocations || []);
    } catch (err) {
      console.error('Failed to load hostel data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTransport = async () => {
    setLoading(true);
    try {
      const [routesRes, allocRes] = await Promise.all([
        api.campus.transport.getRoutes(),
        api.campus.transport.getAllocations()
      ]);
      setTransportRoutes(routesRes.routes || []);
      setTransportAllocations(allocRes.allocations || []);
    } catch (err) {
      console.error('Failed to load transport data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEquipment = async () => {
    setLoading(true);
    try {
      const res = await api.campus.equipment.getAll();
      setEquipmentList(res.equipment || []);
    } catch (err) {
      console.error('Failed to load equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMaintenance = async () => {
    setLoading(true);
    try {
      const res = await api.campus.maintenance.getAll();
      setMaintenanceTickets(res.requests || []);
    } catch (err) {
      console.error('Failed to load maintenance tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  // Actions
  const handleAllocateHostel = async (e) => {
    e.preventDefault();
    try {
      await api.campus.hostel.allocate(hostelForm);
      alert('Hostel bed allocated successfully!');
      setShowAllocateHostelModal(false);
      loadHostel();
    } catch (err) {
      alert(`Allocation failed: ${err.message}`);
    }
  };

  const handleVacateHostel = async (allocId) => {
    if (!confirm('Are you sure you want to mark this hostel bed as VACATED?')) return;
    try {
      await api.campus.hostel.vacate(allocId);
      alert('Bed vacated successfully!');
      loadHostel();
    } catch (err) {
      alert(`Vacation failed: ${err.message}`);
    }
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    try {
      await api.campus.hostel.createRoom(roomForm);
      alert('Hostel room registered into campus inventory!');
      setShowAddRoomModal(false);
      loadHostel();
    } catch (err) {
      alert(`Error creating room: ${err.message}`);
    }
  };

  const handleAllocateTransport = async (e) => {
    e.preventDefault();
    try {
      await api.campus.transport.allocate(transportForm);
      alert('Bus pass allocated to student successfully!');
      setShowAllocateTransportModal(false);
      loadTransport();
    } catch (err) {
      alert(`Allocation failed: ${err.message}`);
    }
  };

  const handleAddRoute = async (e) => {
    e.preventDefault();
    try {
      await api.campus.transport.createRoute(routeForm);
      alert('New bus route registered!');
      setShowAddRouteModal(false);
      loadTransport();
    } catch (err) {
      alert(`Error creating route: ${err.message}`);
    }
  };

  const handleAddEquipment = async (e) => {
    e.preventDefault();
    try {
      await api.campus.equipment.create(equipmentForm);
      alert('Lab equipment logged into campus inventory!');
      setShowAddEquipmentModal(false);
      loadEquipment();
    } catch (err) {
      alert(`Error adding equipment: ${err.message}`);
    }
  };

  const handleUpdateCondition = async (eqId, condition) => {
    try {
      await api.campus.equipment.updateCondition(eqId, condition);
      alert(`Equipment condition updated to ${condition}`);
      loadEquipment();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const res = await api.campus.maintenance.create(ticketForm);
      alert(`Maintenance ticket ${res.request_no} registered successfully!`);
      setShowTicketModal(false);
      setTicketForm({ category: 'ELECTRICAL', title: '', description: '', location: '', priority: 'NORMAL' });
      loadMaintenance();
    } catch (err) {
      alert(`Ticket registration failed: ${err.message}`);
    }
  };

  const handleResolveTicket = async (e) => {
    e.preventDefault();
    if (!selectedTicketToResolve) return;
    try {
      await api.campus.maintenance.updateStatus(selectedTicketToResolve.id, resolveForm);
      alert('Maintenance ticket updated!');
      setSelectedTicketToResolve(null);
      loadMaintenance();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const isAdmin = ['SUPER_ADMIN', 'PRINCIPAL'].includes(user?.role);

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 className="text-primary" size={24} />
            Campus Operations & Facilities Management
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Hostel bed allocations, university transport routes, laboratory equipment inventory, and facilities maintenance tickets
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {activeTab === 'hostel' && isAdmin && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddRoomModal(true)}>
                <Plus size={14} />
                <span>Add Hostel Room</span>
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAllocateHostelModal(true)}>
                <UserCheck size={14} />
                <span>Allocate Hostel Bed</span>
              </button>
            </>
          )}

          {activeTab === 'transport' && isAdmin && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddRouteModal(true)}>
                <Plus size={14} />
                <span>Add Bus Route</span>
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAllocateTransportModal(true)}>
                <UserCheck size={14} />
                <span>Issue Bus Pass</span>
              </button>
            </>
          )}

          {activeTab === 'equipment' && ['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY'].includes(user?.role) && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddEquipmentModal(true)}>
              <Plus size={14} />
              <span>Log Equipment</span>
            </button>
          )}

          {activeTab === 'maintenance' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowTicketModal(true)}>
              <Wrench size={14} />
              <span>Raise Maintenance Ticket</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
        <button 
          className={`tab-btn ${activeTab === 'hostel' ? 'active' : ''}`} 
          onClick={() => setActiveTab('hostel')}
          style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'hostel' ? '2px solid var(--primary)' : 'none', fontWeight: 600, color: activeTab === 'hostel' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Hostel Residence Halls ({hostelAllocations.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'transport' ? 'active' : ''}`} 
          onClick={() => setActiveTab('transport')}
          style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'transport' ? '2px solid var(--primary)' : 'none', fontWeight: 600, color: activeTab === 'transport' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Transport Fleet & Routes ({transportRoutes.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'equipment' ? 'active' : ''}`} 
          onClick={() => setActiveTab('equipment')}
          style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'equipment' ? '2px solid var(--primary)' : 'none', fontWeight: 600, color: activeTab === 'equipment' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Equipment & Lab Inventory ({equipmentList.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'maintenance' ? 'active' : ''}`} 
          onClick={() => setActiveTab('maintenance')}
          style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === 'maintenance' ? '2px solid var(--primary)' : 'none', fontWeight: 600, color: activeTab === 'maintenance' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          Facilities Maintenance Tickets ({maintenanceTickets.length})
        </button>
      </div>

      {/* =========================================================================
          TAB 1: HOSTEL ALLOCATION
          ========================================================================= */}
      {activeTab === 'hostel' && (
        <div>
          {/* Hostel Rooms Grid */}
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>Residence Hall Rooms & Occupancy</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {hostelRooms.map(rm => (
              <div key={rm.id} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Room {rm.room_number} (Floor {rm.floor})</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rm.hostel_name}</span>
                  </div>
                  <span className={`badge ${rm.available_beds > 0 ? 'badge-success' : 'badge-danger'}`}>
                    {rm.available_beds > 0 ? `${rm.available_beds} Beds Left` : 'Full'}
                  </span>
                </div>

                <div style={{ background: 'var(--bg-muted)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Occupancy: <strong>{rm.occupied_count} / {rm.capacity}</strong></span>
                  <span>Fee: <strong>₹{rm.fee_per_semester.toLocaleString()}/sem</strong></span>
                </div>
              </div>
            ))}
          </div>

          {/* Active Allocations Table */}
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>Resident Student Bed Allocations</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>PRN / Roll No</th>
                  <th>Department</th>
                  <th>Hostel & Room</th>
                  <th>Bed Number</th>
                  <th>Allocated On</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {hostelAllocations.map(ha => (
                  <tr key={ha.id}>
                    <td><strong>{ha.student_name}</strong></td>
                    <td><code>{ha.prn}</code> (Roll: {ha.roll_no})</td>
                    <td>{ha.department_code}</td>
                    <td><strong>{ha.hostel_name}</strong> - Rm {ha.room_number}</td>
                    <td><span className="badge badge-info">{ha.bed_number}</span></td>
                    <td>{ha.allocated_at ? new Date(ha.allocated_at).toLocaleDateString() : 'Current Year'}</td>
                    <td>
                      <span className={`badge ${ha.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}`}>
                        {ha.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {ha.status === 'ACTIVE' && isAdmin && (
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleVacateHostel(ha.id)}
                        >
                          Vacate Bed
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {hostelAllocations.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No active hostel bed allocations.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: TRANSPORT ROUTES
          ========================================================================= */}
      {activeTab === 'transport' && (
        <div>
          {/* Fleet Routes Grid */}
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>University Bus Fleet & Routes</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {transportRoutes.map(tr => (
              <div key={tr.id} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span className="badge badge-info" style={{ fontWeight: 700 }}>{tr.route_number}</span>
                    <h4 style={{ margin: '4px 0 0 0', fontSize: '0.95rem', fontWeight: 700 }}>{tr.route_name}</h4>
                  </div>
                  <span className={`badge ${tr.available_seats > 0 ? 'badge-success' : 'badge-danger'}`}>
                    {tr.available_seats} Seats Left
                  </span>
                </div>

                <div style={{ background: 'var(--bg-muted)', padding: '10px 12px', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Bus Plate:</span>
                    <strong>{tr.bus_number}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Driver:</span>
                    <span>{tr.driver_name} ({tr.driver_phone})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Annual Fee:</span>
                    <strong>₹{tr.fee_annual.toLocaleString()}/yr</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Transport Allocations Table */}
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>Issued Student Bus Passes</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>PRN / Roll No</th>
                  <th>Route Number & Name</th>
                  <th>Boarding / Pickup Stop</th>
                  <th>Bus Number</th>
                  <th>Driver Contact</th>
                  <th>Pass Status</th>
                </tr>
              </thead>
              <tbody>
                {transportAllocations.map(ta => (
                  <tr key={ta.id}>
                    <td><strong>{ta.student_name}</strong></td>
                    <td><code>{ta.prn}</code> (Roll: {ta.roll_no})</td>
                    <td><strong>{ta.route_number}</strong>: {ta.route_name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} className="text-primary" />
                        <strong>{ta.pickup_stop}</strong>
                      </div>
                    </td>
                    <td><code>{ta.bus_number}</code></td>
                    <td>{ta.driver_name} ({ta.driver_phone})</td>
                    <td>
                      <span className="badge badge-success">{ta.status}</span>
                    </td>
                  </tr>
                ))}
                {transportAllocations.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No active transport passes issued yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: EQUIPMENT & LAB INVENTORY
          ========================================================================= */}
      {activeTab === 'equipment' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset Tag / Item Code</th>
                <th>Equipment Name</th>
                <th>Category</th>
                <th>Department</th>
                <th>Location / Lab</th>
                <th>Warranty Status</th>
                <th>Condition</th>
                <th style={{ textAlign: 'right' }}>Maintenance Action</th>
              </tr>
            </thead>
            <tbody>
              {equipmentList.map(eq => (
                <tr key={eq.id}>
                  <td><code>{eq.item_code}</code></td>
                  <td><strong>{eq.item_name}</strong></td>
                  <td><span className="badge badge-neutral">{eq.category}</span></td>
                  <td>{eq.department_code || 'General Campus'}</td>
                  <td>{eq.room_or_lab}</td>
                  <td>{eq.warranty_status || 'Active'}</td>
                  <td>
                    <span className={`badge ${
                      eq.condition === 'OPERATIONAL' ? 'badge-success' :
                      eq.condition === 'MAINTENANCE_REQUIRED' ? 'badge-danger' : 'badge-neutral'
                    }`}>
                      {eq.condition}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY'].includes(user?.role) && (
                      <select 
                        className="form-select"
                        style={{ width: 'auto', padding: '4px 8px', fontSize: '0.75rem' }}
                        value={eq.condition}
                        onChange={(e) => handleUpdateCondition(eq.id, e.target.value)}
                      >
                        <option value="OPERATIONAL">Operational</option>
                        <option value="MAINTENANCE_REQUIRED">Needs Maintenance</option>
                        <option value="DECOMMISSIONED">Decommissioned</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
              {equipmentList.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No laboratory equipment records in inventory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* =========================================================================
          TAB 4: FACILITIES MAINTENANCE TICKETS
          ========================================================================= */}
      {activeTab === 'maintenance' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket No</th>
                <th>Title & Category</th>
                <th>Location</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned Technician</th>
                <th>Raised By</th>
                <th style={{ textAlign: 'right' }}>Manage Ticket</th>
              </tr>
            </thead>
            <tbody>
              {maintenanceTickets.map(tk => (
                <tr key={tk.id}>
                  <td><code>{tk.request_no}</code></td>
                  <td>
                    <strong>{tk.title}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Category: <span className="badge badge-neutral" style={{ padding: '2px 6px' }}>{tk.category}</span>
                    </div>
                  </td>
                  <td>{tk.location}</td>
                  <td>
                    <span className={`badge ${
                      tk.priority === 'URGENT' ? 'badge-danger' :
                      tk.priority === 'HIGH' ? 'badge-warning' : 'badge-info'
                    }`}>
                      {tk.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${
                      tk.status === 'RESOLVED' ? 'badge-success' :
                      tk.status === 'IN_PROGRESS' || tk.status === 'ASSIGNED' ? 'badge-info' : 'badge-warning'
                    }`}>
                      {tk.status}
                    </span>
                  </td>
                  <td>{tk.assigned_technician || 'Unassigned'}</td>
                  <td>
                    <span>{tk.requested_by_name || 'Campus Staff'}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {isAdmin && tk.status !== 'RESOLVED' && (
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setSelectedTicketToResolve(tk);
                          setResolveForm({
                            status: 'RESOLVED',
                            assigned_technician: tk.assigned_technician || 'Campus Maintenance Team',
                            resolution_notes: 'Inspection performed and issue resolved.'
                          });
                        }}
                      >
                        <CheckCircle2 size={13} />
                        <span>Resolve Ticket</span>
                      </button>
                    )}
                    {tk.status === 'RESOLVED' && (
                      <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>Resolved ✓</span>
                    )}
                  </td>
                </tr>
              ))}
              {maintenanceTickets.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No maintenance tickets currently active. Campus operations are fully functional!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: ALLOCATE HOSTEL BED */}
      {showAllocateHostelModal && (
        <div className="modal-overlay" onClick={() => setShowAllocateHostelModal(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Allocate Hostel Residence Bed</h3>
              <button className="icon-btn" onClick={() => setShowAllocateHostelModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAllocateHostel}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Select Student:</label>
                <select 
                  className="form-select"
                  value={hostelForm.student_id}
                  onChange={e => setHostelForm({...hostelForm, student_id: e.target.value})}
                  required
                >
                  <option value="stud-101">Aarav Sharma (PRN: 2023COMP0045)</option>
                  <option value="stud-102">Rohan Verma (PRN: 2023COMP0078)</option>
                  <option value="stud-103">Ananya Iyer (PRN: 2023AIDS0012)</option>
                  <option value="stud-104">Diya Patel (PRN: 2023COMP0018)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Available Room:</label>
                <select 
                  className="form-select"
                  value={hostelForm.hostel_room_id}
                  onChange={e => setHostelForm({...hostelForm, hostel_room_id: e.target.value})}
                  required
                >
                  <option value="">-- Select Room with Vacancy --</option>
                  {hostelRooms.filter(r => r.available_beds > 0).map(r => (
                    <option key={r.id} value={r.id}>
                      {r.hostel_name} - Rm {r.room_number} ({r.available_beds} beds left)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Bed Identifier:</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={hostelForm.bed_number}
                  onChange={e => setHostelForm({...hostelForm, bed_number: e.target.value})}
                  placeholder="Bed-1 / Bed-2"
                  required
                />
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAllocateHostelModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Bed Allocation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD HOSTEL ROOM */}
      {showAddRoomModal && (
        <div className="modal-overlay" onClick={() => setShowAddRoomModal(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Add Residence Room</h3>
              <button className="icon-btn" onClick={() => setShowAddRoomModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddRoom}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Residence Hall Name:</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={roomForm.hostel_name}
                  onChange={e => setRoomForm({...roomForm, hostel_name: e.target.value})}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Room Number:</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={roomForm.room_number}
                    onChange={e => setRoomForm({...roomForm, room_number: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Floor Number:</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={roomForm.floor}
                    onChange={e => setRoomForm({...roomForm, floor: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Bed Capacity:</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={roomForm.capacity}
                    onChange={e => setRoomForm({...roomForm, capacity: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Semester Fee (₹):</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={roomForm.fee_per_semester}
                    onChange={e => setRoomForm({...roomForm, fee_per_semester: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddRoomModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ALLOCATE TRANSPORT PASS */}
      {showAllocateTransportModal && (
        <div className="modal-overlay" onClick={() => setShowAllocateTransportModal(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Issue University Bus Pass</h3>
              <button className="icon-btn" onClick={() => setShowAllocateTransportModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAllocateTransport}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Select Student:</label>
                <select 
                  className="form-select"
                  value={transportForm.student_id}
                  onChange={e => setTransportForm({...transportForm, student_id: e.target.value})}
                  required
                >
                  <option value="stud-101">Aarav Sharma (PRN: 2023COMP0045)</option>
                  <option value="stud-102">Rohan Verma (PRN: 2023COMP0078)</option>
                  <option value="stud-103">Ananya Iyer (PRN: 2023AIDS0012)</option>
                  <option value="stud-104">Diya Patel (PRN: 2023COMP0018)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Select Route:</label>
                <select 
                  className="form-select"
                  value={transportForm.route_id}
                  onChange={e => setTransportForm({...transportForm, route_id: e.target.value})}
                  required
                >
                  <option value="">-- Choose Bus Route --</option>
                  {transportRoutes.filter(r => r.available_seats > 0).map(r => (
                    <option key={r.id} value={r.id}>
                      {r.route_number}: {r.route_name} ({r.available_seats} seats left)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Boarding / Pickup Stop:</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={transportForm.pickup_stop}
                  onChange={e => setTransportForm({...transportForm, pickup_stop: e.target.value})}
                  placeholder="e.g. Swargate, Kothrud Stand, etc."
                  required
                />
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAllocateTransportModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Issue Bus Pass</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD BUS ROUTE */}
      {showAddRouteModal && (
        <div className="modal-overlay" onClick={() => setShowAddRouteModal(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Register Campus Bus Route</h3>
              <button className="icon-btn" onClick={() => setShowAddRouteModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddRoute}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Route No:</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={routeForm.route_number}
                    onChange={e => setRouteForm({...routeForm, route_number: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Route Name:</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={routeForm.route_name}
                    onChange={e => setRouteForm({...routeForm, route_name: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Bus Plate Number:</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={routeForm.bus_number}
                    onChange={e => setRouteForm({...routeForm, bus_number: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Seats:</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={routeForm.total_seats}
                    onChange={e => setRouteForm({...routeForm, total_seats: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Driver Name:</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={routeForm.driver_name}
                    onChange={e => setRouteForm({...routeForm, driver_name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Driver Contact:</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={routeForm.driver_phone}
                    onChange={e => setRouteForm({...routeForm, driver_phone: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddRouteModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Register Route</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD EQUIPMENT */}
      {showAddEquipmentModal && (
        <div className="modal-overlay" onClick={() => setShowAddEquipmentModal(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Log Lab Asset / Equipment</h3>
              <button className="icon-btn" onClick={() => setShowAddEquipmentModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddEquipment}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Asset Code:</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={equipmentForm.item_code}
                    onChange={e => setEquipmentForm({...equipmentForm, item_code: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Item / Equipment Name:</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={equipmentForm.item_name}
                    onChange={e => setEquipmentForm({...equipmentForm, item_name: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Category:</label>
                  <select 
                    className="form-select"
                    value={equipmentForm.category}
                    onChange={e => setEquipmentForm({...equipmentForm, category: e.target.value})}
                  >
                    <option value="LAB_EQUIPMENT">Lab Equipment</option>
                    <option value="COMPUTING">Computing Workstation</option>
                    <option value="AV_PROJECTOR">Smart Board / Projector</option>
                    <option value="FURNITURE">Lab Furniture</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Room / Laboratory:</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={equipmentForm.room_or_lab}
                    onChange={e => setEquipmentForm({...equipmentForm, room_or_lab: e.target.value})}
                    placeholder="Lab 304"
                    required
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Warranty / Service Status:</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={equipmentForm.warranty_status}
                  onChange={e => setEquipmentForm({...equipmentForm, warranty_status: e.target.value})}
                />
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddEquipmentModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RAISE MAINTENANCE TICKET */}
      {showTicketModal && (
        <div className="modal-overlay" onClick={() => setShowTicketModal(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Raise Campus Facilities Ticket</h3>
              <button className="icon-btn" onClick={() => setShowTicketModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateTicket}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Issue Summary / Title *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={ticketForm.title}
                  onChange={e => setTicketForm({...ticketForm, title: e.target.value})}
                  placeholder="e.g. Lab 2 AC Cooling Malfunction"
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Category:</label>
                  <select 
                    className="form-select"
                    value={ticketForm.category}
                    onChange={e => setTicketForm({...ticketForm, category: e.target.value})}
                  >
                    <option value="ELECTRICAL">Electrical</option>
                    <option value="PLUMBING">Plumbing</option>
                    <option value="HVAC">HVAC / Air Conditioning</option>
                    <option value="LAB_INFRA">Lab Infrastructure</option>
                    <option value="CIVIL">Civil Repairs</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority:</label>
                  <select 
                    className="form-select"
                    value={ticketForm.priority}
                    onChange={e => setTicketForm({...ticketForm, priority: e.target.value})}
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent (Immediate)</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Location (Block, Floor, Room No) *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={ticketForm.location}
                  onChange={e => setTicketForm({...ticketForm, location: e.target.value})}
                  placeholder="e.g. Academic Block B, 3rd Floor, Lab 302"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Description:</label>
                <textarea 
                  className="form-input" 
                  rows="3"
                  value={ticketForm.description}
                  onChange={e => setTicketForm({...ticketForm, description: e.target.value})}
                  placeholder="Provide additional details regarding the malfunction..."
                />
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTicketModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESOLVE TICKET */}
      {selectedTicketToResolve && (
        <div className="modal-overlay" onClick={() => setSelectedTicketToResolve(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Resolve Maintenance Ticket</h3>
              <button className="icon-btn" onClick={() => setSelectedTicketToResolve(null)}><X size={18} /></button>
            </div>
            <div style={{ background: 'var(--bg-muted)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
              <div><strong>Ticket No:</strong> {selectedTicketToResolve.request_no}</div>
              <div><strong>Title:</strong> {selectedTicketToResolve.title}</div>
              <div><strong>Location:</strong> {selectedTicketToResolve.location}</div>
            </div>
            <form onSubmit={handleResolveTicket}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Status Update:</label>
                <select 
                  className="form-select"
                  value={resolveForm.status}
                  onChange={e => setResolveForm({...resolveForm, status: e.target.value})}
                >
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Assigned Technician:</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={resolveForm.assigned_technician}
                  onChange={e => setResolveForm({...resolveForm, assigned_technician: e.target.value})}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Resolution Notes / Work Performed:</label>
                <textarea 
                  className="form-input" 
                  rows="3"
                  value={resolveForm.resolution_notes}
                  onChange={e => setResolveForm({...resolveForm, resolution_notes: e.target.value})}
                  required
                />
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedTicketToResolve(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Ticket Resolution</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
