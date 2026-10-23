# Administrator & Institution Onboarding Guide

Welcome to the **Modern College ERP SaaS Platform**. This guide details how college administrators, principals, and SaaS operators configure and manage multi-tenant institutions.

---

## 1. Institution Onboarding Workflow

There are two primary methods to onboard a new educational institution:

### Method A: Self-Service Registration API
Institution administrators or sales partners can provision a new tenant via the secure onboarding endpoint:

```http
POST /api/v1/auth/onboard-college
Content-Type: application/json

{
  "name": "Vidya Institute of Technology",
  "tenantCode": "VITPUNE",
  "subdomain": "vit",
  "affiliation": "Savitribai Phule Pune University",
  "naacGrade": "A++",
  "aicteApprovalNo": "AICTE/WRO/1-3329",
  "contactEmail": "principal@vitpune.edu.in",
  "contactPhone": "+91 20 2420 2180",
  "adminUsername": "vit_admin",
  "adminPassword": "StrongPassword123!",
  "adminFullName": "Dr. Rajesh Kulkarni",
  "adminEmail": "admin@vitpune.edu.in"
}
```

**Upon Onboarding, the platform automatically:**
1. Validates that `tenantCode` and `subdomain` are globally unique.
2. Creates the isolated Institution Document in the Document Registry.
3. Provisions the initial `COLLEGE_ADMIN` account with bcrypt password hashing.
4. Generates default Academic Year configuration (`2026-2027`).
5. Logs a cryptographic audit event: `COLLEGE_ONBOARDED`.

### Method B: SaaS Super Admin Portal
Platform super-administrators can view and manage all onboarded colleges directly within the ERP frontend under **Settings > Tenant Registry**.

---

## 2. Institution Branding Configuration

Each institution can customize its visual identity without affecting other tenants on the platform:

```http
PUT /api/v1/institution/branding
Authorization: Bearer <college_admin_token>
Content-Type: application/json

{
  "portalTitle": "Vidya Tech Autonomous Portal",
  "tagline": "Empowering Next-Gen Engineers • Autonomous Institute",
  "primaryColor": "#059669",
  "secondaryColor": "#064e3b",
  "logoUrl": "/assets/vit-crest.png"
}
```

The frontend dynamically loads these branding settings via the public endpoint `GET /api/v1/institution/public-branding/:subdomain` when students or faculty navigate to `vit.campuserp.io`.

---

## 3. Configurable Academic Settings

Institutions maintain autonomous academic policies governed by their respective university statutes or autonomous academic council:

```http
PUT /api/v1/institution/academic-settings
Authorization: Bearer <college_admin_token>
Content-Type: application/json

{
  "attendanceStatutoryMinPct": 75.0,
  "passingMarksPct": 40.0,
  "gradingScale": "10_POINT_CGPA",
  "termsPerYear": 2
}
```

### Policy Enforcement:
- **`attendanceStatutoryMinPct`:** Used by the Academic Support Alerts engine to flag students below statutory requirements and in examination hall ticket generation.
- **`passingMarksPct`:** Used by the Examination Module to determine course pass/backlog status.
- **`gradingScale`:** Supports `10_POINT_CGPA` or `PERCENTAGE_BASED`.

---

## 4. Subscription Plans & Entitlement Matrix

The platform enforces 3 commercial subscription tiers:

| Feature / Capability | STARTER | PROFESSIONAL | ENTERPRISE |
|:---|:---:|:---:|:---:|
| **Student Enrollment Limit** | Up to 500 | Up to 2,500 | Up to 25,000 |
| **Faculty Accounts** | Up to 50 | Up to 250 | Up to 2,000 |
| **Document Storage** | 5 GB | 25 GB | 250 GB |
| **Student Information System (SIS)** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Attendance Tracking & Daily Registers** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Fee Collection & Receipt Generation** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Student Service Desk & Grievance Tickets** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Examination & Grade Card Processing** | ❌ No | ✅ Yes | ✅ Yes |
| **Placement & Internship Portal** | ❌ No | ✅ Yes | ✅ Yes |
| **Multi-Stage Workflow Automation** | ❌ No | ✅ Yes | ✅ Yes |
| **Smart Timetable Generator** | ❌ No | ✅ Yes | ✅ Yes |
| **Academic Early Warning Support Alerts** | ❌ No | ✅ Yes | ✅ Yes |
| **AI Campus Copilot Query Engine** | ❌ No | ❌ No | ✅ Yes |
| **Advanced Management Analytics Dashboards**| ❌ No | ❌ No | ✅ Yes |
| **NAAC / NBA Accreditation Readiness** | ❌ No | ❌ No | ✅ Yes |
| **Custom Subdomain & Branding Themes** | ❌ No | ❌ No | ✅ Yes |
| **Priority 24/7 SLA Support** | ❌ No | ❌ No | ✅ Yes |

> [!IMPORTANT]
> Entitlements are strictly enforced on the server. If an institution attempts to invoke an unauthorized API (e.g. AI Copilot on Starter plan), the server responds with `403 FEATURE_NOT_ENTITLED` and includes an `upgradeUrl`.

---

## 5. Billing & Subscription Management

Institutions can initiate plan upgrades directly:

1. **Initiate Upgrade:**
   ```http
   POST /api/v1/billing/checkout
   Authorization: Bearer <college_admin_token>
   Content-Type: application/json
   
   { "planId": "ENTERPRISE", "billingCycle": "ANNUAL" }
   ```
2. **Provider Settlement:**
   - The user completes payment through the supported payment gateway (Stripe or Razorpay).
   - The payment gateway sends a cryptographically signed webhook to `/api/v1/billing/webhook`.
   - The platform verifies HMAC signatures (`x-provider-signature` or `stripe-signature`) before activating the plan.
3. **Invoices:**
   - Invoices are accessible under `GET /api/v1/billing/invoices`.

---

## 6. Role & Permission Hierarchy

| Role Code | Description | Key Capabilities |
|:---|:---|:---|
| `SUPER_ADMIN` | SaaS Platform Operator | Cross-tenant oversight, tenant onboarding, global backup creation, disaster recovery. |
| `COLLEGE_ADMIN` | College Director / Registrar | Full institution configuration, billing upgrades, department/course setup, user provisioning. |
| `PRINCIPAL` | Academic Head of Institute | Institute-wide analytics, exam result approvals, faculty leave approvals, NAAC metrics. |
| `HOD` | Head of Academic Department | Department timetables, faculty workload balancing, department circulars, grievance escalation. |
| `FACULTY` | Teacher / Professor | Attendance recording, internal assessment grading, student intervention notes, leave requests. |
| `STUDENT` | Enrolled Student | View timetable, attendance records, exam results, bonafide requests, grievance submissions. |

---

## 7. Data Isolation & Security Commitments

1. **Strict Data Boundary:** No user from Institution A can view, edit, or list records from Institution B. Every query is scoped by `tenantId`.
2. **Immutable Audit Logs:** All critical actions (logins, logouts, updates, grade submissions, fee receipts) are logged in the tamper-evident audit ledger.
3. **Non-Disciplinary AI Policy:** The AI Campus Copilot and Early Warning Support Alerts are strictly supportive and informative. They never execute arbitrary database mutations or issue punitive disciplinary actions without human administrator confirmation.
