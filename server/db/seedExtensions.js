const db = require('./database');

const seedExtensions = () => {
  try {
    const appsCount = db.prepare('SELECT COUNT(*) as c FROM admissions_applications').get().c;
    if (appsCount === 0) {
      console.log('🌱 Seeding Admissions Applications...');
      const apps = [
        {
          id: 'adm-001',
          application_no: 'APP-2026-0001',
          candidate_name: 'Ananya Deshmukh',
          email: 'ananya.deshmukh@gmail.com',
          phone: '+91 98231 44512',
          category: 'OPEN',
          entrance_exam: 'MHT-CET',
          entrance_score: 96.85,
          entrance_rank: 2450,
          department_id: 'dept-comp',
          tenth_pct: 92.4,
          twelfth_pct: 88.6,
          status: 'APPROVED',
          verification_notes: 'All original certificates verified. Eligible under State Merit Quota.',
          documents_json: JSON.stringify([
            { name: '10th Marksheet', verified: true },
            { name: '12th Marksheet', verified: true },
            { name: 'MHT-CET Scorecard', verified: true },
            { name: 'Domicile / Nationality Certificate', verified: true }
          ])
        },
        {
          id: 'adm-002',
          application_no: 'APP-2026-0002',
          candidate_name: 'Rohit Kulkarni',
          email: 'rohit.kulkarni@gmail.com',
          phone: '+91 97654 88321',
          category: 'OBC',
          entrance_exam: 'MHT-CET',
          entrance_score: 91.20,
          entrance_rank: 5120,
          department_id: 'dept-aids',
          tenth_pct: 85.0,
          twelfth_pct: 81.4,
          status: 'DOCS_VERIFIED',
          verification_notes: 'Non-creamy layer certificate valid till March 2027.',
          documents_json: JSON.stringify([
            { name: '10th Marksheet', verified: true },
            { name: '12th Marksheet', verified: true },
            { name: 'MHT-CET Scorecard', verified: true },
            { name: 'Domicile / Nationality Certificate', verified: true },
            { name: 'Caste & Non-Creamy Layer Certificate', verified: true }
          ])
        },
        {
          id: 'adm-003',
          application_no: 'APP-2026-0003',
          candidate_name: 'Siddharth Pawar',
          email: 'siddharth.pawar@yahoo.com',
          phone: '+91 98220 91823',
          category: 'SC',
          entrance_exam: 'JEE_MAIN',
          entrance_score: 87.50,
          entrance_rank: 12400,
          department_id: 'dept-mech',
          tenth_pct: 80.2,
          twelfth_pct: 76.5,
          status: 'ELIGIBLE',
          verification_notes: 'Eligible for CAP round 2 seat allotment.',
          documents_json: JSON.stringify([
            { name: '10th Marksheet', verified: true },
            { name: '12th Marksheet', verified: true },
            { name: 'JEE_MAIN Scorecard', verified: true },
            { name: 'Domicile / Nationality Certificate', verified: true },
            { name: 'Caste & Non-Creamy Layer Certificate', verified: true }
          ])
        },
        {
          id: 'adm-004',
          application_no: 'APP-2026-0004',
          candidate_name: 'Tanvi Shinde',
          email: 'tanvi.shinde@gmail.com',
          phone: '+91 94220 12345',
          category: 'TFWS',
          entrance_exam: 'MHT-CET',
          entrance_score: 98.15,
          entrance_rank: 1120,
          department_id: 'dept-comp',
          tenth_pct: 95.0,
          twelfth_pct: 93.2,
          status: 'APPLIED',
          verification_notes: 'Pending income certificate verification for Tuition Fee Waiver Scheme.',
          documents_json: JSON.stringify([
            { name: '10th Marksheet', verified: true },
            { name: '12th Marksheet', verified: false },
            { name: 'MHT-CET Scorecard', verified: true },
            { name: 'Domicile / Nationality Certificate', verified: false }
          ])
        }
      ];

      const stmt = db.prepare(`
        INSERT INTO admissions_applications (
          id, application_no, candidate_name, email, phone, category,
          entrance_exam, entrance_score, entrance_rank, department_id,
          tenth_pct, twelfth_pct, status, verification_notes, documents_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const a of apps) {
        stmt.run(
          a.id, a.application_no, a.candidate_name, a.email, a.phone, a.category,
          a.entrance_exam, a.entrance_score, a.entrance_rank, a.department_id,
          a.tenth_pct, a.twelfth_pct, a.status, a.verification_notes, a.documents_json
        );
      }
    }

    // Faculty Leaves
    const leavesCount = db.prepare('SELECT COUNT(*) as c FROM faculty_leaves').get().c;
    if (leavesCount === 0) {
      console.log('🌱 Seeding Faculty Leaves...');
      const fac = db.prepare('SELECT id FROM faculty LIMIT 2').all();
      if (fac.length >= 2) {
        db.prepare(`
          INSERT INTO faculty_leaves (id, faculty_id, leave_type, start_date, end_date, days_count, reason, status)
          VALUES ('lv-001', ?, 'CASUAL', '2026-11-02', '2026-11-03', 2, 'Attending IEEE International Conference at IIT Bombay', 'APPROVED')
        `).run(fac[0].id);

        db.prepare(`
          INSERT INTO faculty_leaves (id, faculty_id, leave_type, start_date, end_date, days_count, reason, status)
          VALUES ('lv-002', ?, 'DUTY', '2026-11-05', '2026-11-06', 2, 'External University Practical Examiner duty', 'PENDING')
        `).run(fac[1].id);
      }
    }

    // Exam Schedules
    const schedCount = db.prepare('SELECT COUNT(*) as c FROM exam_schedules').get().c;
    if (schedCount === 0) {
      console.log('🌱 Seeding Exam Schedules & Revaluation...');
      const exam = db.prepare('SELECT id FROM examinations LIMIT 1').get();
      const subjects = db.prepare('SELECT id FROM courses_subjects LIMIT 2').all();
      const faculty = db.prepare('SELECT id FROM faculty LIMIT 1').get();

      if (exam && subjects.length >= 2) {
        db.prepare(`
          INSERT INTO exam_schedules (id, examination_id, subject_id, exam_date, start_time, end_time, room_allocation, max_marks, passing_marks, invigilator_faculty_id)
          VALUES ('sched-001', ?, ?, '2026-11-10', '10:00 AM', '01:00 PM', 'Hall 101, 102', 100, 40, ?)
        `).run(exam.id, subjects[0].id, faculty ? faculty.id : null);

        db.prepare(`
          INSERT INTO exam_schedules (id, examination_id, subject_id, exam_date, start_time, end_time, room_allocation, max_marks, passing_marks, invigilator_faculty_id)
          VALUES ('sched-002', ?, ?, '2026-11-12', '10:00 AM', '01:00 PM', 'Hall 103, 104', 100, 40, ?)
        `).run(exam.id, subjects[1].id, faculty ? faculty.id : null);
      }

      // Revaluation request
      const markEntry = db.prepare('SELECT * FROM marks_entries LIMIT 1').get();
      if (markEntry) {
        db.prepare(`
          INSERT INTO revaluation_requests (id, marks_entry_id, student_id, examination_id, subject_id, original_marks, status, reason)
          VALUES ('rev-001', ?, ?, ?, ?, ?, 'SUBMITTED', 'Requesting recheck for Question 4 Numerical derivation.')
        `).run(markEntry.id, markEntry.student_id, markEntry.examination_id, markEntry.subject_id, markEntry.marks_obtained);
      }
    }

    // Assignments and Academic Resources
    const asgnCount = db.prepare('SELECT COUNT(*) as c FROM assignments').get().c;
    if (asgnCount === 0) {
      console.log('🌱 Seeding Assignments and Study Resources...');
      const sub = db.prepare('SELECT id FROM courses_subjects LIMIT 1').get();
      const div = db.prepare('SELECT id FROM divisions LIMIT 1').get();
      const fac = db.prepare('SELECT id FROM faculty LIMIT 1').get();
      const stud = db.prepare('SELECT id FROM students LIMIT 1').get();

      if (sub && div) {
        db.prepare(`
          INSERT INTO assignments (id, title, description, subject_id, division_id, faculty_id, max_marks, due_date, attachment_url)
          VALUES ('asgn-001', 'Assignment 1: B-Tree & Red-Black Tree Implementation', 'Implement balanced search trees with insert and delete operation benchmarks.', ?, ?, ?, 25, date('now', '+7 days'), 'https://drive.google.com/sample-spec.pdf')
        `).run(sub.id, div.id, fac ? fac.id : null);

        if (stud) {
          db.prepare(`
            INSERT INTO assignment_submissions (id, assignment_id, student_id, submission_text, file_url, marks_obtained, feedback, status)
            VALUES ('subm-001', 'asgn-001', ?, 'Implemented Red-Black Tree with rotation balancing in C++. Source code and plots attached.', 'https://github.com/sample/tree-impl', 23.5, 'Excellent code structure and proper rotation case handling.', 'GRADED')
          `).run(stud.id);
        }

        db.prepare(`
          INSERT INTO academic_resources (id, title, subject_id, module_number, resource_type, file_url, file_size_kb, uploaded_by)
          VALUES ('res-001', 'Module 3: Advanced Tree Structures & Hashing Lecture Notes', ?, 3, 'LECTURE_NOTES', 'https://drive.google.com/sample-notes.pdf', 3420, ?)
        `).run(sub.id, fac ? fac.id : null);

        db.prepare(`
          INSERT INTO academic_resources (id, title, subject_id, module_number, resource_type, file_url, file_size_kb, uploaded_by)
          VALUES ('res-002', 'Unit Test 1 Question Bank with Model Solutions', ?, 1, 'QUESTION_BANK', 'https://drive.google.com/sample-qbank.pdf', 1850, ?)
        `).run(sub.id, fac ? fac.id : null);
      }
    }

    // Library Reservations
    const resvCount = db.prepare('SELECT COUNT(*) as c FROM library_reservations').get().c;
    if (resvCount === 0) {
      console.log('🌱 Seeding Library Reservations...');
      const bk = db.prepare('SELECT id FROM library_books LIMIT 1').get();
      const st = db.prepare('SELECT id FROM students LIMIT 1').get();
      if (bk && st) {
        db.prepare(`
          INSERT INTO library_reservations (id, book_id, student_id, status)
          VALUES ('resv-001', ?, ?, 'QUEUED')
        `).run(bk.id, st.id);
      }
    }

    // Placement Interviews
    const intvCount = db.prepare('SELECT COUNT(*) as c FROM placement_interviews').get().c;
    if (intvCount === 0) {
      console.log('🌱 Seeding Placement Interviews...');
      const app = db.prepare('SELECT * FROM placement_applications LIMIT 1').get();
      if (app) {
        db.prepare(`
          INSERT INTO placement_interviews (id, application_id, drive_id, student_id, round_name, scheduled_time, venue_or_link, status, feedback)
          VALUES ('intv-001', ?, ?, ?, 'TECHNICAL_ROUND_1', datetime('now', '+2 days'), 'Google Meet / Lab 304', 'SCHEDULED', 'Review DSA and System Design')
        `).run(app.id, app.drive_id, app.student_id);
      }
    }

    // Campus Operations: Hostel, Transport, Equipment, Maintenance
    const hostelCount = db.prepare('SELECT COUNT(*) as c FROM hostel_rooms').get().c;
    if (hostelCount === 0) {
      console.log('🌱 Seeding Campus Operations: Hostel, Transport, Equipment...');
      db.prepare(`
        INSERT INTO hostel_rooms (id, hostel_name, room_number, floor, capacity, occupied_count, fee_per_semester)
        VALUES ('rm-101', 'Sahyadri Boys Hostel', 'B-101', 1, 3, 1, 35000),
               ('rm-102', 'Sahyadri Boys Hostel', 'B-102', 1, 3, 0, 35000),
               ('rm-201', 'Kaveri Girls Hostel', 'G-201', 2, 2, 1, 38000)
      `).run();

      const student1 = db.prepare('SELECT id FROM students LIMIT 1 OFFSET 0').get();
      const student2 = db.prepare('SELECT id FROM students LIMIT 1 OFFSET 1').get();
      const ay = db.prepare('SELECT id FROM academic_years LIMIT 1').get();
      const ayId = ay ? ay.id : 'ay-2026-27';

      if (student1) {
        db.prepare(`
          INSERT INTO hostel_allocations (id, student_id, hostel_room_id, bed_number, academic_year_id, status)
          VALUES ('ha-001', ?, 'rm-101', 'Bed 1', ?, 'ACTIVE')
        `).run(student1.id, ayId);
      }

      // Transport
      db.prepare(`
        INSERT INTO transport_routes (id, route_number, route_name, bus_number, driver_name, driver_phone, total_seats, occupied_seats, fee_annual)
        VALUES ('tr-01', 'Route 12', 'Swargate - Hadapsar - Campus Express', 'MH-12-RN-8842', 'Dnyaneshwar Shinde', '+91 98221 00412', 45, 1, 18000),
               ('tr-02', 'Route 07', 'Kothrud - Karve Nagar - Campus Express', 'MH-12-RN-9914', 'Ramesh Patil', '+91 98222 11523', 45, 0, 18000)
      `).run();

      if (student2) {
        db.prepare(`
          INSERT INTO transport_allocations (id, student_id, route_id, pickup_stop, status)
          VALUES ('ta-001', ?, 'tr-01', 'Hadapsar Flyover Stop', 'ACTIVE')
        `).run(student2.id);
      }

      // Equipment
      db.prepare(`
        INSERT INTO equipment_inventory (id, item_code, item_name, category, department_id, room_or_lab, purchase_date, warranty_status, condition)
        VALUES ('eq-001', 'LAB-DS-01', 'Digital Storage Oscilloscope 100MHz (Tektronix)', 'LAB_EQUIPMENT', 'dept-entc', 'Embedded Systems Lab 204', '2024-03-15', 'Active', 'OPERATIONAL'),
               ('eq-002', 'IT-WS-42', 'Dell OptiPlex Core i7 Workstation 32GB RAM', 'IT_HARDWARE', 'dept-comp', 'Advanced AI & Cloud Lab', '2024-07-20', 'Active', 'OPERATIONAL'),
               ('eq-003', 'AV-PRJ-08', 'Epson 4K Laser Projection System', 'AUDIO_VISUAL', 'dept-comp', 'Seminar Hall 1', '2023-11-10', 'Expired', 'MAINTENANCE_REQUIRED')
      `).run();

      // Maintenance Requests
      db.prepare(`
        INSERT INTO maintenance_requests (id, request_no, category, title, description, location, priority, status, assigned_technician)
        VALUES ('mr-001', 'MR-2026-0001', 'ELECTRICAL', 'Air Conditioner Servicing & Thermostat Sensor Calibration', 'Split AC unit in AI Lab not cooling effectively. Requires filter cleaning and gas pressure check.', 'Lab 304, Computer Dept', 'HIGH', 'IN_PROGRESS', 'Santosh Pawar (HVAC Specialist)'),
               ('mr-002', 'MR-2026-0002', 'IT_NETWORK', 'Ethernet Switch Port 16-24 Packet Loss in High Speed Lab', 'Network switch experiencing intermittent drops affecting online assessment terminals.', 'Computer Center Ground Floor', 'URGENT', 'ASSIGNED', 'Rajesh Verma (Network Engineer)')
      `).run();
    }
  } catch (err) {
    console.error('Error seeding extensions:', err);
  }
};

module.exports = { seedExtensions };
