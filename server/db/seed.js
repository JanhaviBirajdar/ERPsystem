const bcrypt = require('bcryptjs');
const db = require('./database');

console.log('🌱 Seeding Next-Generation College ERP System database...');

const seed = () => {
  const salt = bcrypt.genSaltSync(10);
  const hash = (pwd) => bcrypt.hashSync(pwd, salt);

  const runTx = db.transaction(() => {
    // 1. Institution
    db.prepare('DELETE FROM institutions').run();
    db.prepare(`
      INSERT INTO institutions (id, code, name, tagline, naac_grade, affiliation, aicte_approval, address, phone, email, website, established_year)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'inst-ait',
      'AIT-PUNE',
      'Dr. APJ Abdul Kalam Institute of Technology',
      'Autonomous Engineering Institution | Approved by AICTE, New Delhi | Affiliated to State Technological University',
      'A++',
      'State Technological University (Autonomous Status)',
      'AICTE/WRO/1-42901844/2004',
      'Knowledge City Campus, Hinjawadi Infotech Park, Phase 1, Pune, Maharashtra 411057',
      '+91 20 2740 1200 / 2740 1201',
      'principal@aitpune.edu.in',
      'https://aitpune.edu.in',
      2004
    );

    // 2. Departments
    db.prepare('DELETE FROM departments').run();
    const depts = [
      ['dept-comp', 'COMP', 'Computer Engineering', 'Dr. Rajesh Sharma', 'hod.comp@aitpune.edu.in', 120, 2004],
      ['dept-aids', 'AIDS', 'Artificial Intelligence & Data Science', 'Dr. Sneha Kulkarni', 'hod.aids@aitpune.edu.in', 60, 2020],
      ['dept-entc', 'ENTC', 'Electronics & Telecommunication', 'Dr. Amit Patil', 'hod.entc@aitpune.edu.in', 60, 2004],
      ['dept-mech', 'MECH', 'Mechanical Engineering', 'Dr. Vikram Deshmukh', 'hod.mech@aitpune.edu.in', 60, 2004]
    ];
    const insertDept = db.prepare(`
      INSERT INTO departments (id, code, name, hod_name, hod_email, intake_capacity, established_year)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const d of depts) insertDept.run(...d);

    // 3. Academic Year & Semesters
    db.prepare('DELETE FROM academic_years').run();
    db.prepare('INSERT INTO academic_years (id, name, is_current, start_date, end_date) VALUES (?, ?, ?, ?, ?)').run(
      'ay-2026-27', '2026-2027', 1, '2026-07-01', '2027-06-30'
    );

    db.prepare('DELETE FROM semesters').run();
    const insertSem = db.prepare('INSERT INTO semesters (id, academic_year_id, number, term, is_active) VALUES (?, ?, ?, ?, ?)');
    for (let i = 1; i <= 8; i++) {
      insertSem.run(`sem-${i}`, 'ay-2026-27', i, i % 2 === 1 ? 'Odd' : 'Even', i === 5 ? 1 : 0);
    }

    // 4. Divisions
    db.prepare('DELETE FROM divisions').run();
    const insertDiv = db.prepare('INSERT INTO divisions (id, department_id, semester_id, name, class_teacher, room_number) VALUES (?, ?, ?, ?, ?, ?)');
    insertDiv.run('div-comp-5a', 'dept-comp', 'sem-5', 'Third Year Div A', 'Prof. Priya Mehta', 'LH-302');
    insertDiv.run('div-comp-5b', 'dept-comp', 'sem-5', 'Third Year Div B', 'Prof. Rohit Desai', 'LH-304');
    insertDiv.run('div-aids-5a', 'dept-aids', 'sem-5', 'Third Year Div A', 'Prof. Meenakshi Sundaram', 'LH-201');
    insertDiv.run('div-entc-5a', 'dept-entc', 'sem-5', 'Third Year Div A', 'Prof. Nilesh Ghorpade', 'LH-105');

    // 5. Users for all 8 Roles
    db.prepare('DELETE FROM users').run();
    const insertUser = db.prepare(`
      INSERT INTO users (id, username, password_hash, full_name, email, role, department_id, phone, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const usersData = [
      ['usr-admin', 'admin', hash('admin123'), 'Er. Sanjay Singhania', 'admin@aitpune.edu.in', 'SUPER_ADMIN', null, '+91 98220 11223', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'],
      ['usr-principal', 'principal', hash('principal123'), 'Dr. Anand M. Joshi', 'principal@aitpune.edu.in', 'PRINCIPAL', null, '+91 98220 22334', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'],
      ['usr-hod-comp', 'hod_comp', hash('hod123'), 'Dr. Rajesh Sharma', 'hod.comp@aitpune.edu.in', 'HOD', 'dept-comp', '+91 98220 33445', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'],
      ['usr-fac-mehta', 'faculty_mehta', hash('faculty123'), 'Prof. Priya Mehta', 'p.mehta@aitpune.edu.in', 'FACULTY', 'dept-comp', '+91 98220 44556', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'],
      ['usr-fac-desai', 'faculty_desai', hash('faculty123'), 'Prof. Rohit Desai', 'r.desai@aitpune.edu.in', 'FACULTY', 'dept-comp', '+91 98220 55667', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'],
      ['usr-stud-aarav', 'stud_aarav', hash('student123'), 'Aarav Sharma', 'aarav.sharma@aitpune.edu.in', 'STUDENT', 'dept-comp', '+91 98230 12345', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'],
      ['usr-stud-rohan', 'stud_rohan', hash('student123'), 'Rohan Verma', 'rohan.verma@aitpune.edu.in', 'STUDENT', 'dept-comp', '+91 98230 23456', 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150'],
      ['usr-stud-ananya', 'stud_ananya', hash('student123'), 'Ananya Iyer', 'ananya.iyer@aitpune.edu.in', 'STUDENT', 'dept-aids', '+91 98230 34567', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'],
      ['usr-accountant', 'accountant', hash('accountant123'), 'Suresh Kulkarni', 'accounts@aitpune.edu.in', 'ACCOUNTANT', null, '+91 98220 66778', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150'],
      ['usr-librarian', 'librarian', hash('librarian123'), 'Sunita Shinde', 'library@aitpune.edu.in', 'LIBRARIAN', null, '+91 98220 77889', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150'],
      ['usr-tpo', 'tpo', hash('tpo123'), 'Dr. Alok Mathur', 'placements@aitpune.edu.in', 'PLACEMENT_OFFICER', null, '+91 98220 88990', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150']
    ];
    for (const u of usersData) insertUser.run(...u);

    // 6. Faculty Directory
    db.prepare('DELETE FROM faculty').run();
    const insertFaculty = db.prepare(`
      INSERT INTO faculty (id, user_id, emp_code, full_name, designation, department_id, qualification, specialization, experience_years, email, phone, joining_date, weekly_workload_hours)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const facList = [
      ['fac-sharma', 'usr-hod-comp', 'FAC-CS-001', 'Dr. Rajesh Sharma', 'Professor & HOD', 'dept-comp', 'Ph.D (IIT Bombay), M.Tech (CSE)', 'Cloud Architecture & Distributed Computing', 18, 'hod.comp@aitpune.edu.in', '+91 98220 33445', '2010-06-15', 12],
      ['fac-mehta', 'usr-fac-mehta', 'FAC-CS-014', 'Prof. Priya Mehta', 'Associate Professor', 'dept-comp', 'Ph.D Pursuing, M.Tech (COEP)', 'Database Systems & Data Warehousing', 9, 'p.mehta@aitpune.edu.in', '+91 98220 44556', '2017-07-01', 16],
      ['fac-desai', 'usr-fac-desai', 'FAC-CS-019', 'Prof. Rohit Desai', 'Assistant Professor', 'dept-comp', 'M.E. (Computer Networks)', 'Computer Networks & Cybersecurity', 6, 'r.desai@aitpune.edu.in', '+91 98220 55667', '2020-01-10', 18],
      ['fac-kulkarni', null, 'FAC-AI-002', 'Dr. Sneha Kulkarni', 'Professor & HOD', 'dept-aids', 'Ph.D (IISc Bangalore)', 'Deep Learning & Natural Language Processing', 15, 'hod.aids@aitpune.edu.in', '+91 98220 99001', '2015-08-01', 12],
      ['fac-patil', null, 'FAC-ET-003', 'Dr. Amit Patil', 'Professor & HOD', 'dept-entc', 'Ph.D (IIT Madras)', 'Embedded Systems & IoT Devices', 16, 'hod.entc@aitpune.edu.in', '+91 98220 99002', '2012-07-15', 12],
      ['fac-deshmukh', null, 'FAC-ME-004', 'Dr. Vikram Deshmukh', 'Professor & HOD', 'dept-mech', 'Ph.D (IIT Roorkee)', 'Computational Fluid Dynamics & Robotics', 17, 'hod.mech@aitpune.edu.in', '+91 98220 99003', '2011-01-05', 12]
    ];
    for (const f of facList) insertFaculty.run(...f);

    // 7. Courses / Subjects for Sem 5 Computer Engg
    db.prepare('DELETE FROM courses_subjects').run();
    const insertSub = db.prepare(`
      INSERT INTO courses_subjects (id, code, name, department_id, semester_id, credits, theory_hours, practical_hours, syllabus_modules, syllabus_completed_pct)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const subjects = [
      ['sub-cs501', 'CS501', 'Database Management Systems', 'dept-comp', 'sem-5', 4, 3, 2, 6, 75.0],
      ['sub-cs502', 'CS502', 'Theory of Computation', 'dept-comp', 'sem-5', 4, 3, 0, 6, 68.0],
      ['sub-cs503', 'CS503', 'Computer Networks & Protocols', 'dept-comp', 'sem-5', 4, 3, 2, 6, 70.0],
      ['sub-cs504', 'CS504', 'Artificial Intelligence & Machine Learning', 'dept-comp', 'sem-5', 4, 3, 2, 6, 82.0],
      ['sub-cs505', 'CS505', 'Software Engineering & Agile Methodologies', 'dept-comp', 'sem-5', 3, 3, 0, 6, 85.0],
      ['sub-cs506', 'CS506', 'Full Stack Development Lab', 'dept-comp', 'sem-5', 2, 0, 4, 10, 80.0],
      ['sub-ai501', 'AI501', 'Machine Learning Foundations', 'dept-aids', 'sem-5', 4, 3, 2, 6, 78.0],
      ['sub-et501', 'ET501', 'Microcontrollers & Embedded Systems', 'dept-entc', 'sem-5', 4, 3, 2, 6, 72.0]
    ];
    for (const s of subjects) insertSub.run(...s);

    // 8. Students
    db.prepare('DELETE FROM students').run();
    const insertStudent = db.prepare(`
      INSERT INTO students (id, user_id, prn, roll_no, full_name, email, phone, gender, dob, category, department_id, semester_id, division_id, admission_year, guardian_name, guardian_phone, guardian_email, guardian_relation, address, blood_group, abc_id, current_cgpa, attendance_pct)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const studentsList = [
      ['stud-101', 'usr-stud-aarav', '2023COMP0045', '4201', 'Aarav Sharma', 'aarav.sharma@aitpune.edu.in', '+91 98230 12345', 'Male', '2004-04-14', 'OPEN', 'dept-comp', 'sem-5', 'div-comp-5a', 2023, 'Mukesh Sharma', '+91 98221 11223', 'm.sharma@gmail.com', 'Father', 'Plot 42, Baner Road, Pune 411045', 'B+', 'ABC-8921-4451-9012', 8.85, 89.5],
      ['stud-102', 'usr-stud-rohan', '2023COMP0078', '4202', 'Rohan Verma', 'rohan.verma@aitpune.edu.in', '+91 98230 23456', 'Male', '2004-09-22', 'OBC', 'dept-comp', 'sem-5', 'div-comp-5a', 2023, 'Ashok Verma', '+91 98221 22334', 'a.verma@gmail.com', 'Father', '14 Flat 302, Wakad, Pune 411057', 'O+', 'ABC-3321-7892-4411', 6.42, 62.4],
      ['stud-103', 'usr-stud-ananya', '2023AIDS0012', '4101', 'Ananya Iyer', 'ananya.iyer@aitpune.edu.in', '+91 98230 34567', 'Female', '2004-11-05', 'TFWS', 'dept-aids', 'sem-5', 'div-aids-5a', 2023, 'S. Ramaswamy Iyer', '+91 98221 33445', 's.iyer@gmail.com', 'Father', 'Tower 7, Blue Ridge, Hinjawadi Phase 1, Pune', 'A+', 'ABC-1122-3344-5566', 9.48, 94.2],
      ['stud-104', null, '2023COMP0018', '4203', 'Diya Patel', 'diya.patel@aitpune.edu.in', '+91 98230 45678', 'Female', '2004-02-18', 'OPEN', 'dept-comp', 'sem-5', 'div-comp-5a', 2023, 'Bhavin Patel', '+91 98221 44556', 'b.patel@gmail.com', 'Father', 'Kothrud, Pune 411038', 'O-', 'ABC-9988-7766-5544', 8.92, 91.0],
      ['stud-105', null, '2023COMP0099', '4204', 'Tanmay Deshpande', 'tanmay.d@aitpune.edu.in', '+91 98230 56789', 'Male', '2004-07-30', 'OPEN', 'dept-comp', 'sem-5', 'div-comp-5a', 2023, 'Sunil Deshpande', '+91 98221 55667', 's.deshpande@gmail.com', 'Father', 'Aundh, Pune 411007', 'AB+', 'ABC-4455-6677-8899', 7.75, 78.5],
      ['stud-106', null, '2023COMP0033', '4205', 'Pooja Gaikwad', 'pooja.g@aitpune.edu.in', '+91 98230 67890', 'Female', '2004-06-12', 'SC', 'dept-comp', 'sem-5', 'div-comp-5a', 2023, 'Dhananjay Gaikwad', '+91 98221 66778', 'd.gaikwad@gmail.com', 'Father', 'Pimpri, Pune 411018', 'B+', 'ABC-7711-2233-4455', 8.12, 85.0],
      ['stud-107', null, '2023COMP0054', '4206', 'Aditya Jadhav', 'aditya.j@aitpune.edu.in', '+91 98230 78901', 'Male', '2004-10-10', 'OBC', 'dept-comp', 'sem-5', 'div-comp-5a', 2023, 'Kishor Jadhav', '+91 98221 77889', 'k.jadhav@gmail.com', 'Father', 'Hadapsar, Pune 411028', 'O+', 'ABC-8822-4411-9900', 6.85, 68.0],
      ['stud-108', null, '2023COMP0082', '4207', 'Snehal Kute', 'snehal.kute@aitpune.edu.in', '+91 98230 89012', 'Female', '2004-12-01', 'OPEN', 'dept-comp', 'sem-5', 'div-comp-5a', 2023, 'Ganesh Kute', '+91 98221 88990', 'g.kute@gmail.com', 'Father', 'Bavdhan, Pune 411021', 'A+', 'ABC-3344-5566-7788', 9.15, 96.0],
      ['stud-109', null, '2023COMP0025', '4208', 'Kunal Shinde', 'kunal.s@aitpune.edu.in', '+91 98230 90123', 'Male', '2004-03-25', 'OPEN', 'dept-comp', 'sem-5', 'div-comp-5a', 2023, 'Ramesh Shinde', '+91 98221 99001', 'r.shinde@gmail.com', 'Father', 'Karve Nagar, Pune 411052', 'B-', 'ABC-2233-4455-6677', 7.45, 74.2],
      ['stud-110', null, '2023COMP0061', '4209', 'Isha Kulkarni', 'isha.k@aitpune.edu.in', '+91 98230 01234', 'Female', '2004-08-19', 'OPEN', 'dept-comp', 'sem-5', 'div-comp-5a', 2023, 'Milind Kulkarni', '+91 98221 00112', 'm.kulkarni@gmail.com', 'Father', 'Shivaji Nagar, Pune 411005', 'O+', 'ABC-6677-8899-0011', 8.60, 88.0]
    ];
    for (const s of studentsList) insertStudent.run(...s);

    // 9. Subject Allocations
    db.prepare('DELETE FROM subject_allocations').run();
    const insertAlloc = db.prepare('INSERT INTO subject_allocations (id, subject_id, faculty_id, division_id, academic_year_id) VALUES (?, ?, ?, ?, ?)');
    insertAlloc.run('alloc-1', 'sub-cs501', 'fac-mehta', 'div-comp-5a', 'ay-2026-27');
    insertAlloc.run('alloc-2', 'sub-cs502', 'fac-sharma', 'div-comp-5a', 'ay-2026-27');
    insertAlloc.run('alloc-3', 'sub-cs503', 'fac-desai', 'div-comp-5a', 'ay-2026-27');
    insertAlloc.run('alloc-4', 'sub-cs504', 'fac-mehta', 'div-comp-5a', 'ay-2026-27');
    insertAlloc.run('alloc-5', 'sub-cs505', 'fac-desai', 'div-comp-5a', 'ay-2026-27');
    insertAlloc.run('alloc-6', 'sub-cs506', 'fac-mehta', 'div-comp-5a', 'ay-2026-27');

    // 10. Timetables (Weekly Schedule for Div A)
    db.prepare('DELETE FROM timetables').run();
    const insertTt = db.prepare('INSERT INTO timetables (id, division_id, day_of_week, time_slot, subject_id, faculty_id, room_or_lab) VALUES (?, ?, ?, ?, ?, ?, ?)');
    
    const slots = [
      ['tt-m1', 'div-comp-5a', 'Monday', '09:00 - 10:00', 'sub-cs501', 'fac-mehta', 'LH-302'],
      ['tt-m2', 'div-comp-5a', 'Monday', '10:00 - 11:00', 'sub-cs502', 'fac-sharma', 'LH-302'],
      ['tt-m3', 'div-comp-5a', 'Monday', '11:15 - 12:15', 'sub-cs503', 'fac-desai', 'LH-302'],
      ['tt-m4', 'div-comp-5a', 'Monday', '13:00 - 15:00', 'sub-cs506', 'fac-mehta', 'Database Lab 2'],
      ['tt-t1', 'div-comp-5a', 'Tuesday', '09:00 - 10:00', 'sub-cs504', 'fac-mehta', 'LH-302'],
      ['tt-t2', 'div-comp-5a', 'Tuesday', '10:00 - 11:00', 'sub-cs501', 'fac-mehta', 'LH-302'],
      ['tt-t3', 'div-comp-5a', 'Tuesday', '11:15 - 12:15', 'sub-cs505', 'fac-desai', 'LH-302'],
      ['tt-t4', 'div-comp-5a', 'Tuesday', '13:00 - 14:00', 'sub-cs502', 'fac-sharma', 'LH-302'],
      ['tt-w1', 'div-comp-5a', 'Wednesday', '09:00 - 10:00', 'sub-cs503', 'fac-desai', 'LH-302'],
      ['tt-w2', 'div-comp-5a', 'Wednesday', '10:00 - 11:00', 'sub-cs504', 'fac-mehta', 'LH-302'],
      ['tt-w3', 'div-comp-5a', 'Wednesday', '11:15 - 12:15', 'sub-cs501', 'fac-mehta', 'LH-302'],
      ['tt-w4', 'div-comp-5a', 'Wednesday', '13:00 - 15:00', 'sub-cs503', 'fac-desai', 'Networks Lab 1'],
      ['tt-th1', 'div-comp-5a', 'Thursday', '09:00 - 10:00', 'sub-cs505', 'fac-desai', 'LH-302'],
      ['tt-th2', 'div-comp-5a', 'Thursday', '10:00 - 11:00', 'sub-cs502', 'fac-sharma', 'LH-302'],
      ['tt-th3', 'div-comp-5a', 'Thursday', '11:15 - 12:15', 'sub-cs504', 'fac-mehta', 'LH-302'],
      ['tt-f1', 'div-comp-5a', 'Friday', '09:00 - 10:00', 'sub-cs501', 'fac-mehta', 'LH-302'],
      ['tt-f2', 'div-comp-5a', 'Friday', '10:00 - 11:00', 'sub-cs503', 'fac-desai', 'LH-302'],
      ['tt-f3', 'div-comp-5a', 'Friday', '11:15 - 12:15', 'sub-cs505', 'fac-desai', 'LH-302']
    ];
    for (const slot of slots) insertTt.run(...slot);

    // 11. Attendance Sessions & Records
    db.prepare('DELETE FROM attendance_sessions').run();
    db.prepare('DELETE FROM attendance_records').run();

    const insertSession = db.prepare(`
      INSERT INTO attendance_sessions (id, subject_id, faculty_id, division_id, session_date, time_slot, topic_covered, session_type, qr_token, qr_expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAttRec = db.prepare(`
      INSERT INTO attendance_records (id, session_id, student_id, status, marked_via, marked_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Past 4 sessions
    const sampleSessions = [
      ['att-ses-1', 'sub-cs501', 'fac-mehta', 'div-comp-5a', '2026-10-15', '09:00 - 10:00', 'Relational Algebra & Normalization 3NF/BCNF', 'Lecture', null, null],
      ['att-ses-2', 'sub-cs502', 'fac-sharma', 'div-comp-5a', '2026-10-16', '10:00 - 11:00', 'Context Free Grammars & Pushdown Automata', 'Lecture', null, null],
      ['att-ses-3', 'sub-cs503', 'fac-desai', 'div-comp-5a', '2026-10-19', '11:15 - 12:15', 'TCP Congestion Control & Flow Control Algorithms', 'Lecture', null, null],
      ['att-ses-4', 'sub-cs501', 'fac-mehta', 'div-comp-5a', '2026-10-21', '09:00 - 10:00', 'ACID Properties and Transaction Serializability', 'Lecture', 'SECURE-QR-TOKEN-AITPUNE-984321', '2026-10-21 17:00:00']
    ];

    for (const ses of sampleSessions) {
      insertSession.run(...ses);
      // Mark attendance for all students in Div A
      for (const st of studentsList) {
        const studentId = st[0];
        // Rohan Verma has attendance issues
        let status = 'PRESENT';
        if (studentId === 'stud-102' && (ses[0] === 'att-ses-1' || ses[0] === 'att-ses-3')) {
          status = 'ABSENT';
        } else if (studentId === 'stud-107' && ses[0] === 'att-ses-2') {
          status = 'ABSENT';
        } else if (studentId === 'stud-109' && ses[0] === 'att-ses-1') {
          status = 'ABSENT';
        }
        insertAttRec.run(`rec-${ses[0]}-${studentId}`, ses[0], studentId, status, ses[8] ? 'QR' : 'MANUAL', `${ses[4]} 09:12:00`);
      }
    }

    // 12. Examinations & CIE Marks
    db.prepare('DELETE FROM examinations').run();
    db.prepare('DELETE FROM marks_entries').run();

    const insertExam = db.prepare('INSERT INTO examinations (id, name, academic_year_id, semester_id, exam_type, max_marks, passing_marks, exam_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    insertExam.run('exam-cie1', 'Continuous Internal Evaluation (Unit Test 1)', 'ay-2026-27', 'sem-5', 'CIE_UT1', 30, 12, '2026-08-25');
    insertExam.run('exam-cie2', 'Continuous Internal Evaluation (Unit Test 2)', 'ay-2026-27', 'sem-5', 'CIE_UT2', 30, 12, '2026-09-28');
    insertExam.run('exam-insem', 'Mid-Semester Examination', 'ay-2026-27', 'sem-5', 'IN_SEM', 50, 20, '2026-10-10');

    const insertMarks = db.prepare(`
      INSERT INTO marks_entries (id, examination_id, subject_id, student_id, marks_obtained, grade_letter, grade_point, is_locked, entered_by_faculty_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Marks for CIE 1 for all students across 3 core subjects
    const marksData = [
      ['stud-101', 'sub-cs501', 27, 'A+', 9.0],
      ['stud-101', 'sub-cs502', 26, 'A', 8.5],
      ['stud-101', 'sub-cs503', 28, 'O', 10.0],
      ['stud-102', 'sub-cs501', 14, 'C', 5.0], // Low score candidate
      ['stud-102', 'sub-cs502', 11, 'F', 0.0], // Failed CIE
      ['stud-102', 'sub-cs503', 15, 'C', 5.0],
      ['stud-103', 'sub-cs501', 29, 'O', 10.0],
      ['stud-104', 'sub-cs501', 28, 'O', 10.0],
      ['stud-105', 'sub-cs501', 22, 'B+', 7.0],
      ['stud-106', 'sub-cs501', 25, 'A', 8.0],
      ['stud-107', 'sub-cs501', 18, 'B', 6.0],
      ['stud-108', 'sub-cs501', 30, 'O', 10.0],
      ['stud-109', 'sub-cs501', 20, 'B', 6.0],
      ['stud-110', 'sub-cs501', 26, 'A', 8.5]
    ];

    for (const m of marksData) {
      insertMarks.run(`mk-${m[0]}-${m[1]}`, 'exam-cie1', m[1], m[0], m[2], m[3], m[4], 1, 'fac-mehta');
    }

    // 13. Fee Categories & Annual Fee Structures
    db.prepare('DELETE FROM fee_categories').run();
    db.prepare('DELETE FROM fee_structures').run();

    const insertFeeCat = db.prepare('INSERT INTO fee_categories (id, name, description) VALUES (?, ?, ?)');
    insertFeeCat.run('cat-open', 'OPEN / General Quota', 'Full fees as approved by Shikshan Shulka Samiti (FRA)');
    insertFeeCat.run('cat-obc', 'OBC Category', '50% Tuition Fee Concession under State Welfare');
    insertFeeCat.run('cat-scst', 'SC / ST Category', '100% Tuition Fee Waiver under Social Justice Dept');
    insertFeeCat.run('cat-tfws', 'TFWS (Tuition Fee Waiver Scheme)', 'Tuition Fee 100% waived by AICTE Merit Allocation');

    const insertFeeStruct = db.prepare(`
      INSERT INTO fee_structures (id, academic_year_id, department_id, fee_category_id, tuition_fee, development_fee, exam_fee, gymkhana_library_fee, total_annual_fee)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Standard fee structures for Engineering
    insertFeeStruct.run('fs-comp-open', 'ay-2026-27', 'dept-comp', 'cat-open', 115000, 16000, 2500, 3500, 137000);
    insertFeeStruct.run('fs-comp-obc', 'ay-2026-27', 'dept-comp', 'cat-obc', 57500, 16000, 2500, 3500, 79500);
    insertFeeStruct.run('fs-comp-scst', 'ay-2026-27', 'dept-comp', 'cat-scst', 0, 16000, 2500, 3500, 22000);
    insertFeeStruct.run('fs-comp-tfws', 'ay-2026-27', 'dept-comp', 'cat-tfws', 0, 16000, 2500, 3500, 22000);

    // 14. Student Fee Invoices & Payment Receipts
    db.prepare('DELETE FROM student_invoices').run();
    db.prepare('DELETE FROM fee_payments').run();

    const insertInv = db.prepare(`
      INSERT INTO student_invoices (id, invoice_number, student_id, academic_year_id, total_amount, concession_amount, paid_amount, balance_amount, status, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertPay = db.prepare(`
      INSERT INTO fee_payments (id, invoice_id, student_id, receipt_number, amount, payment_mode, transaction_ref, payment_date, received_by, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Aarav: Paid in full
    insertInv.run('inv-101', 'INV-2026-0045', 'stud-101', 'ay-2026-27', 137000, 0, 137000, 0, 'PAID', '2026-08-15');
    insertPay.run('pay-101-1', 'inv-101', 'stud-101', 'REC-2026-0451', 137000, 'ONLINE_UPI', 'UPI/20260810/HDFC889021', '2026-08-10 14:22:00', 'Razorpay Gateway', 'SUCCESS');

    // Rohan Verma: Partial fee pending
    insertInv.run('inv-102', 'INV-2026-0078', 'stud-102', 'ay-2026-27', 79500, 0, 40000, 39500, 'PARTIAL', '2026-08-15');
    insertPay.run('pay-102-1', 'inv-102', 'stud-102', 'REC-2026-0781', 40000, 'NET_BANKING', 'NEFT/SBI/20260812/99812', '2026-08-12 11:05:00', 'State Bank of India Gateway', 'SUCCESS');

    // Ananya: TFWS Paid in full
    insertInv.run('inv-103', 'INV-2026-0012', 'stud-103', 'ay-2026-27', 22000, 0, 22000, 0, 'PAID', '2026-08-15');
    insertPay.run('pay-103-1', 'inv-103', 'stud-103', 'REC-2026-0121', 22000, 'ONLINE_UPI', 'UPI/20260805/ICICI44129', '2026-08-05 16:45:00', 'Razorpay Gateway', 'SUCCESS');

    // Diya Patel: Paid in full
    insertInv.run('inv-104', 'INV-2026-0018', 'stud-104', 'ay-2026-27', 137000, 0, 137000, 0, 'PAID', '2026-08-15');
    insertPay.run('pay-104-1', 'inv-104', 'stud-104', 'REC-2026-0181', 137000, 'CARD', 'CARD/AXIS/20260811/88711', '2026-08-11 12:10:00', 'Axis Bank POS', 'SUCCESS');

    // Tanmay: Pending dues
    insertInv.run('inv-105', 'INV-2026-0099', 'stud-105', 'ay-2026-27', 137000, 0, 70000, 67000, 'PARTIAL', '2026-08-15');
    insertPay.run('pay-105-1', 'inv-105', 'stud-105', 'REC-2026-0991', 70000, 'ONLINE_UPI', 'UPI/20260814/PAYTM7712', '2026-08-14 10:30:00', 'Paytm Gateway', 'SUCCESS');

    // 15. Library Books & Active Loans
    db.prepare('DELETE FROM library_books').run();
    db.prepare('DELETE FROM book_issues').run();

    const insertBook = db.prepare(`
      INSERT INTO library_books (id, isbn, title, author, publisher, edition, department_id, total_copies, available_copies, shelf_location, price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const books = [
      ['bk-1', '978-0131103627', 'Database System Concepts', 'Abraham Silberschatz, Henry F. Korth', 'McGraw Hill', '7th Edition', 'dept-comp', 15, 12, 'Rack C-04', 850],
      ['bk-2', '978-0132126953', 'Computer Networks: A Systems Approach', 'Larry L. Peterson, Bruce S. Davie', 'Morgan Kaufmann', '5th Edition', 'dept-comp', 12, 9, 'Rack C-07', 920],
      ['bk-3', '978-0262033848', 'Introduction to Algorithms (CLRS)', 'Thomas H. Cormen, Charles E. Leiserson', 'MIT Press', '3rd Edition', 'dept-comp', 20, 16, 'Rack C-01', 1250],
      ['bk-4', '978-0136042594', 'Artificial Intelligence: A Modern Approach', 'Stuart Russell, Peter Norvig', 'Pearson', '4th Edition', 'dept-aids', 14, 11, 'Rack A-02', 1100],
      ['bk-5', '978-0078022128', 'Software Engineering: A Practitioner Approach', 'Roger S. Pressman', 'McGraw Hill', '9th Edition', 'dept-comp', 10, 8, 'Rack C-09', 780]
    ];
    for (const b of books) insertBook.run(...b);

    const insertIssue = db.prepare(`
      INSERT INTO book_issues (id, book_id, student_id, issue_date, due_date, return_date, fine_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertIssue.run('iss-1', 'bk-1', 'stud-101', '2026-10-05', '2026-10-25', null, 0.0, 'ISSUED');
    insertIssue.run('iss-2', 'bk-3', 'stud-101', '2026-09-10', '2026-09-30', '2026-09-29', 0.0, 'RETURNED');
    insertIssue.run('iss-3', 'bk-2', 'stud-102', '2026-09-15', '2026-10-05', null, 80.0, 'OVERDUE'); // Overdue loan with fine
    insertIssue.run('iss-4', 'bk-4', 'stud-103', '2026-10-10', '2026-10-30', null, 0.0, 'ISSUED');

    // 16. Training & Placement Drives
    db.prepare('DELETE FROM placement_drives').run();
    db.prepare('DELETE FROM placement_applications').run();

    const insertDrive = db.prepare(`
      INSERT INTO placement_drives (id, company_name, logo_letter, role_title, ctc_lpa, job_location, min_cgpa, eligible_departments, drive_date, registration_deadline, description, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertDrive.run(
      'drive-tcs',
      'Tata Consultancy Services (TCS Digital & Prime)',
      'T',
      'Systems Engineer & Digital Software Architect',
      9.0,
      'Pune / Bengaluru / Hyderabad',
      7.0,
      'COMP,AIDS,ENTC',
      '2026-11-05',
      '2026-10-28',
      'National qualifier test for premier digital positions. Assessment includes advanced coding, cognitive, and system design rounds.',
      'ACTIVE'
    );

    insertDrive.run(
      'drive-google',
      'Google India',
      'G',
      'Associate Software Engineer Intern (2027 Batch)',
      32.0,
      'Bengaluru / Hyderabad',
      8.5,
      'COMP,AIDS',
      '2026-11-18',
      '2026-11-02',
      'Core engineering role for high-scale distributed systems, machine learning pipelines, and cloud native services.',
      'UPCOMING'
    );

    insertDrive.run(
      'drive-infosys',
      'Infosys Limited (Specialist Programmer)',
      'I',
      'Specialist Programmer (SP)',
      9.5,
      'Pune / Mysore / Chennai',
      7.5,
      'COMP,AIDS,ENTC',
      '2026-10-29',
      '2026-10-22',
      'Elite coding profile focusing on modern full-stack development, cloud microservices, and AI integrations.',
      'ACTIVE'
    );

    insertDrive.run(
      'drive-cognizant',
      'Cognizant Technology Solutions',
      'C',
      'GenC Next Software Engineer',
      6.75,
      'Pune / Mumbai / Kolkata',
      6.5,
      'COMP,AIDS,ENTC,MECH',
      '2026-11-25',
      '2026-11-15',
      'Full-stack engineering and cloud infrastructure development across enterprise applications.',
      'UPCOMING'
    );

    const insertApp = db.prepare(`
      INSERT INTO placement_applications (id, drive_id, student_id, applied_date, status, offer_letter_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertApp.run('app-1', 'drive-tcs', 'stud-101', '2026-10-15 11:30:00', 'SHORTLISTED', null);
    insertApp.run('app-2', 'drive-infosys', 'stud-101', '2026-10-16 14:20:00', 'OFFERED', 'https://aitpune.edu.in/placements/offers/INFY-2026-45.pdf');
    insertApp.run('app-3', 'drive-tcs', 'stud-103', '2026-10-14 09:15:00', 'TECHNICAL_ROUND', null);
    insertApp.run('app-4', 'drive-google', 'stud-103', '2026-10-18 10:00:00', 'APPLIED', null);

    // 17. Digital Service Desk & Bonafide Certificate Requests
    db.prepare('DELETE FROM service_desk_tickets').run();
    const insertTicket = db.prepare(`
      INSERT INTO service_desk_tickets (id, ticket_no, student_id, category, title, description, priority, status, assigned_to, resolution_notes, certificate_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTicket.run(
      'tck-1',
      'TCK-2026-0041',
      'stud-101',
      'BONAFIDE_CERTIFICATE',
      'Bonafide Certificate Request for Passport Application',
      'Need an official digital Bonafide Certificate stating currently studying in Third Year Computer Engineering for Regional Passport Office, Pune.',
      'NORMAL',
      'APPROVED',
      'Academic Registrar Office',
      'Digital certificate generated and verified. QR verification hash attached.',
      'AIT-BONAFIDE-2026-PRN2023COMP0045-VERIFIED-98317'
    );

    insertTicket.run(
      'tck-2',
      'TCK-2026-0082',
      'stud-102',
      'FEE_RECEIPT_CORRECTION',
      'NEFT Transaction Receipt update in Portal',
      'Submitted partial fee of Rs. 40,000 on 12-Aug-2026 via NEFT. Kindly verify the bank reference and adjust the updated fee ledger.',
      'HIGH',
      'IN_PROGRESS',
      'Accounts Department (Suresh Kulkarni)',
      'Bank statement verified. Adjusting ledger balance in portal.',
      null
    );

    insertTicket.run(
      'tck-3',
      'TCK-2026-0105',
      'stud-103',
      'EXAM_QUERY',
      'Revaluation Request for End-Sem Sem 4 Applied Mathematics',
      'Requesting photostat copy and marks verification for Sem 4 End-Sem Theory Examination.',
      'NORMAL',
      'PENDING',
      'Examination Cell (Prof. S. R. Rao)',
      null,
      null
    );

    // 18. Early Academic Support & Warning System
    db.prepare('DELETE FROM early_warning_alerts').run();
    const insertAlert = db.prepare(`
      INSERT INTO early_warning_alerts (id, student_id, risk_level, risk_factors, recommended_action, mentor_faculty_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertAlert.run(
      'alt-1',
      'stud-102',
      'CRITICAL',
      JSON.stringify({
        attendance_pct: 62.4,
        shortage_subjects: ['CS502 Theory of Computation (58%)', 'CS503 Networks (60%)'],
        failed_cie_exams: ['CIE 1 Theory of Computation (11/30 - Below Passing 12)'],
        pending_fee_dues: 39500
      }),
      'Immediate faculty mentoring session required. Recommend remedial lectures on Automata theory, weekly attendance log check, and intimation letter to guardian.',
      'fac-sharma',
      'OPEN'
    );

    insertAlert.run(
      'alt-2',
      'stud-107',
      'MODERATE',
      JSON.stringify({
        attendance_pct: 68.0,
        shortage_subjects: ['CS501 Database Management Systems (65%)'],
        failed_cie_exams: [],
        pending_fee_dues: 0
      }),
      'Student missed 4 consecutive sessions due to medical sickness. Provide compensatory lab practical slots and lecture notes.',
      'fac-mehta',
      'COUNSELED'
    );

    // 19. NAAC & NBA Accreditation Quality Workspace
    db.prepare('DELETE FROM naac_criteria_evidence').run();
    const insertNaac = db.prepare(`
      INSERT INTO naac_criteria_evidence (id, criterion_number, metric_code, metric_title, department_id, academic_year_id, status, evidence_summary, documents_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertNaac.run('naac-1', 1, '1.1.1', 'Curriculum Design & Planning aligned with NEP 2020 and Industry 4.0 Standards', 'dept-comp', 'ay-2026-27', 'READY', 'Board of Studies (BoS) minutes, syllabus copies, stakeholder feedback analysis, and Program Outcomes (PO/PSO) mapping matrices.', 8);
    insertNaac.run('naac-2', 2, '2.2.1', 'Student-Full-Time Teacher Ratio and Experiential Learning Pedagogy', 'dept-comp', 'ay-2026-27', 'READY', '1:15 faculty-to-student cadre ratio maintained. Project-based learning reports, flipped classroom recordings, and industry hackathon participation logs.', 12);
    insertNaac.run('naac-3', 3, '3.1.2', 'Grants for Research Projects, Patents, and Scopus/WoS Indexed Publications', 'dept-comp', 'ay-2026-27', 'IN_REVIEW', '4 patent publications filed in 2026. 18 Scopus indexed papers by faculty members. AICTE MODROBS grant of Rs. 14 Lakhs for AI & IoT Research Lab.', 6);
    insertNaac.run('naac-4', 5, '5.2.1', 'Placement Percentage of Outgoing Students and Progression to Higher Education', 'dept-comp', 'ay-2026-27', 'READY', '88.4% campus placement in reputed MNCs. Average CTC Rs. 7.8 LPA. Highest package Rs. 32 LPA. GATE/GRE score cards of 14 students.', 15);
    insertNaac.run('naac-5', 6, '6.3.2', 'Financial Support for Faculty Attending Conferences / FDP Workshops', 'dept-comp', 'ay-2026-27', 'SUBMITTED', 'Institutional audit statements, sanction letters, and participation certificates for IEEE and ACM international conferences.', 9);

    // 20. Notices & Circulars
    db.prepare('DELETE FROM notices').run();
    const insertNotice = db.prepare(`
      INSERT INTO notices (id, title, content, target_audience, department_id, is_pinned, category, publish_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertNotice.run(
      'not-1',
      'Mandatory 75% Attendance Requirement for Semester 5 University Examinations',
      'All students are hereby notified that as per University Ordinance 119 and AICTE guidelines, minimum 75% attendance in theory and practicals is compulsory to appear for the End-Semester Examination. Students with attendance shortage must meet their respective Class Teacher and HOD before 28th October 2026.',
      'STUDENTS',
      'dept-comp',
      1,
      'Academic Notice',
      '2026-10-18'
    );

    insertNotice.run(
      'not-2',
      'TCS National Qualifier Test (NQT) & Placement Drive 2026-27 Announced',
      'Training and Placement Cell cordially invites eligible final and pre-final year students to register for the upcoming TCS Digital recruitment drive. Last date for registration on the college portal is 28th October 2026, 17:00 IST.',
      'STUDENTS',
      null,
      1,
      'Placement Drive',
      '2026-10-19'
    );

    insertNotice.run(
      'not-3',
      'Faculty Research Grant Proposals for AICTE & DST-SERB Scheme',
      'Faculty members interested in submitting R&D grant proposals under AICTE Research Promotion Scheme (RPS) are requested to submit draft synopses to the Dean (R&D) by 5th November 2026.',
      'FACULTY',
      null,
      0,
      'Research & Grants',
      '2026-10-20'
    );

    // 21. System Audit Logs
    db.prepare('DELETE FROM audit_logs').run();
    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_role, action, entity_type, entity_id, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertAudit.run('aud-1', 'usr-admin', 'SUPER_ADMIN', 'SYSTEM_INITIALIZATION', 'DATABASE', 'ALL', 'Complete ERP system initial configuration, schema generation and academic calendar setup.', '192.168.1.10', '2026-10-21 08:00:00');
    insertAudit.run('aud-2', 'usr-fac-mehta', 'FACULTY', 'MARKS_LOCK', 'EXAMINATION', 'exam-cie1', 'Continuous Internal Evaluation (Unit Test 1) marks locked and submitted for CS501 Div A.', '192.168.1.45', '2026-10-21 09:30:00');
    insertAudit.run('aud-3', 'usr-accountant', 'ACCOUNTANT', 'FEE_RECEIPT_ISSUE', 'PAYMENT', 'pay-101-1', 'Fee receipt REC-2026-0451 issued for Student Aarav Sharma (PRN 2023COMP0045) Rs 137000.', '192.168.1.22', '2026-10-21 11:15:00');
    insertAudit.run('aud-4', 'usr-principal', 'PRINCIPAL', 'CERTIFICATE_APPROVAL', 'SERVICE_DESK', 'tck-1', 'Bonafide Certificate approved with digital verification hash AIT-BONAFIDE-2026-PRN2023COMP0045-VERIFIED-98317.', '192.168.1.15', '2026-10-21 14:00:00');

  });

  runTx();
  console.log('✅ Database seeded successfully with realistic Indian College ERP data!');
};

seed();
