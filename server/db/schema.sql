-- Next-Generation College ERP System Database Schema
-- Standardized for Higher Education & Indian Engineering Institutions
PRAGMA foreign_keys = ON;

-- 1. Institution Details
CREATE TABLE IF NOT EXISTS institutions (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    tagline TEXT,
    naac_grade TEXT DEFAULT 'A+',
    affiliation TEXT,
    aicte_approval TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    established_year INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Academic Departments
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    hod_name TEXT,
    hod_email TEXT,
    intake_capacity INTEGER DEFAULT 60,
    established_year INTEGER DEFAULT 2004,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Academic Years & Semesters
CREATE TABLE IF NOT EXISTS academic_years (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_current INTEGER DEFAULT 0,
    start_date DATE,
    end_date DATE
);

CREATE TABLE IF NOT EXISTS semesters (
    id TEXT PRIMARY KEY,
    academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
    number INTEGER NOT NULL,
    term TEXT NOT NULL CHECK(term IN ('Odd', 'Even')),
    is_active INTEGER DEFAULT 1
);

-- 4. Class Divisions / Batches
CREATE TABLE IF NOT EXISTS divisions (
    id TEXT PRIMARY KEY,
    department_id TEXT NOT NULL REFERENCES departments(id),
    semester_id TEXT NOT NULL REFERENCES semesters(id),
    name TEXT NOT NULL,
    class_teacher TEXT,
    room_number TEXT
);

-- 5. User Authentication & Unified Role Permissions
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK(role IN (
        'SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY', 
        'STUDENT', 'ACCOUNTANT', 'LIBRARIAN', 'PLACEMENT_OFFICER'
    )),
    department_id TEXT REFERENCES departments(id),
    phone TEXT,
    avatar_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Centralized Student Information System (SIS)
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE REFERENCES users(id),
    prn TEXT NOT NULL UNIQUE,
    roll_no TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    gender TEXT CHECK(gender IN ('Male', 'Female', 'Other')),
    dob DATE,
    category TEXT DEFAULT 'OPEN' CHECK(category IN ('OPEN', 'OBC', 'SC', 'ST', 'TFWS', 'EWS', 'MANAGEMENT')),
    department_id TEXT NOT NULL REFERENCES departments(id),
    semester_id TEXT NOT NULL REFERENCES semesters(id),
    division_id TEXT REFERENCES divisions(id),
    admission_year INTEGER NOT NULL,
    guardian_name TEXT,
    guardian_phone TEXT,
    guardian_email TEXT,
    guardian_relation TEXT,
    address TEXT,
    blood_group TEXT,
    abc_id TEXT, -- Academic Bank of Credits
    current_cgpa REAL DEFAULT 0.0,
    attendance_pct REAL DEFAULT 100.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Faculty & Staff Directory
CREATE TABLE IF NOT EXISTS faculty (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE REFERENCES users(id),
    emp_code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    designation TEXT NOT NULL,
    department_id TEXT NOT NULL REFERENCES departments(id),
    qualification TEXT,
    specialization TEXT,
    experience_years INTEGER DEFAULT 1,
    email TEXT NOT NULL,
    phone TEXT,
    joining_date DATE,
    weekly_workload_hours INTEGER DEFAULT 16,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Curriculum Courses / Subjects
CREATE TABLE IF NOT EXISTS courses_subjects (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    department_id TEXT NOT NULL REFERENCES departments(id),
    semester_id TEXT NOT NULL REFERENCES semesters(id),
    credits INTEGER DEFAULT 4,
    theory_hours INTEGER DEFAULT 3,
    practical_hours INTEGER DEFAULT 2,
    syllabus_modules INTEGER DEFAULT 6,
    syllabus_completed_pct REAL DEFAULT 0.0
);

-- 9. Subject Allocations to Faculty
CREATE TABLE IF NOT EXISTS subject_allocations (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES courses_subjects(id),
    faculty_id TEXT NOT NULL REFERENCES faculty(id),
    division_id TEXT NOT NULL REFERENCES divisions(id),
    academic_year_id TEXT NOT NULL REFERENCES academic_years(id)
);

-- 10. Weekly Timetables
CREATE TABLE IF NOT EXISTS timetables (
    id TEXT PRIMARY KEY,
    division_id TEXT NOT NULL REFERENCES divisions(id),
    day_of_week TEXT NOT NULL CHECK(day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
    time_slot TEXT NOT NULL,
    subject_id TEXT NOT NULL REFERENCES courses_subjects(id),
    faculty_id TEXT NOT NULL REFERENCES faculty(id),
    room_or_lab TEXT NOT NULL
);

-- 11. Attendance Sessions & Records (Dynamic QR & Anti-Replay Protected)
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES courses_subjects(id),
    faculty_id TEXT NOT NULL REFERENCES faculty(id),
    division_id TEXT NOT NULL REFERENCES divisions(id),
    session_date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    topic_covered TEXT,
    session_type TEXT DEFAULT 'Lecture' CHECK(session_type IN ('Lecture', 'Practical', 'Tutorial')),
    qr_token TEXT,
    qr_expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES students(id),
    status TEXT NOT NULL CHECK(status IN ('PRESENT', 'ABSENT', 'LATE')),
    marked_via TEXT DEFAULT 'MANUAL' CHECK(marked_via IN ('MANUAL', 'QR', 'BIOMETRIC')),
    marked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, student_id)
);

-- 12. Examination & Continuous Internal Evaluation (CIE)
CREATE TABLE IF NOT EXISTS examinations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
    semester_id TEXT NOT NULL REFERENCES semesters(id),
    exam_type TEXT NOT NULL CHECK(exam_type IN ('CIE_UT1', 'CIE_UT2', 'IN_SEM', 'END_SEM_THEORY', 'PRACTICAL_VIVA')),
    max_marks REAL NOT NULL,
    passing_marks REAL NOT NULL,
    exam_date DATE
);

CREATE TABLE IF NOT EXISTS marks_entries (
    id TEXT PRIMARY KEY,
    examination_id TEXT NOT NULL REFERENCES examinations(id),
    subject_id TEXT NOT NULL REFERENCES courses_subjects(id),
    student_id TEXT NOT NULL REFERENCES students(id),
    marks_obtained REAL NOT NULL,
    grade_letter TEXT,
    grade_point REAL,
    is_locked INTEGER DEFAULT 0,
    entered_by_faculty_id TEXT REFERENCES faculty(id),
    entered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(examination_id, subject_id, student_id)
);

-- 13. Fee Categories & Annual Fee Structure
CREATE TABLE IF NOT EXISTS fee_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS fee_structures (
    id TEXT PRIMARY KEY,
    academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
    department_id TEXT NOT NULL REFERENCES departments(id),
    fee_category_id TEXT NOT NULL REFERENCES fee_categories(id),
    tuition_fee REAL NOT NULL,
    development_fee REAL NOT NULL,
    exam_fee REAL DEFAULT 2500,
    gymkhana_library_fee REAL DEFAULT 3500,
    total_annual_fee REAL NOT NULL,
    UNIQUE(academic_year_id, department_id, fee_category_id)
);

-- 14. Student Fee Invoices & Payment Receipts
CREATE TABLE IF NOT EXISTS student_invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    student_id TEXT NOT NULL REFERENCES students(id),
    academic_year_id TEXT NOT NULL REFERENCES academic_years(id),
    total_amount REAL NOT NULL,
    concession_amount REAL DEFAULT 0,
    paid_amount REAL DEFAULT 0,
    balance_amount REAL NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('PAID', 'PARTIAL', 'PENDING')),
    due_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fee_payments (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES student_invoices(id),
    student_id TEXT NOT NULL REFERENCES students(id),
    receipt_number TEXT NOT NULL UNIQUE,
    amount REAL NOT NULL,
    payment_mode TEXT NOT NULL CHECK(payment_mode IN ('ONLINE_UPI', 'NET_BANKING', 'CARD', 'CHALLAN', 'DEMAND_DRAFT')),
    transaction_ref TEXT NOT NULL UNIQUE,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    received_by TEXT DEFAULT 'Online Gateway',
    status TEXT DEFAULT 'SUCCESS' CHECK(status IN ('SUCCESS', 'PENDING', 'FAILED'))
);

-- 15. Library Books & Circulation Desk
CREATE TABLE IF NOT EXISTS library_books (
    id TEXT PRIMARY KEY,
    isbn TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    publisher TEXT,
    edition TEXT,
    department_id TEXT REFERENCES departments(id),
    total_copies INTEGER DEFAULT 5,
    available_copies INTEGER DEFAULT 5,
    shelf_location TEXT,
    price REAL
);

CREATE TABLE IF NOT EXISTS book_issues (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES library_books(id),
    student_id TEXT NOT NULL REFERENCES students(id),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE,
    fine_amount REAL DEFAULT 0.0,
    status TEXT NOT NULL CHECK(status IN ('ISSUED', 'RETURNED', 'OVERDUE'))
);

-- 16. Training & Placement Cell (T&P)
CREATE TABLE IF NOT EXISTS placement_drives (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    logo_letter TEXT DEFAULT 'C',
    role_title TEXT NOT NULL,
    ctc_lpa REAL NOT NULL,
    job_location TEXT,
    min_cgpa REAL DEFAULT 6.5,
    eligible_departments TEXT, -- comma-separated e.g. "COMP,AIDS,ENTC"
    drive_date DATE NOT NULL,
    registration_deadline DATE NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('UPCOMING', 'ACTIVE', 'COMPLETED'))
);

CREATE TABLE IF NOT EXISTS placement_applications (
    id TEXT PRIMARY KEY,
    drive_id TEXT NOT NULL REFERENCES placement_drives(id),
    student_id TEXT NOT NULL REFERENCES students(id),
    applied_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'APPLIED' CHECK(status IN ('APPLIED', 'SHORTLISTED', 'TECHNICAL_ROUND', 'OFFERED', 'REJECTED')),
    offer_letter_url TEXT,
    UNIQUE(drive_id, student_id)
);

-- 17. Digital Student Service Desk & Certificate Requests
CREATE TABLE IF NOT EXISTS service_desk_tickets (
    id TEXT PRIMARY KEY,
    ticket_no TEXT NOT NULL UNIQUE,
    student_id TEXT NOT NULL REFERENCES students(id),
    category TEXT NOT NULL CHECK(category IN ('BONAFIDE_CERTIFICATE', 'LEAVING_CERTIFICATE', 'FEE_RECEIPT_CORRECTION', 'EXAM_QUERY', 'GRIEVANCE')),
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'NORMAL' CHECK(priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED')),
    assigned_to TEXT,
    resolution_notes TEXT,
    certificate_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 18. Early Academic Support & Warning System
CREATE TABLE IF NOT EXISTS early_warning_alerts (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id),
    risk_level TEXT NOT NULL CHECK(risk_level IN ('CRITICAL', 'MODERATE', 'LOW')),
    risk_factors TEXT NOT NULL, -- JSON formatted explanation e.g. {"attendance":62,"cie_score":35}
    recommended_action TEXT NOT NULL,
    mentor_faculty_id TEXT REFERENCES faculty(id),
    status TEXT DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'COUNSELED', 'RESOLVED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 19. NAAC & NBA Accreditation Quality Workspace
CREATE TABLE IF NOT EXISTS naac_criteria_evidence (
    id TEXT PRIMARY KEY,
    criterion_number INTEGER NOT NULL CHECK(criterion_number BETWEEN 1 AND 7),
    metric_code TEXT NOT NULL,
    metric_title TEXT NOT NULL,
    department_id TEXT REFERENCES departments(id),
    academic_year_id TEXT REFERENCES academic_years(id),
    status TEXT DEFAULT 'READY' CHECK(status IN ('READY', 'IN_REVIEW', 'SUBMITTED')),
    evidence_summary TEXT,
    documents_count INTEGER DEFAULT 1,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 20. Institutional Notices & Circulars
CREATE TABLE IF NOT EXISTS notices (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_audience TEXT DEFAULT 'ALL' CHECK(target_audience IN ('ALL', 'STUDENTS', 'FACULTY', 'HOD')),
    department_id TEXT REFERENCES departments(id),
    is_pinned INTEGER DEFAULT 0,
    category TEXT DEFAULT 'Academic',
    publish_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 21. System Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT DEFAULT '127.0.0.1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_students_dept_sem ON students(department_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_marks_student ON marks_entries(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_student ON student_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_tickets_student ON service_desk_tickets(student_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(created_at DESC);
