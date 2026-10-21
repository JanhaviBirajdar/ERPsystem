const bcrypt = require('bcryptjs');
const { getCollection, createObjectId } = require('../config/database');

const seedMultiTenant = async () => {
  console.log('🌱 Seeding Multi-Tenant MERN College ERP SaaS Environment...');

  const institutions = getCollection('institutions');
  const users = getCollection('users');
  const academicYears = getCollection('academic_years');
  const departments = getCollection('departments');
  const courses = getCollection('courses');
  const semesters = getCollection('semesters');
  const divisions = getCollection('divisions');
  const auditLogs = getCollection('audit_logs');

  // Clear existing collections
  await institutions.deleteMany({});
  await users.deleteMany({});
  await academicYears.deleteMany({});
  await departments.deleteMany({});
  await courses.deleteMany({});
  await semesters.deleteMany({});
  await divisions.deleteMany({});
  await auditLogs.deleteMany({});

  const hash = (pwd) => bcrypt.hashSync(pwd, 10);

  // -------------------------------------------------------------------
  // 0. SaaS Platform Super Admin (Cross-Tenant System Owner)
  // -------------------------------------------------------------------
  await users.insertOne({
    _id: createObjectId(),
    tenantId: null,
    username: 'saas_admin',
    email: 'superadmin@campuserp.io',
    passwordHash: hash('superadmin123'),
    role: 'SUPER_ADMIN',
    fullName: 'SaaS Platform Owner',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'
  });

  // -------------------------------------------------------------------
  // 1. College 1: Dr. APJ Abdul Kalam Institute of Technology (AIT Pune)
  // -------------------------------------------------------------------
  const aitId = '64f9a0011111111111111111';
  await institutions.insertOne({
    _id: aitId,
    tenantCode: 'AITPUNE',
    name: 'Dr. APJ Abdul Kalam Institute of Technology',
    subdomain: 'ait',
    affiliation: 'State Technological University',
    naacGrade: 'A++',
    aicteApprovalNo: 'AICTE/WRO/1-42901844/2004',
    contact: {
      email: 'principal@aitpune.edu.in',
      phone: '+91 20 2740 1200',
      address: 'Knowledge City, Hinjawadi Infotech Park, Pune 411057'
    },
    subscription: { plan: 'ENTERPRISE', status: 'ACTIVE' }
  });

  // AIT Academic Year
  const aitYearId = '64f9ay011111111111111111';
  await academicYears.insertOne({
    _id: aitYearId,
    tenantId: aitId,
    name: '2026-2027',
    isCurrent: true,
    startDate: new Date('2026-07-01'),
    endDate: new Date('2027-06-30')
  });

  // AIT Semesters
  const aitSem5Id = '64f9sem51111111111111111';
  for (let i = 1; i <= 8; i++) {
    await semesters.insertOne({
      _id: i === 5 ? aitSem5Id : createObjectId(),
      tenantId: aitId,
      academicYearId: aitYearId,
      number: i,
      term: i % 2 === 1 ? 'ODD' : 'EVEN',
      isActive: i === 5
    });
  }

  // AIT Departments
  const aitDeptCompId = '64f9dc011111111111111111';
  const aitDeptAidsId = '64f9da011111111111111111';
  await departments.insertOne({
    _id: aitDeptCompId,
    tenantId: aitId,
    code: 'COMP',
    name: 'Computer Engineering',
    hodName: 'Dr. Rajesh Sharma',
    hodEmail: 'hod.comp@aitpune.edu.in',
    intakeCapacity: 120,
    establishedYear: 2004
  });
  await departments.insertOne({
    _id: aitDeptAidsId,
    tenantId: aitId,
    code: 'AIDS',
    name: 'Artificial Intelligence & Data Science',
    hodName: 'Dr. Sneha Kulkarni',
    hodEmail: 'hod.aids@aitpune.edu.in',
    intakeCapacity: 60,
    establishedYear: 2020
  });

  // AIT Courses / Subjects
  await courses.insertOne({
    _id: createObjectId(),
    tenantId: aitId,
    code: 'CS501',
    name: 'Database Management Systems',
    departmentId: aitDeptCompId,
    semesterId: aitSem5Id,
    credits: 4,
    theoryHours: 3,
    practicalHours: 2,
    syllabusModules: 6
  });
  await courses.insertOne({
    _id: createObjectId(),
    tenantId: aitId,
    code: 'CS502',
    name: 'Theory of Computation',
    departmentId: aitDeptCompId,
    semesterId: aitSem5Id,
    credits: 4,
    theoryHours: 3,
    practicalHours: 0,
    syllabusModules: 6
  });

  // AIT Divisions
  await divisions.insertOne({
    _id: createObjectId(),
    tenantId: aitId,
    departmentId: aitDeptCompId,
    semesterId: aitSem5Id,
    name: 'Third Year Div A',
    classTeacher: 'Prof. Priya Mehta',
    roomNumber: 'LH-302'
  });

  // AIT Staff Accounts
  await users.insertOne({
    _id: createObjectId(),
    tenantId: aitId,
    username: 'admin_ait',
    email: 'admin@aitpune.edu.in',
    passwordHash: hash('admin123'),
    role: 'COLLEGE_ADMIN',
    fullName: 'Er. Sanjay Singhania (AIT Admin)',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'
  });
  await users.insertOne({
    _id: createObjectId(),
    tenantId: aitId,
    username: 'principal_ait',
    email: 'principal@aitpune.edu.in',
    passwordHash: hash('principal123'),
    role: 'PRINCIPAL',
    fullName: 'Dr. Anand M. Joshi (AIT Principal)',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120'
  });
  await users.insertOne({
    _id: createObjectId(),
    tenantId: aitId,
    username: 'hod_comp_ait',
    email: 'hod.comp@aitpune.edu.in',
    passwordHash: hash('hod123'),
    role: 'HOD',
    fullName: 'Dr. Rajesh Sharma (HOD Comp)',
    departmentId: aitDeptCompId,
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120'
  });
  await users.insertOne({
    _id: createObjectId(),
    tenantId: aitId,
    username: 'faculty_mehta_ait',
    email: 'p.mehta@aitpune.edu.in',
    passwordHash: hash('faculty123'),
    role: 'FACULTY',
    fullName: 'Prof. Priya Mehta (Assoc. Prof)',
    departmentId: aitDeptCompId,
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120'
  });

  // -------------------------------------------------------------------
  // 2. College 2: Pune Institute of Modern Engineering (PIME)
  // Distinct institution to strictly test cross-tenant data isolation!
  // -------------------------------------------------------------------
  const pimeId = '64f9b0022222222222222222';
  await institutions.insertOne({
    _id: pimeId,
    tenantCode: 'PIME',
    name: 'Pune Institute of Modern Engineering',
    subdomain: 'pime',
    affiliation: 'Autonomous State Technical Board',
    naacGrade: 'A',
    aicteApprovalNo: 'AICTE/WRO/2-88192031/2012',
    contact: {
      email: 'contact@pime.edu.in',
      phone: '+91 20 2550 8800',
      address: 'Tech Valley Campus, Shivaji Nagar, Pune 411005'
    },
    subscription: { plan: 'STANDARD', status: 'ACTIVE' }
  });

  // PIME Academic Year
  await academicYears.insertOne({
    _id: createObjectId(),
    tenantId: pimeId,
    name: '2026-2027',
    isCurrent: true,
    startDate: new Date('2026-07-01'),
    endDate: new Date('2027-06-30')
  });

  // PIME Departments (Notice different codes from AIT!)
  const pimeDeptItId = '64f9dit02222222222222222';
  const pimeDeptMechId = '64f9dme02222222222222222';
  await departments.insertOne({
    _id: pimeDeptItId,
    tenantId: pimeId,
    code: 'IT',
    name: 'Information Technology',
    hodName: 'Dr. Suresh Nadkarni',
    hodEmail: 'hod.it@pime.edu.in',
    intakeCapacity: 60,
    establishedYear: 2012
  });
  await departments.insertOne({
    _id: pimeDeptMechId,
    tenantId: pimeId,
    code: 'MECH',
    name: 'Mechanical Engineering',
    hodName: 'Dr. Hemant Kulkarni',
    hodEmail: 'hod.mech@pime.edu.in',
    intakeCapacity: 60,
    establishedYear: 2012
  });

  // PIME Course
  await courses.insertOne({
    _id: createObjectId(),
    tenantId: pimeId,
    code: 'IT501',
    name: 'Cloud Computing & Microservices',
    departmentId: pimeDeptItId,
    credits: 4,
    theoryHours: 3,
    practicalHours: 2,
    syllabusModules: 6
  });

  // PIME Staff Accounts
  await users.insertOne({
    _id: createObjectId(),
    tenantId: pimeId,
    username: 'admin_pime',
    email: 'admin@pime.edu.in',
    passwordHash: hash('pime123'),
    role: 'COLLEGE_ADMIN',
    fullName: 'Er. Nitin Gadre (PIME Admin)',
    isActive: true,
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120'
  });

  console.log('✅ Multi-Tenant MERN Environment Seeded Successfully!');
  console.log('   - College 1: AIT Pune (Tenant: AITPUNE, Admin: admin_ait / admin123)');
  console.log('   - College 2: PIME Pune (Tenant: PIME, Admin: admin_pime / pime123)');
  console.log('   - SaaS Super Admin: saas_admin / superadmin123');
};

if (require.main === module) {
  seedMultiTenant().catch(console.error);
}

module.exports = { seedMultiTenant };
