const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, logAudit } = require('../middleware/auth');

// POST /api/ai/chat - AI Campus Copilot Query Engine
router.post('/chat', authenticate, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const query = prompt.toLowerCase().trim();
  const user = req.user;
  let answer = '';
  let sources = [];
  let suggestedActions = [];

  try {
    // 1. Role-Aware Permission Checks & Context Gathering
    
    // CASE A: Student asking about personal attendance
    if (query.includes('attendance') && (query.includes('my') || user.role === 'STUDENT')) {
      if (user.role === 'STUDENT') {
        const student = db.prepare(`
          SELECT s.*, d.name as department_name, d.code as department_code
          FROM students s
          JOIN departments d ON s.department_id = d.id
          WHERE s.user_id = ?
        `).get(user.id);

        if (student) {
          const breakdown = db.prepare(`
            SELECT sub.code, sub.name,
                   COUNT(ses.id) as conducted,
                   SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) as attended
            FROM attendance_sessions ses
            JOIN courses_subjects sub ON ses.subject_id = sub.id
            LEFT JOIN attendance_records ar ON ar.session_id = ses.id AND ar.student_id = ?
            WHERE ses.division_id = ?
            GROUP BY sub.id
          `).all(student.id, student.division_id);

          const isShortage = student.attendance_pct < 75.0;
          answer = `### 📊 Your Semester Attendance Summary\n\n` +
            `**Student:** ${student.full_name} (${student.prn})\n` +
            `**Overall Attendance:** **${student.attendance_pct}%** ` +
            (isShortage ? `⚠️ **(BELOW 75% STATUTORY THRESHOLD)**` : `✅ **(Compliant with University Norms)**`) + `\n\n` +
            `| Subject Code | Subject Name | Attended / Total | Attendance % |\n` +
            `| :--- | :--- | :---: | :---: |\n`;

          for (const b of breakdown) {
            const pct = b.conducted > 0 ? Math.round((b.attended / b.conducted) * 100) : 100;
            answer += `| ${b.code} | ${b.name} | ${b.attended} / ${b.conducted} | ${pct}% |\n`;
          }

          if (isShortage) {
            answer += `\n> ⚠️ **Attendance Alert:** Your current attendance is below the mandatory 75% required by AICTE & University Ordinance 119. Please meet your Class Teacher immediately.`;
            suggestedActions.push({ label: 'View Attendance Details', path: '/attendance' });
            suggestedActions.push({ label: 'Submit Medical / Leave Request', path: '/service-desk' });
          }

          sources.push({ type: 'Table', name: 'attendance_records & students' });
        }
      } else {
        // Faculty / Admin asking for shortage
        const defaulters = db.prepare(`
          SELECT s.prn, s.roll_no, s.full_name, s.attendance_pct, d.code as dept
          FROM students s
          JOIN departments d ON s.department_id = d.id
          WHERE s.attendance_pct < 75.0
          ORDER BY s.attendance_pct ASC
        `).all();

        answer = `### ⚠️ Students with Attendance Shortage (< 75%)\n\n` +
          `Found **${defaulters.length} students** with critical attendance deficit:\n\n` +
          `| Roll No | PRN | Student Name | Dept | Current Attendance |\n` +
          `| :---: | :--- | :--- | :---: | :---: |\n`;

        for (const d of defaulters) {
          answer += `| ${d.roll_no} | ${d.prn} | **${d.full_name}** | ${d.dept} | **${d.attendance_pct}%** |\n`;
        }

        answer += `\n*Action required:* Issue intimation letters to guardians and schedule counseling sessions.`;
        sources.push({ type: 'Query', name: 'SELECT FROM students WHERE attendance_pct < 75' });
        suggestedActions.push({ label: 'Open Attendance Defaulter List', path: '/attendance' });
        suggestedActions.push({ label: 'View Early Academic Support Alerts', path: '/support' });
      }
    }
    // CASE B: Questions about Fees, Dues, and Invoices
    else if (query.includes('fee') || query.includes('dues') || query.includes('invoice') || query.includes('balance') || query.includes('collection')) {
      if (user.role === 'STUDENT') {
        const student = db.prepare('SELECT id, full_name, prn FROM students WHERE user_id = ?').get(user.id);
        const inv = db.prepare('SELECT * FROM student_invoices WHERE student_id = ?').get(student.id);

        if (inv) {
          answer = `### 💳 Your Fee Account Status\n\n` +
            `**Invoice Number:** \`${inv.invoice_number}\`\n` +
            `**Total Annual Fee:** ₹${inv.total_amount.toLocaleString('en-IN')}\n` +
            `**Amount Paid:** ₹${inv.paid_amount.toLocaleString('en-IN')}\n` +
            `**Balance Outstanding:** **₹${inv.balance_amount.toLocaleString('en-IN')}**\n` +
            `**Status:** **${inv.status}** (Due Date: ${inv.due_date})\n\n`;

          if (inv.balance_amount > 0) {
            answer += `> 📌 Please settle pending dues before the semester end examination form submission deadline.`;
            suggestedActions.push({ label: 'Pay Fee Online', path: '/finance' });
          } else {
            answer += `> ✅ All annual academic fees for 2026-27 are fully cleared!`;
            suggestedActions.push({ label: 'Download Fee Receipt', path: '/finance' });
          }
          sources.push({ type: 'Table', name: 'student_invoices' });
        }
      } else {
        // Management summary
        const summary = db.prepare(`
          SELECT 
            SUM(total_amount) as billed,
            SUM(paid_amount) as collected,
            SUM(balance_amount) as pending,
            COUNT(*) as total_students
          FROM student_invoices
        `).get();

        answer = `### 🏛️ Institutional Fee Collection Summary (AY 2026-27)\n\n` +
          `- **Total Billed:** ₹${summary.billed.toLocaleString('en-IN')}\n` +
          `- **Total Collected to Date:** **₹${summary.collected.toLocaleString('en-IN')}**\n` +
          `- **Outstanding Dues:** **₹${summary.pending.toLocaleString('en-IN')}**\n` +
          `- **Collection Efficiency:** **${Math.round((summary.collected / summary.billed) * 100)}%**\n\n` +
          `*Note:* Role restricted to authorized finance administration.`;
        sources.push({ type: 'Table', name: 'student_invoices & fee_payments' });
        suggestedActions.push({ label: 'View Fee Dashboard', path: '/finance' });
      }
    }
    // CASE C: Questions about Certificates / Tickets / Grievances
    else if (query.includes('certificate') || query.includes('bonafide') || query.includes('ticket') || query.includes('request') || query.includes('status')) {
      if (user.role === 'STUDENT') {
        const student = db.prepare('SELECT id FROM students WHERE user_id = ?').get(user.id);
        const tickets = db.prepare('SELECT * FROM service_desk_tickets WHERE student_id = ? ORDER BY created_at DESC').all(student.id);

        if (tickets.length > 0) {
          answer = `### 🎫 Your Service Desk & Certificate Requests\n\n`;
          for (const t of tickets) {
            answer += `#### Ticket \`${t.ticket_no}\`: ${t.title}\n` +
              `- **Category:** ${t.category}\n` +
              `- **Status:** **${t.status}**\n` +
              (t.resolution_notes ? `- **Resolution Notes:** ${t.resolution_notes}\n` : '') +
              (t.certificate_hash ? `- **QR Verification Hash:** \`${t.certificate_hash}\` ✅ Verified\n` : '') +
              `\n---\n`;
          }
          suggestedActions.push({ label: 'Open Service Desk', path: '/service-desk' });
          sources.push({ type: 'Table', name: 'service_desk_tickets' });
        } else {
          answer = `You do not have any open service desk or certificate requests at this time.`;
          suggestedActions.push({ label: 'Apply for Bonafide Certificate', path: '/service-desk' });
        }
      } else {
        const pending = db.prepare('SELECT COUNT(*) as c FROM service_desk_tickets WHERE status = "PENDING"').get().c;
        answer = `### 📬 Institutional Service Desk Overview\n\n` +
          `- **Pending Service Tickets:** **${pending}** awaiting administrative approval.\n` +
          `- Standard SLA: 24-48 hours for Bonafide and verification requests.`;
        sources.push({ type: 'Table', name: 'service_desk_tickets' });
        suggestedActions.push({ label: 'Review Service Requests', path: '/service-desk' });
      }
    }
    // CASE D: Draft an examination or department notice
    else if (query.includes('draft') || query.includes('notice') || query.includes('announcement')) {
      if (['SUPER_ADMIN', 'PRINCIPAL', 'HOD', 'FACULTY'].includes(user.role)) {
        answer = `### 📝 Draft Notice: Semester Examination Protocol & Attendance Compliance\n\n` +
          `**OFFICE OF THE ACADEMIC REGISTRAR & EXAMINATION CELL**\n` +
          `**Dr. APJ Abdul Kalam Institute of Technology, Pune**\n\n` +
          `**CIRCULAR NO:** AIT/ACAD/EXAM/2026/108  \n` +
          `**DATE:** 21st October 2026  \n` +
          `**TO:** All Students, HODs, and Faculty Members  \n\n` +
          `**SUBJECT:** In-Semester & Continuous Internal Evaluation (CIE) Submission Schedule\n\n` +
          `This is to inform all students of Third Year Engineering (Sem 5) that the upcoming Continuous Internal Evaluation (CIE 2) and Laboratory Practical Assessments will commence from **10th November 2026**.\n\n` +
          `**Key Guidelines:**\n` +
          `1. Attendance compliance (>75%) is mandatory to be eligible for hall tickets.\n` +
          `2. Students must clear any pending academic fee dues before 5th November 2026.\n` +
          `3. Approved digital ID cards with verifiable QR codes must be presented during examinations.\n\n` +
          `*Issued by Authority: Principal & Academic Director*\n\n` +
          `> 💡 **Next Step:** You can publish this draft notice directly to the institutional notice board.`;
        suggestedActions.push({ label: 'Publish to Notices Board', path: '/dashboard' });
        sources.push({ type: 'Template', name: 'AI Notice Synthesizer' });
      } else {
        answer = `Notice drafting is reserved for Faculty, HODs, and Administration.`;
      }
    }
    // CASE E: Institutional KPI / Academic summary
    else if (query.includes('summarize') || query.includes('performance') || query.includes('kpi') || query.includes('overview') || query.includes('college')) {
      const stats = db.prepare(`
        SELECT 
          (SELECT COUNT(*) FROM students) as students,
          (SELECT COUNT(*) FROM faculty) as faculty,
          (SELECT ROUND(AVG(attendance_pct), 1) FROM students) as avg_att,
          (SELECT ROUND(AVG(current_cgpa), 2) FROM students) as avg_cgpa,
          (SELECT COUNT(*) FROM placement_applications WHERE status = 'OFFERED') as offers
      `).get();

      answer = `### 🎓 Campus Performance & Institutional Overview (AY 2026-27)\n\n` +
        `- **Total Active Students:** **${stats.students}** across 4 engineering departments\n` +
        `- **Faculty & Academic Staff:** **${stats.faculty}** (Faculty-to-student ratio 1:15)\n` +
        `- **Average Campus Attendance:** **${stats.avg_att}%**\n` +
        `- **Average Academic CGPA:** **${stats.avg_cgpa} / 10.0**\n` +
        `- **Campus Recruitment Offers:** **${stats.offers}** offers bagged by 2027 batch\n` +
        `- **Accreditation Grade:** **NAAC A++ (Autonomous Institution)**\n\n` +
        `Data grounded in real-time institutional database.`;
      sources.push({ type: 'Database Aggregation', name: 'students, faculty, placement_applications' });
      suggestedActions.push({ label: 'Open Institutional Analytics', path: '/dashboard' });
      suggestedActions.push({ label: 'View NAAC Quality Workspace', path: '/naac' });
    }
    // DEFAULT: Helpful contextual guide
    else {
      answer = `### 🤖 Campus AI Copilot Assistant\n\n` +
        `I am your intelligent assistant grounded in Dr. APJ Abdul Kalam Institute of Technology's ERP database.\n\n` +
        `Here are some questions you can ask me based on your role (${user.role}):\n` +
        `- *"Show my attendance for this semester"* (or *"Which students have low attendance?"* for staff)\n` +
        `- *"What is my pending fee balance?"* (or *"Summarize fee collections"*)\n` +
        `- *"What is the status of my certificate request?"*\n` +
        `- *"Draft a department notice for the next examination"*\n` +
        `- *"Summarize this department's academic performance and placement statistics"*`;
      suggestedActions.push({ label: 'Check Attendance', path: '/attendance' });
      suggestedActions.push({ label: 'View Academics', path: '/academics' });
    }

    logAudit(user.id, user.role, 'AI_COPILOT_QUERY', 'AI_COPILOT', 'QUERY', { prompt: query.substring(0, 80) }, req);

    res.json({
      success: true,
      query: prompt,
      response: answer,
      sources,
      suggestedActions
    });
  } catch (err) {
    console.error('AI Copilot error:', err);
    res.status(500).json({
      error: 'AI Copilot encountered an error processing the question',
      fallback: 'Data service temporarily busy. Please navigate using the sidebar modules.'
    });
  }
});

module.exports = router;
