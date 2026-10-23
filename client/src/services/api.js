// Central API Client with JWT Bearer Token Handling
const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('erp_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.error || `HTTP ${res.status}: Failed to process request`;
    throw new Error(errorMsg);
  }
  return data;
};

export const api = {
  // Authentication & Demo Personas
  auth: {
    login: (username, password) => fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    }).then(handleResponse),

    getMe: () => fetch(`${API_BASE}/auth/me`, { headers: getHeaders() }).then(handleResponse),

    getDemoUsers: () => fetch(`${API_BASE}/auth/demo-users`).then(handleResponse),

    switchDemo: (username) => fetch(`${API_BASE}/auth/switch-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    }).then(handleResponse)
  },

  // Institution Configuration
  institution: {
    get: () => fetch(`${API_BASE}/institution`).then(handleResponse),
    update: (data) => fetch(`${API_BASE}/institution`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    addDepartment: (data) => fetch(`${API_BASE}/institution/departments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse)
  },

  // Admission Management
  admissions: {
    getApplications: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/admissions/applications?${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    createApplication: (data) => fetch(`${API_BASE}/admissions/applications`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    verifyDocuments: (id, data) => fetch(`${API_BASE}/admissions/applications/${id}/verify-documents`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    checkEligibility: (id) => fetch(`${API_BASE}/admissions/applications/${id}/check-eligibility`, {
      method: 'PUT',
      headers: getHeaders()
    }).then(handleResponse),
    approve: (id) => fetch(`${API_BASE}/admissions/applications/${id}/approve`, {
      method: 'PUT',
      headers: getHeaders()
    }).then(handleResponse),
    enroll: (id) => fetch(`${API_BASE}/admissions/applications/${id}/enroll`, {
      method: 'POST',
      headers: getHeaders()
    }).then(handleResponse),
    getReports: () => fetch(`${API_BASE}/admissions/reports`, { headers: getHeaders() }).then(handleResponse)
  },

  // Student Information System (SIS)
  students: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/students?${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    getById: (id) => fetch(`${API_BASE}/students/${id}`, { headers: getHeaders() }).then(handleResponse),
    enroll: (data) => fetch(`${API_BASE}/students`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    update: (id, data) => fetch(`${API_BASE}/students/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse)
  },

  // Faculty Directory & Workload
  faculty: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/faculty?${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    getById: (id) => fetch(`${API_BASE}/faculty/${id}`, { headers: getHeaders() }).then(handleResponse),
    create: (data) => fetch(`${API_BASE}/faculty`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    applyLeave: (data) => fetch(`${API_BASE}/faculty/leaves`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    getLeaves: () => fetch(`${API_BASE}/faculty/leaves`, { headers: getHeaders() }).then(handleResponse),
    updateLeaveStatus: (id, data) => fetch(`${API_BASE}/faculty/leaves/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    allocateSubject: (facId, data) => fetch(`${API_BASE}/faculty/${facId}/subject-allocations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    removeSubjectAllocation: (allocId) => fetch(`${API_BASE}/faculty/subject-allocations/${allocId}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(handleResponse),
    getWorkloadOverview: () => fetch(`${API_BASE}/faculty/workload/overview`, { headers: getHeaders() }).then(handleResponse)
  },

  // Academics & Timetables
  academics: {
    getSubjects: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/academics/subjects?${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    updateSyllabus: (id, pct) => fetch(`${API_BASE}/academics/subjects/${id}/syllabus`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ syllabus_completed_pct: pct })
    }).then(handleResponse),
    getTimetable: (divisionId) => fetch(`${API_BASE}/academics/timetable/${divisionId}`, { headers: getHeaders() }).then(handleResponse),
    generateTimetable: (data) => fetch(`${API_BASE}/academics/generate-timetable`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    scheduleSlot: (data) => fetch(`${API_BASE}/academics/timetable/slot`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    deleteSlot: (id) => fetch(`${API_BASE}/academics/timetable/slot/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(handleResponse),
    checkConflicts: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/academics/timetable/conflict-check?${q}`, { headers: getHeaders() }).then(handleResponse);
    }
  },

  // Attendance Management
  attendance: {
    getSessions: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/attendance/sessions?${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    createSession: (data) => fetch(`${API_BASE}/attendance/sessions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    getSession: (id) => fetch(`${API_BASE}/attendance/sessions/${id}`, { headers: getHeaders() }).then(handleResponse),
    mark: (data) => fetch(`${API_BASE}/attendance/mark`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    getStudentAttendance: (studentId) => fetch(`${API_BASE}/attendance/student/${studentId}`, { headers: getHeaders() }).then(handleResponse),
    getShortageReport: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/attendance/shortage-report?${q}`, { headers: getHeaders() }).then(handleResponse);
    }
  },

  // Examination & Grading
  examination: {
    getExams: () => fetch(`${API_BASE}/examination/exams`, { headers: getHeaders() }).then(handleResponse),
    getMarks: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/examination/marks?${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    submitMarks: (data) => fetch(`${API_BASE}/examination/marks/entry`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    lockMarks: (data) => fetch(`${API_BASE}/examination/marks/lock`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    getMarksheet: (studentId) => fetch(`${API_BASE}/examination/marksheet/${studentId}`, { headers: getHeaders() }).then(handleResponse),
    scheduleExam: (data) => fetch(`${API_BASE}/examination/schedules`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    getSchedules: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/examination/schedules?${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    publishResults: (examId) => fetch(`${API_BASE}/examination/exams/${examId}/publish`, {
      method: 'PUT',
      headers: getHeaders()
    }).then(handleResponse),
    submitRevaluation: (data) => fetch(`${API_BASE}/examination/revaluation`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    getRevaluations: () => fetch(`${API_BASE}/examination/revaluation`, { headers: getHeaders() }).then(handleResponse),
    reviewRevaluation: (id, data) => fetch(`${API_BASE}/examination/revaluation/${id}/review`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse)
  },

  // Assignments & Academic Study Resources
  assignments: {
    getAll: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/assignments?${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    create: (data) => fetch(`${API_BASE}/assignments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    submit: (id, data) => fetch(`${API_BASE}/assignments/${id}/submit`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    getSubmissions: (id) => fetch(`${API_BASE}/assignments/${id}/submissions`, { headers: getHeaders() }).then(handleResponse),
    grade: (submissionId, data) => fetch(`${API_BASE}/assignments/submissions/${submissionId}/grade`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    getResources: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/assignments/resources?${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    createResource: (data) => fetch(`${API_BASE}/assignments/resources`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse)
  },

  // Fees & Finance
  finance: {
    getStructures: () => fetch(`${API_BASE}/finance/structures`, { headers: getHeaders() }).then(handleResponse),
    getInvoices: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/finance/invoices?${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    recordPayment: (data) => fetch(`${API_BASE}/finance/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    getReceipt: (id) => fetch(`${API_BASE}/finance/receipt/${id}`, { headers: getHeaders() }).then(handleResponse),
    getSummary: () => fetch(`${API_BASE}/finance/summary`, { headers: getHeaders() }).then(handleResponse)
  },

  // Library Management
  library: {
    getBooks: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/library/books?${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    addBook: (data) => fetch(`${API_BASE}/library/books`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    getLoans: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/library/loans?${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    issueBook: (data) => fetch(`${API_BASE}/library/issue`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    returnBook: (loanId) => fetch(`${API_BASE}/library/return`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ loan_id: loanId })
    }).then(handleResponse),
    reserveBook: (data) => fetch(`${API_BASE}/library/reserve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    getReservations: () => fetch(`${API_BASE}/library/reservations`, { headers: getHeaders() }).then(handleResponse),
    getOverdue: () => fetch(`${API_BASE}/library/overdue`, { headers: getHeaders() }).then(handleResponse),
    sendOverdueReminders: () => fetch(`${API_BASE}/library/overdue/send-reminders`, {
      method: 'POST',
      headers: getHeaders()
    }).then(handleResponse)
  },


  // Training & Placement Cell
  placement: {
    getDrives: () => fetch(`${API_BASE}/placement/drives`, { headers: getHeaders() }).then(handleResponse),
    createDrive: (data) => fetch(`${API_BASE}/placement/drives`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    getApplications: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/placement/applications?${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    apply: (driveId) => fetch(`${API_BASE}/placement/apply`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ drive_id: driveId })
    }).then(handleResponse),
    updateStatus: (id, data) => fetch(`${API_BASE}/placement/applications/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    getStats: () => fetch(`${API_BASE}/placement/stats`, { headers: getHeaders() }).then(handleResponse),
    scheduleInterview: (data) => fetch(`${API_BASE}/placement/interviews`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    getInterviews: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/placement/interviews?${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    updateInterviewOutcome: (id, data) => fetch(`${API_BASE}/placement/interviews/${id}/outcome`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse)
  },

  // Campus Operations: Hostel, Transport, Equipment, Maintenance
  campus: {
    hostel: {
      getRooms: () => fetch(`${API_BASE}/campus/hostel/rooms`, { headers: getHeaders() }).then(handleResponse),
      createRoom: (data) => fetch(`${API_BASE}/campus/hostel/rooms`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),
      getAllocations: () => fetch(`${API_BASE}/campus/hostel/allocations`, { headers: getHeaders() }).then(handleResponse),
      allocate: (data) => fetch(`${API_BASE}/campus/hostel/allocate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),
      vacate: (id) => fetch(`${API_BASE}/campus/hostel/vacate/${id}`, {
        method: 'PUT',
        headers: getHeaders()
      }).then(handleResponse)
    },
    transport: {
      getRoutes: () => fetch(`${API_BASE}/campus/transport/routes`, { headers: getHeaders() }).then(handleResponse),
      createRoute: (data) => fetch(`${API_BASE}/campus/transport/routes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),
      getAllocations: () => fetch(`${API_BASE}/campus/transport/allocations`, { headers: getHeaders() }).then(handleResponse),
      allocate: (data) => fetch(`${API_BASE}/campus/transport/allocate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse)
    },
    equipment: {
      getAll: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return fetch(`${API_BASE}/campus/equipment?${q}`, { headers: getHeaders() }).then(handleResponse);
      },
      create: (data) => fetch(`${API_BASE}/campus/equipment`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),
      updateCondition: (id, data) => fetch(`${API_BASE}/campus/equipment/${id}/condition`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse)
    },
    maintenance: {
      getAll: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return fetch(`${API_BASE}/campus/maintenance?${q}`, { headers: getHeaders() }).then(handleResponse);
      },
      create: (data) => fetch(`${API_BASE}/campus/maintenance`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),
      updateStatus: (id, data) => fetch(`${API_BASE}/campus/maintenance/${id}/status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse)
    }
  },


  // Service Desk & Bonafide Certificates
  serviceDesk: {
    getTickets: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/service-desk/tickets?${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    createTicket: (data) => fetch(`${API_BASE}/service-desk/tickets`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    updateStatus: (id, data) => fetch(`${API_BASE}/service-desk/tickets/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    verifyCertificate: (hash) => fetch(`${API_BASE}/service-desk/verify/${hash}`).then(handleResponse)
  },

  // Early Academic Support System
  supportSystem: {
    getAlerts: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/support/alerts?${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    getThresholds: () => fetch(`${API_BASE}/support/thresholds`, { headers: getHeaders() }).then(handleResponse),
    updateThresholds: (data) => fetch(`${API_BASE}/support/thresholds`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    recordIntervention: (data) => fetch(`${API_BASE}/support/interventions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    getInterventions: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/support/interventions?${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    runScan: () => fetch(`${API_BASE}/support/scan`, {
      method: 'POST',
      headers: getHeaders()
    }).then(handleResponse),
    logCounseling: (data) => fetch(`${API_BASE}/support/counsel`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse)
  },

  // NAAC / NBA Quality Assurance
  naac: {
    getMetrics: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/naac/metrics?${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    updateMetric: (id, data) => fetch(`${API_BASE}/naac/metrics/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    getSummary: () => fetch(`${API_BASE}/naac/summary`, { headers: getHeaders() }).then(handleResponse)
  },

  // Analytics & Notices
  analytics: {
    getDashboard: () => fetch(`${API_BASE}/analytics/dashboard`, { headers: getHeaders() }).then(handleResponse),
    getManagementOverview: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/analytics/management-overview?${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    getDrilldown: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/analytics/drilldown?${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    exportCsv: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/analytics/export?${q}`, { headers: getHeaders() });
    },
    getAuditLogs: (limit = 30) => fetch(`${API_BASE}/analytics/audit-logs?limit=${limit}`, { headers: getHeaders() }).then(handleResponse),
    getNotices: () => fetch(`${API_BASE}/analytics/notices`, { headers: getHeaders() }).then(handleResponse),
    publishNotice: (data) => fetch(`${API_BASE}/analytics/notices`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse)
  },

  // Universal ERP Search
  search: {
    query: (q) => fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`, { headers: getHeaders() }).then(handleResponse)
  },

  // AI Campus Copilot
  ai: {
    askCopilot: (prompt) => fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ prompt })
    }).then(handleResponse),
    confirmAction: (actionId, confirmed = true) => fetch(`${API_BASE}/ai/confirm-action`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ actionId, confirmed })
    }).then(handleResponse),
    getTelemetry: () => fetch(`${API_BASE}/ai/telemetry`, { headers: getHeaders() }).then(handleResponse)
  },

  // Phase 2 Modular MERN Multi-Tenant v1 Endpoints
  v1: {
    auth: {
      login: (username, password, tenantId) => fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, tenantId })
      }).then(handleResponse),
      getMe: () => fetch('/api/v1/auth/me', { headers: getHeaders() }).then(handleResponse),
      logout: () => fetch('/api/v1/auth/logout', { method: 'POST', headers: getHeaders() }).then(handleResponse),
      onboardCollege: (data) => fetch('/api/v1/auth/onboard-college', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(handleResponse)
    },
    institution: {
      get: () => fetch('/api/v1/institution', { headers: getHeaders() }).then(handleResponse),
      update: (data) => fetch('/api/v1/institution', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),
      listAll: () => fetch('/api/v1/institution/all', { headers: getHeaders() }).then(handleResponse)
    },
    academicConfig: {
      getAcademicYears: () => fetch('/api/v1/academic-config/academic-years', { headers: getHeaders() }).then(handleResponse),
      createAcademicYear: (data) => fetch('/api/v1/academic-config/academic-years', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),
      getDepartments: () => fetch('/api/v1/academic-config/departments', { headers: getHeaders() }).then(handleResponse),
      createDepartment: (data) => fetch('/api/v1/academic-config/departments', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),
      getCourses: () => fetch('/api/v1/academic-config/courses', { headers: getHeaders() }).then(handleResponse),
      createCourse: (data) => fetch('/api/v1/academic-config/courses', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),
      getSemesters: () => fetch('/api/v1/academic-config/semesters', { headers: getHeaders() }).then(handleResponse),
      createSemester: (data) => fetch('/api/v1/academic-config/semesters', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),
      getDivisions: () => fetch('/api/v1/academic-config/divisions', { headers: getHeaders() }).then(handleResponse),
      createDivision: (data) => fetch('/api/v1/academic-config/divisions', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse)
    },
    audit: {
      getLogs: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return fetch(`/api/v1/audit/logs?${q}`, { headers: getHeaders() }).then(handleResponse);
      }
    }
  },

  // Workflow Automation & Self-Service Engine
  workflows: {
    getDefinitions: () => fetch(`${API_BASE}/workflows/definitions`, { headers: getHeaders() }).then(handleResponse),
    updateDefinition: (id, data) => fetch(`${API_BASE}/workflows/definitions/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    getInstances: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/workflows/instances?${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    getInstance: (id) => fetch(`${API_BASE}/workflows/instances/${id}`, { headers: getHeaders() }).then(handleResponse),
    startWorkflow: (data) => fetch(`${API_BASE}/workflows/instances`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    executeAction: (id, action, comments = '') => fetch(`${API_BASE}/workflows/instances/${id}/action`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ action, comments })
    }).then(handleResponse),
    getInbox: () => fetch(`${API_BASE}/workflows/inbox`, { headers: getHeaders() }).then(handleResponse),
    getStudentSelfService: (userId) => {
      const q = userId ? `?user_id=${userId}` : '';
      return fetch(`${API_BASE}/workflows/self-service/student${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    getFacultySelfService: (userId) => {
      const q = userId ? `?user_id=${userId}` : '';
      return fetch(`${API_BASE}/workflows/self-service/faculty${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    getDocument: (id) => fetch(`${API_BASE}/workflows/documents/${id}`, { headers: getHeaders() }).then(handleResponse),
    verifyDocument: (code) => fetch(`${API_BASE}/workflows/documents/verify/${code}`).then(handleResponse),
    getNotifications: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return fetch(`${API_BASE}/workflows/notifications?${q}`, { headers: getHeaders() }).then(handleResponse);
    },
    markNotificationRead: (id) => fetch(`${API_BASE}/workflows/notifications/${id}/read`, {
      method: 'PUT',
      headers: getHeaders()
    }).then(handleResponse),
    markAllNotificationsRead: () => fetch(`${API_BASE}/workflows/notifications/read-all`, {
      method: 'PUT',
      headers: getHeaders()
    }).then(handleResponse),
    getAnnouncements: () => fetch(`${API_BASE}/workflows/announcements`, { headers: getHeaders() }).then(handleResponse),
    publishAnnouncement: (data) => fetch(`${API_BASE}/workflows/announcements`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    getReports: (reportType = 'WORKFLOW_COMPLIANCE_DAILY', format = 'json') => {
      if (format === 'csv') {
        return fetch(`${API_BASE}/workflows/reports?report_type=${reportType}&format=csv`, { headers: getHeaders() }).then(res => res.text());
      }
      return fetch(`${API_BASE}/workflows/reports?report_type=${reportType}&format=json`, { headers: getHeaders() }).then(handleResponse);
    },
    getScheduledReports: () => fetch(`${API_BASE}/workflows/reports/scheduled`, { headers: getHeaders() }).then(handleResponse),
    triggerSchedulerTick: () => fetch(`${API_BASE}/workflows/scheduler/tick`, {
      method: 'POST',
      headers: getHeaders()
    }).then(handleResponse)
  },

  // Multi-Tenant SaaS Commercial v1 Endpoints
  v1: {
    auth: {
      onboardCollege: (data) => fetch(`${API_BASE}/v1/auth/onboard-college`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(handleResponse),
      login: (username, password) => fetch(`${API_BASE}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      }).then(handleResponse)
    },
    institution: {
      get: () => fetch(`${API_BASE}/v1/institution`, { headers: getHeaders() }).then(handleResponse),
      update: (data) => fetch(`${API_BASE}/v1/institution`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),
      getBranding: () => fetch(`${API_BASE}/v1/institution/branding`, { headers: getHeaders() }).then(handleResponse),
      updateBranding: (data) => fetch(`${API_BASE}/v1/institution/branding`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),
      getAcademicSettings: () => fetch(`${API_BASE}/v1/institution/academic-settings`, { headers: getHeaders() }).then(handleResponse),
      updateAcademicSettings: (data) => fetch(`${API_BASE}/v1/institution/academic-settings`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),
      listAll: () => fetch(`${API_BASE}/v1/institution/all`, { headers: getHeaders() }).then(handleResponse)
    },
    academicConfig: {
      getAcademicYears: () => fetch(`${API_BASE}/v1/academic-config/academic-years`, { headers: getHeaders() }).then(handleResponse),
      createAcademicYear: (data) => fetch(`${API_BASE}/v1/academic-config/academic-years`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),
      getDepartments: () => fetch(`${API_BASE}/v1/academic-config/departments`, { headers: getHeaders() }).then(handleResponse),
      createDepartment: (data) => fetch(`${API_BASE}/v1/academic-config/departments`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),
      getCourses: () => fetch(`${API_BASE}/v1/academic-config/courses`, { headers: getHeaders() }).then(handleResponse),
      createCourse: (data) => fetch(`${API_BASE}/v1/academic-config/courses`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),
      getSemesters: () => fetch(`${API_BASE}/v1/academic-config/semesters`, { headers: getHeaders() }).then(handleResponse),
      createSemester: (data) => fetch(`${API_BASE}/v1/academic-config/semesters`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),
      getDivisions: () => fetch(`${API_BASE}/v1/academic-config/divisions`, { headers: getHeaders() }).then(handleResponse),
      createDivision: (data) => fetch(`${API_BASE}/v1/academic-config/divisions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse)
    },
    audit: {
      getLogs: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return fetch(`${API_BASE}/v1/audit/logs?${q}`, { headers: getHeaders() }).then(handleResponse);
      }
    },
    billing: {
      getPlans: () => fetch(`${API_BASE}/v1/billing/plans`).then(handleResponse),
      createCheckout: (data) => fetch(`${API_BASE}/v1/billing/checkout`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),
      getInvoices: () => fetch(`${API_BASE}/v1/billing/invoices`, { headers: getHeaders() }).then(handleResponse)
    },
    backups: {
      list: () => fetch(`${API_BASE}/v1/backups`, { headers: getHeaders() }).then(handleResponse),
      create: () => fetch(`${API_BASE}/v1/backups/create`, {
        method: 'POST',
        headers: getHeaders()
      }).then(handleResponse),
      restore: (snapshotId) => fetch(`${API_BASE}/v1/backups/${snapshotId}/restore`, {
        method: 'POST',
        headers: getHeaders()
      }).then(handleResponse)
    }
  }
};

