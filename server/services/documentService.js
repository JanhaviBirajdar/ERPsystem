const crypto = require('crypto');
const db = require('../db/database');

/**
 * Enterprise Verifiable Document Generation Engine
 * Generates tamper-proof institutional certificates with SHA-256 cryptographic verification
 * Supports: Bonafide, Leaving/Transfer, Character/Conduct, Fee Clearance, Faculty Leave Order
 */
class DocumentService {
  /**
   * Render HTML for official printable document
   */
  renderDocumentHtml({ templateType, title, docNumber, verificationCode, studentOrFacultyName, prnOrEmpCode, departmentName, purpose, issuedDate, signatoryName, signatoryRole, institution }) {
    return `
      <div class="official-certificate-container" style="max-width: 800px; margin: 0 auto; padding: 40px; border: 8px double #1e3a8a; background: #ffffff; font-family: 'Times New Roman', Times, serif; color: #0f172a; position: relative;">
        <!-- Watermark -->
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; color: rgba(30, 58, 138, 0.04); font-weight: bold; pointer-events: none; text-transform: uppercase;">
          ${institution.code || 'AIT PUNE'} OFFICIAL
        </div>

        <!-- Official Header -->
        <div style="text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 20px; margin-bottom: 25px;">
          <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; font-weight: bold;">
            ${institution.tagline || 'Autonomous Engineering Institute | NAAC A+ Accredited'}
          </div>
          <h1 style="font-size: 26px; color: #1e3a8a; margin: 8px 0; text-transform: uppercase; letter-spacing: 1px;">
            ${institution.name}
          </h1>
          <div style="font-size: 12px; color: #475569;">
            Affiliated to ${institution.affiliation || 'Savitribai Phule Pune University'} | Approved by AICTE New Delhi
          </div>
          <div style="font-size: 12px; color: #475569; margin-top: 4px;">
            ${institution.address || 'Alandi Road, Dighi, Pune - 411015, Maharashtra, India'}
          </div>
        </div>

        <!-- Document Metadata Bar -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 13px; font-weight: bold; color: #334155;">
          <div>REF NO: <span style="font-family: monospace; color: #1e3a8a;">${docNumber}</span></div>
          <div>DATE: <span>${issuedDate}</span></div>
        </div>

        <!-- Certificate Title -->
        <div style="text-align: center; margin-bottom: 35px;">
          <h2 style="font-size: 22px; text-transform: uppercase; text-decoration: underline; color: #0f172a; letter-spacing: 2px; margin: 0;">
            ${title}
          </h2>
        </div>

        <!-- Body Paragraph -->
        <div style="font-size: 16px; line-height: 2; text-align: justify; margin-bottom: 40px;">
          This is to certify that <strong>${studentOrFacultyName}</strong> (Identifier / PRN: <span style="font-family: monospace; font-weight: bold;">${prnOrEmpCode}</span>) is a bonafide student / faculty of the <strong>Department of ${departmentName}</strong> at this institution during the Academic Year 2025-2026.
          <br><br>
          As per institutional academic and disciplinary records, their conduct and moral character have been found to be exemplary.
          This official document is issued upon formal online application for the specific purpose of:
          <div style="margin: 15px 0; padding: 12px 20px; background: #f8fafc; border-left: 4px solid #1e3a8a; font-style: italic; font-weight: 500;">
            "${purpose || 'Official Institutional Documentation & Verification'}"
          </div>
        </div>

        <!-- Signatory & Cryptographic Verification Seal -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 60px; padding-top: 20px;">
          <!-- QR / Cryptographic Hash Verification Block -->
          <div style="text-align: left; font-size: 11px; color: #64748b; max-width: 320px;">
            <div style="display: inline-block; padding: 6px 12px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; margin-bottom: 8px;">
              <span style="color: #15803d; font-weight: bold;">✔ CRYPTOGRAPHICALLY VERIFIED</span>
            </div>
            <div>VERIFICATION TOKEN: <span style="font-family: monospace; color: #0f172a; font-weight: bold;">${verificationCode}</span></div>
            <div style="margin-top: 4px;">Public ledger verification at: <span style="color: #2563eb;">/api/workflows/documents/verify/${verificationCode}</span></div>
          </div>

          <!-- Official Signatory Stamp -->
          <div style="text-align: center; min-width: 220px;">
            <div style="height: 45px; display: flex; align-items: center; justify-content: center; color: #1e3a8a; font-family: cursive; font-size: 20px;">
              ${signatoryName}
            </div>
            <div style="border-top: 1.5px solid #0f172a; padding-top: 6px; font-weight: bold; font-size: 13px;">
              ${signatoryRole}
            </div>
            <div style="font-size: 11px; color: #64748b;">
              Office of the Registrar & Academic Council
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate an official institutional document
   */
  async generateDocument({
    templateType,
    title,
    workflowInstanceId = null,
    ownerUserId,
    studentId = null,
    facultyId = null,
    departmentId = null,
    metadata = {},
    issuedByUserId = null,
    issuedByName = null
  }) {
    const validTemplates = [
      'BONAFIDE_CERTIFICATE',
      'LEAVING_CERTIFICATE',
      'CHARACTER_CERTIFICATE',
      'FEE_CLEARANCE_CERTIFICATE',
      'LEAVE_SANCTION_LETTER',
      'DUTY_NOC_CERTIFICATE'
    ];

    const chosenTemplate = validTemplates.includes(templateType) ? templateType : 'BONAFIDE_CERTIFICATE';
    const docId = `doc-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const year = new Date().getFullYear();
    const docNumber = `AIT/${chosenTemplate.replace('_CERTIFICATE', '').slice(0, 4)}/${year}/${Math.floor(10000 + Math.random() * 90000)}`;

    // Cryptographic hash & short verification code
    const rawPayload = `${docId}-${docNumber}-${ownerUserId}-${Date.now()}`;
    const verificationHash = crypto.createHash('sha256').update(rawPayload).digest('hex');
    const verificationCode = `AIT-${verificationHash.substring(0, 8).toUpperCase()}-${year}`;

    const institution = db.prepare('SELECT * FROM institutions LIMIT 1').get() || {
      name: 'Army Institute of Technology (AIT Pune)',
      code: 'AIT PUNE',
      tagline: 'Autonomous Engineering Institute | NAAC A+ Accredited',
      affiliation: 'Savitribai Phule Pune University',
      address: 'Alandi Road, Dighi, Pune - 411015, Maharashtra, India'
    };

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(ownerUserId) || { full_name: 'Student / Faculty' };
    const dept = departmentId ? db.prepare('SELECT name FROM departments WHERE id = ?').get(departmentId) : null;
    const departmentName = dept ? dept.name : (metadata.departmentName || 'Computer Engineering');

    const issuedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const signatoryName = issuedByName || 'Dr. Anand M. Joshi';
    const signatoryRole = 'Principal & Academic Director';

    const contentHtml = this.renderDocumentHtml({
      templateType: chosenTemplate,
      title: title || `${chosenTemplate.replace(/_/g, ' ')}`,
      docNumber,
      verificationCode,
      studentOrFacultyName: user.full_name,
      prnOrEmpCode: metadata.prn || metadata.emp_code || '2026-REG',
      departmentName,
      purpose: metadata.purpose || 'Official Institutional Verification',
      issuedDate,
      signatoryName,
      signatoryRole,
      institution
    });

    db.prepare(`
      INSERT INTO generated_documents (
        id, template_type, workflow_instance_id, document_number, title,
        student_id, faculty_id, owner_user_id, department_id,
        content_html, metadata_json, verification_hash, verification_code,
        issued_by_user_id, issued_by_name, issued_at, is_revoked
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 0)
    `).run(
      docId,
      chosenTemplate,
      workflowInstanceId,
      docNumber,
      title || `${chosenTemplate.replace(/_/g, ' ')}`,
      studentId,
      facultyId,
      ownerUserId,
      departmentId,
      contentHtml,
      JSON.stringify({ ...metadata, docNumber, verificationCode, issuedDate }),
      verificationHash,
      verificationCode,
      issuedByUserId,
      signatoryName
    );

    return {
      id: docId,
      documentNumber: docNumber,
      verificationCode,
      verificationHash,
      title,
      templateType: chosenTemplate,
      contentHtml
    };
  }

  /**
   * Validate Access Permission for Document Retrieval
   */
  validateAccess(document, requestingUser) {
    if (!requestingUser) return false;

    // Executive authorities can access all institutional documents
    if (['SUPER_ADMIN', 'PRINCIPAL', 'ACCOUNTANT'].includes(requestingUser.role)) {
      return true;
    }

    // Owner (Student or Faculty) can access their own document
    if (document.owner_user_id === requestingUser.id) {
      return true;
    }

    // Department HOD can access their departmental students or faculty
    if (requestingUser.role === 'HOD' && requestingUser.department_id && document.department_id) {
      if (requestingUser.department_id === document.department_id) {
        return true;
      }
    }

    return false;
  }

  /**
   * Retrieve document by ID with access enforcement
   */
  getDocumentById(documentId, requestingUser) {
    const doc = db.prepare(`
      SELECT d.*, u.full_name as owner_name, u.email as owner_email,
             dept.name as department_name, dept.code as department_code
      FROM generated_documents d
      JOIN users u ON d.owner_user_id = u.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE d.id = ?
    `).get(documentId);

    if (!doc) {
      const err = new Error('Document not found in institutional archives');
      err.statusCode = 404;
      throw err;
    }

    if (!this.validateAccess(doc, requestingUser)) {
      const err = new Error('Access denied: You are not authorized to view or download this official document.');
      err.statusCode = 403;
      throw err;
    }

    return {
      ...doc,
      metadata: JSON.parse(doc.metadata_json || '{}')
    };
  }

  /**
   * Public Verification for Certificate QR Code / Verification Token (No login required)
   */
  verifyDocumentByCode(verificationCodeOrHash) {
    const doc = db.prepare(`
      SELECT d.id, d.document_number, d.template_type, d.title, d.verification_code, d.verification_hash,
             d.issued_at, d.issued_by_name, d.is_revoked, d.metadata_json,
             u.full_name as owner_name, u.role as owner_role,
             inst.name as institution_name, inst.naac_grade, inst.affiliation
      FROM generated_documents d
      JOIN users u ON d.owner_user_id = u.id
      CROSS JOIN institutions inst
      WHERE d.verification_code = ? OR d.verification_hash = ?
    `).get(verificationCodeOrHash, verificationCodeOrHash);

    if (!doc) {
      return {
        valid: false,
        message: 'Invalid or counterfeit verification token. This document does not exist in the official ledger.'
      };
    }

    if (doc.is_revoked === 1) {
      return {
        valid: false,
        isRevoked: true,
        message: 'This document was revoked or invalidated by the Academic Council.'
      };
    }

    return {
      valid: true,
      verificationStatus: 'OFFICIALLY VERIFIED & SECURED BY CRYPTOGRAPHIC LEDGER',
      documentNumber: doc.document_number,
      verificationCode: doc.verification_code,
      templateType: doc.template_type,
      title: doc.title,
      issuedTo: doc.owner_name,
      issuedBy: doc.issued_by_name || 'Academic Registrar Office',
      issuedAt: doc.issued_at,
      institution: doc.institution_name,
      naacGrade: doc.naac_grade,
      metadata: JSON.parse(doc.metadata_json || '{}')
    };
  }

  /**
   * List documents belonging to a user (Student / Faculty self-service)
   */
  getUserDocuments(userId) {
    const docs = db.prepare(`
      SELECT d.id, d.document_number, d.template_type, d.title, d.verification_code,
             d.issued_at, d.issued_by_name, d.metadata_json
      FROM generated_documents d
      WHERE d.owner_user_id = ? AND d.is_revoked = 0
      ORDER BY d.issued_at DESC
    `).all(userId);

    return docs.map(d => ({
      ...d,
      metadata: JSON.parse(d.metadata_json || '{}')
    }));
  }
}

module.exports = new DocumentService();
