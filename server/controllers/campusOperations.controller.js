const db = require('../db/database');

// ==========================================
// 1. HOSTEL MANAGEMENT
// ==========================================

exports.getHostelRooms = (req, res) => {
  try {
    const rooms = db.prepare(`
      SELECT hr.*,
             (hr.capacity - hr.occupied_count) as available_beds
      FROM hostel_rooms hr
      ORDER BY hr.hostel_name, hr.room_number
    `).all();
    res.json({ rooms });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch hostel rooms: ${err.message}` });
  }
};

exports.createHostelRoom = (req, res) => {
  try {
    const { hostel_name, room_number, floor, capacity = 3, fee_per_semester = 35000 } = req.body;
    if (!hostel_name || !room_number || floor === undefined) {
      return res.status(400).json({ error: 'hostel_name, room_number, and floor are required' });
    }

    const id = `rm-${Date.now()}`;
    db.prepare(`
      INSERT INTO hostel_rooms (id, hostel_name, room_number, floor, capacity, occupied_count, fee_per_semester)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(id, hostel_name, room_number, Number(floor), Number(capacity), Number(fee_per_semester));

    res.status(201).json({ success: true, message: 'Hostel room registered successfully', id });
  } catch (err) {
    res.status(500).json({ error: `Failed to create hostel room: ${err.message}` });
  }
};

exports.getHostelAllocations = (req, res) => {
  try {
    const allocations = db.prepare(`
      SELECT ha.*, hr.hostel_name, hr.room_number, hr.floor, hr.fee_per_semester,
             s.full_name as student_name, s.prn, s.roll_no, s.phone, s.gender,
             d.code as department_code
      FROM hostel_allocations ha
      JOIN hostel_rooms hr ON ha.hostel_room_id = hr.id
      JOIN students s ON ha.student_id = s.id
      JOIN departments d ON s.department_id = d.id
      ORDER BY ha.allocated_at DESC
    `).all();
    res.json({ allocations });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch hostel allocations: ${err.message}` });
  }
};

exports.allocateHostelBed = (req, res) => {
  try {
    const { student_id, hostel_room_id, bed_number } = req.body;
    if (!student_id || !hostel_room_id || !bed_number) {
      return res.status(400).json({ error: 'student_id, hostel_room_id, and bed_number are required' });
    }

    const room = db.prepare('SELECT * FROM hostel_rooms WHERE id = ?').get(hostel_room_id);
    if (!room) return res.status(404).json({ error: 'Hostel room not found' });
    if (room.occupied_count >= room.capacity) {
      return res.status(400).json({ error: 'Room is already at full capacity' });
    }

    const id = `halloc-${Date.now()}`;
    const ay = db.prepare('SELECT id FROM academic_years ORDER BY start_date DESC LIMIT 1').get();
    const ayId = ay ? ay.id : 'ay-2026-27';

    const tx = db.transaction(() => {
      const existing = db.prepare('SELECT * FROM hostel_allocations WHERE student_id = ?').get(student_id);
      if (existing) {
        if (existing.hostel_room_id !== hostel_room_id) {
          db.prepare('UPDATE hostel_rooms SET occupied_count = MAX(0, occupied_count - 1) WHERE id = ?').run(existing.hostel_room_id);
          db.prepare('UPDATE hostel_rooms SET occupied_count = occupied_count + 1 WHERE id = ?').run(hostel_room_id);
        }
        db.prepare(`
          UPDATE hostel_allocations
          SET hostel_room_id = ?, bed_number = ?, academic_year_id = ?, status = 'ACTIVE', allocated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(hostel_room_id, bed_number, ayId, existing.id);
      } else {
        db.prepare(`
          INSERT INTO hostel_allocations (id, student_id, hostel_room_id, bed_number, academic_year_id, status)
          VALUES (?, ?, ?, ?, ?, 'ACTIVE')
        `).run(id, student_id, hostel_room_id, bed_number, ayId);

        db.prepare('UPDATE hostel_rooms SET occupied_count = occupied_count + 1 WHERE id = ?').run(hostel_room_id);
      }
    });

    tx();
    res.status(201).json({ success: true, message: 'Hostel bed allocated successfully', id });
  } catch (err) {
    res.status(500).json({ error: `Allocation failed: ${err.message}` });
  }
};

exports.vacateHostelBed = (req, res) => {
  try {
    const { allocationId } = req.params;
    const alloc = db.prepare('SELECT * FROM hostel_allocations WHERE id = ?').get(allocationId);
    if (!alloc) return res.status(404).json({ error: 'Hostel allocation not found' });

    const tx = db.transaction(() => {
      db.prepare("UPDATE hostel_allocations SET status = 'VACATED' WHERE id = ?").run(allocationId);
      db.prepare('UPDATE hostel_rooms SET occupied_count = MAX(0, occupied_count - 1) WHERE id = ?').run(alloc.hostel_room_id);
    });

    tx();
    res.json({ success: true, message: 'Hostel bed vacated successfully' });
  } catch (err) {
    res.status(500).json({ error: `Vacation failed: ${err.message}` });
  }
};

// ==========================================
// 2. TRANSPORTATION ROUTES
// ==========================================

exports.getTransportRoutes = (req, res) => {
  try {
    const routes = db.prepare(`
      SELECT tr.*,
             (tr.total_seats - tr.occupied_seats) as available_seats
      FROM transport_routes tr
      ORDER BY tr.route_number ASC
    `).all();
    res.json({ routes });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch routes: ${err.message}` });
  }
};

exports.createTransportRoute = (req, res) => {
  try {
    const { route_number, route_name, bus_number, driver_name, driver_phone, total_seats = 45, fee_annual = 18000 } = req.body;
    if (!route_number || !route_name || !bus_number || !driver_name) {
      return res.status(400).json({ error: 'route_number, route_name, bus_number, and driver_name are required' });
    }

    const id = `route-${Date.now()}`;
    db.prepare(`
      INSERT INTO transport_routes (id, route_number, route_name, bus_number, driver_name, driver_phone, total_seats, fee_annual)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, route_number, route_name, bus_number, driver_name, driver_phone || '', Number(total_seats), Number(fee_annual));

    res.status(201).json({ success: true, message: 'Transport route registered successfully', id });
  } catch (err) {
    res.status(500).json({ error: `Failed to create transport route: ${err.message}` });
  }
};

exports.getTransportAllocations = (req, res) => {
  try {
    const allocations = db.prepare(`
      SELECT ta.*, tr.route_number, tr.route_name, tr.bus_number, tr.driver_name, tr.driver_phone,
             s.full_name as student_name, s.roll_no, s.prn, s.phone as student_phone,
             d.code as department_code
      FROM transport_allocations ta
      JOIN transport_routes tr ON ta.route_id = tr.id
      JOIN students s ON ta.student_id = s.id
      JOIN departments d ON s.department_id = d.id
      ORDER BY ta.allocated_at DESC
    `).all();
    res.json({ allocations });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch transport passes: ${err.message}` });
  }
};

exports.allocateTransport = (req, res) => {
  try {
    const { student_id, route_id, pickup_stop } = req.body;
    if (!student_id || !route_id || !pickup_stop) {
      return res.status(400).json({ error: 'student_id, route_id, and pickup_stop are required' });
    }

    const id = `talloc-${Date.now()}`;
    const tx = db.transaction(() => {
      const existing = db.prepare('SELECT * FROM transport_allocations WHERE student_id = ?').get(student_id);
      if (existing) {
        if (existing.route_id !== route_id) {
          db.prepare('UPDATE transport_routes SET occupied_seats = MAX(0, occupied_seats - 1) WHERE id = ?').run(existing.route_id);
          db.prepare('UPDATE transport_routes SET occupied_seats = occupied_seats + 1 WHERE id = ?').run(route_id);
        }
        db.prepare(`
          UPDATE transport_allocations
          SET route_id = ?, pickup_stop = ?, status = 'ACTIVE', allocated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(route_id, pickup_stop, existing.id);
      } else {
        db.prepare(`
          INSERT INTO transport_allocations (id, student_id, route_id, pickup_stop, status)
          VALUES (?, ?, ?, ?, 'ACTIVE')
        `).run(id, student_id, route_id, pickup_stop);

        db.prepare('UPDATE transport_routes SET occupied_seats = occupied_seats + 1 WHERE id = ?').run(route_id);
      }
    });

    tx();
    res.status(201).json({ success: true, message: 'Campus transport pass allocated successfully', id });
  } catch (err) {
    res.status(500).json({ error: `Transport allocation failed: ${err.message}` });
  }
};

// ==========================================
// 3. EQUIPMENT & LAB INVENTORY
// ==========================================

exports.getEquipment = (req, res) => {
  try {
    const { department_id, category, condition } = req.query;
    let query = `
      SELECT eq.*, d.name as department_name, d.code as department_code
      FROM equipment_inventory eq
      LEFT JOIN departments d ON eq.department_id = d.id
      WHERE 1=1
    `;
    const params = [];
    if (department_id) {
      query += ` AND eq.department_id = ?`;
      params.push(department_id);
    }
    if (category) {
      query += ` AND eq.category = ?`;
      params.push(category);
    }
    if (condition) {
      query += ` AND eq.condition = ?`;
      params.push(condition);
    }
    query += ` ORDER BY eq.item_code ASC`;

    const equipment = db.prepare(query).all(...params);
    res.json({ equipment });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch equipment: ${err.message}` });
  }
};

exports.createEquipment = (req, res) => {
  try {
    const { item_code, item_name, category = 'LAB_EQUIPMENT', department_id, room_or_lab, purchase_date, warranty_status } = req.body;
    if (!item_code || !item_name || !room_or_lab) {
      return res.status(400).json({ error: 'item_code, item_name, and room_or_lab are required' });
    }

    const id = `eq-${Date.now()}`;
    db.prepare(`
      INSERT INTO equipment_inventory (id, item_code, item_name, category, department_id, room_or_lab, purchase_date, warranty_status, condition)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPERATIONAL')
    `).run(id, item_code, item_name, category, department_id || null, room_or_lab, purchase_date || new Date().toISOString().split('T')[0], warranty_status || 'Active');

    res.status(201).json({ success: true, message: 'Equipment logged into inventory', id });
  } catch (err) {
    res.status(500).json({ error: `Failed to add equipment: ${err.message}` });
  }
};

exports.updateEquipmentCondition = (req, res) => {
  try {
    const { condition } = req.body;
    if (!['OPERATIONAL', 'MAINTENANCE_REQUIRED', 'DECOMMISSIONED'].includes(condition)) {
      return res.status(400).json({ error: 'Invalid condition value' });
    }

    db.prepare('UPDATE equipment_inventory SET condition = ? WHERE id = ?').run(condition, req.params.id);
    res.json({ success: true, message: `Equipment condition updated to ${condition}` });
  } catch (err) {
    res.status(500).json({ error: `Failed to update equipment: ${err.message}` });
  }
};

// ==========================================
// 4. FACILITIES MAINTENANCE REQUESTS
// ==========================================

exports.getMaintenanceRequests = (req, res) => {
  try {
    const { status, category } = req.query;
    let query = `
      SELECT m.*, u.full_name as requested_by_name, u.role as requester_role
      FROM maintenance_requests m
      LEFT JOIN users u ON m.requested_by_user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (status) {
      query += ` AND m.status = ?`;
      params.push(status);
    }
    if (category) {
      query += ` AND m.category = ?`;
      params.push(category);
    }
    query += ` ORDER BY CASE m.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END, m.created_at DESC`;

    const requests = db.prepare(query).all(...params);
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch maintenance requests: ${err.message}` });
  }
};

exports.createMaintenanceRequest = (req, res) => {
  try {
    const { category = 'ELECTRICAL', title, description, location, priority = 'NORMAL' } = req.body;
    if (!title || !location) {
      return res.status(400).json({ error: 'title and location are required' });
    }

    const count = db.prepare('SELECT COUNT(*) as c FROM maintenance_requests').get().c + 1;
    const request_no = `MR-2026-${String(count).padStart(4, '0')}`;
    const id = `mr-${Date.now()}`;

    db.prepare(`
      INSERT INTO maintenance_requests (id, request_no, category, title, description, location, priority, status, requested_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)
    `).run(id, request_no, category, title, description || '', location, priority, req.user?.id || 'usr-admin');

    res.status(201).json({ success: true, message: 'Maintenance ticket registered successfully', request_no, id });
  } catch (err) {
    res.status(500).json({ error: `Failed to create maintenance request: ${err.message}` });
  }
};

exports.updateMaintenanceStatus = (req, res) => {
  try {
    const { status, assigned_technician, resolution_notes } = req.body;
    if (!['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid maintenance status' });
    }

    db.prepare(`
      UPDATE maintenance_requests
      SET status = ?, assigned_technician = COALESCE(?, assigned_technician), resolution_notes = COALESCE(?, resolution_notes)
      WHERE id = ?
    `).run(status, assigned_technician, resolution_notes, req.params.id);

    res.json({ success: true, message: `Maintenance ticket status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: `Failed to update ticket: ${err.message}` });
  }
};
