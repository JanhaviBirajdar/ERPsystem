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
    }).then(handleResponse)
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
    }).then(handleResponse)
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
    getMarksheet: (studentId) => fetch(`${API_BASE}/examination/marksheet/${studentId}`, { headers: getHeaders() }).then(handleResponse)
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
    getStats: () => fetch(`${API_BASE}/placement/stats`, { headers: getHeaders() }).then(handleResponse)
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
    }).then(handleResponse)
  }
};
