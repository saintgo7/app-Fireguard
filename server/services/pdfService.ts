import puppeteer from 'puppeteer';
import type { Inspection, Building, User, InspectionItem, ComplianceRule } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from '../objectStorage';
import { ObjectPermission } from '../objectAcl';

interface InspectionReportData {
  inspection: Inspection;
  building: Building;
  inspector: User;
  items: InspectionItem[];
  userId: string;
}

interface ComplianceReportData {
  building?: Building | null;
  inspections: Inspection[];
  rules: ComplianceRule[];
  startDate?: Date;
  endDate?: Date;
}

// Helper function to securely convert signature to base64 with permission checks
async function convertSignatureToBase64(signatureSource: string, userId: string): Promise<string | null> {
  try {
    // If already a data URL, return as-is
    if (signatureSource.startsWith('data:')) {
      return signatureSource;
    }
    
    const objectStorageService = new ObjectStorageService();
    
    // Normalize and validate object storage path
    const normalizedPath = objectStorageService.normalizeObjectEntityPath(signatureSource);
    
    // Only allow object storage paths, reject external URLs to prevent SSRF
    if (!normalizedPath.startsWith('/objects/')) {
      console.error('Signature source is not a valid object storage path:', signatureSource);
      return null;
    }
    
    // Get the object file securely
    const objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
    
    // Check if user has permission to access this signature
    const hasAccess = await objectStorageService.canAccessObjectEntity({
      userId,
      objectFile,
      requestedPermission: ObjectPermission.READ
    });
    
    if (!hasAccess) {
      console.error('User does not have permission to access signature:', userId, normalizedPath);
      return null;
    }
    
    // Securely download the object content
    const [metadata] = await objectFile.getMetadata();
    const stream = objectFile.createReadStream();
    
    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    const base64 = buffer.toString('base64');
    const mimeType = metadata.contentType || 'image/png';
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      console.error('Signature object not found:', signatureSource);
    } else {
      console.error('Error securely converting signature to base64:', error);
    }
    return null;
  }
}

export async function generateInspectionReport(data: InspectionReportData): Promise<Buffer> {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });
  const page = await browser.newPage();

  // Convert signature to base64 if provided (with secure access control)
  let signatureBase64 = null;
  if (data.inspection.signatureUrl) {
    signatureBase64 = await convertSignatureToBase64(data.inspection.signatureUrl, data.userId);
  }

  const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <style>
            body { 
                font-family: 'Noto Sans KR', sans-serif; 
                margin: 0; 
                padding: 20px; 
                line-height: 1.6;
            }
            .header { 
                text-align: center; 
                border-bottom: 2px solid #e5e7eb; 
                padding-bottom: 20px; 
                margin-bottom: 30px; 
            }
            .title { 
                font-size: 24px; 
                font-weight: bold; 
                color: #1f2937; 
                margin-bottom: 10px; 
            }
            .subtitle { 
                font-size: 16px; 
                color: #6b7280; 
            }
            .section { 
                margin-bottom: 30px; 
            }
            .section-title { 
                font-size: 18px; 
                font-weight: bold; 
                color: #374151; 
                border-bottom: 1px solid #d1d5db; 
                padding-bottom: 5px; 
                margin-bottom: 15px; 
            }
            .info-grid { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 15px; 
            }
            .info-item { 
                display: flex; 
                justify-content: space-between; 
            }
            .label { 
                font-weight: bold; 
                color: #374151; 
            }
            .value { 
                color: #6b7280; 
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 15px; 
            }
            th, td { 
                border: 1px solid #d1d5db; 
                padding: 8px; 
                text-align: left; 
            }
            th { 
                background-color: #f9fafb; 
                font-weight: bold; 
            }
            .status-pass { color: #16a34a; }
            .status-fail { color: #dc2626; }
            .status-attention { color: #ea580c; }
            .footer { 
                margin-top: 50px; 
                text-align: center; 
                color: #6b7280; 
                font-size: 12px; 
            }
            .signature-section {
                margin-top: 40px;
                page-break-inside: avoid;
            }
            .signature-container {
                border: 1px solid #d1d5db;
                border-radius: 8px;
                padding: 20px;
                background-color: #f9fafb;
                text-align: center;
                min-height: 120px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            }
            .signature-image {
                max-width: 300px;
                max-height: 80px;
                border: 1px solid #e5e7eb;
                background-color: white;
                padding: 10px;
                border-radius: 4px;
            }
            .signature-label {
                font-size: 14px;
                font-weight: bold;
                color: #374151;
                margin-top: 10px;
            }
            .signature-date {
                font-size: 12px;
                color: #6b7280;
                margin-top: 5px;
            }
            .no-signature {
                color: #9ca3af;
                font-style: italic;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title">소방 안전 점검 보고서</div>
            <div class="subtitle">Fire Safety Inspection Report</div>
        </div>

        <div class="section">
            <div class="section-title">기본 정보</div>
            <div class="info-grid">
                <div class="info-item">
                    <span class="label">건물명:</span>
                    <span class="value">${data.building.name}</span>
                </div>
                <div class="info-item">
                    <span class="label">주소:</span>
                    <span class="value">${data.building.address}</span>
                </div>
                <div class="info-item">
                    <span class="label">점검 유형:</span>
                    <span class="value">${data.inspection.type}</span>
                </div>
                <div class="info-item">
                    <span class="label">점검 일정:</span>
                    <span class="value">${new Date(data.inspection.scheduledDate).toLocaleDateString('ko-KR')}</span>
                </div>
                <div class="info-item">
                    <span class="label">점검자:</span>
                    <span class="value">${data.inspector.name}</span>
                </div>
                <div class="info-item">
                    <span class="label">상태:</span>
                    <span class="value">${data.inspection.status}</span>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">점검 항목</div>
            <table>
                <thead>
                    <tr>
                        <th>장비 ID</th>
                        <th>상태</th>
                        <th>비고</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.items.map(item => `
                        <tr>
                            <td>${item.equipmentId}</td>
                            <td class="status-${item.status}">${item.status}</td>
                            <td>${item.notes || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        ${data.inspection.notes ? `
        <div class="section">
            <div class="section-title">특이사항</div>
            <p>${data.inspection.notes}</p>
        </div>
        ` : ''}

        ${signatureBase64 ? `
        <div class="section signature-section">
            <div class="section-title">점검자 서명</div>
            <div class="signature-container">
                <img src="${signatureBase64}" alt="점검자 서명" class="signature-image" />
                <div class="signature-label">점검자: ${data.inspector.name}</div>
                <div class="signature-date">서명일: ${new Date().toLocaleDateString('ko-KR')}</div>
            </div>
        </div>
        ` : `
        <div class="section signature-section">
            <div class="section-title">점검자 서명</div>
            <div class="signature-container">
                <div class="no-signature">서명이 제공되지 않았습니다.</div>
                <div class="signature-label">점검자: ${data.inspector.name}</div>
                <div class="signature-date">생성일: ${new Date().toLocaleDateString('ko-KR')}</div>
            </div>
        </div>
        `}

        <div class="footer">
            <p>생성일: ${new Date().toLocaleDateString('ko-KR')} | 소방점검관리 시스템</p>
        </div>
    </body>
    </html>
  `;

  await page.setContent(html);
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20px',
      right: '20px',
      bottom: '20px',
      left: '20px'
    }
  });

  await browser.close();
  return Buffer.from(pdf);
}

export async function generateComplianceReport(data: ComplianceReportData): Promise<Buffer> {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });
  const page = await browser.newPage();

  const filteredInspections = data.inspections.filter(inspection => {
    if (data.building && inspection.buildingId !== data.building.id) return false;
    if (data.startDate && new Date(inspection.scheduledDate) < data.startDate) return false;
    if (data.endDate && new Date(inspection.scheduledDate) > data.endDate) return false;
    return true;
  });

  const completedInspections = filteredInspections.filter(i => i.status === 'completed').length;
  const totalInspections = filteredInspections.length;
  const complianceRate = totalInspections > 0 ? (completedInspections / totalInspections * 100).toFixed(1) : '0';

  const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <style>
            body { 
                font-family: 'Noto Sans KR', sans-serif; 
                margin: 0; 
                padding: 20px; 
                line-height: 1.6;
            }
            .header { 
                text-align: center; 
                border-bottom: 2px solid #e5e7eb; 
                padding-bottom: 20px; 
                margin-bottom: 30px; 
            }
            .title { 
                font-size: 24px; 
                font-weight: bold; 
                color: #1f2937; 
                margin-bottom: 10px; 
            }
            .subtitle { 
                font-size: 16px; 
                color: #6b7280; 
            }
            .section { 
                margin-bottom: 30px; 
            }
            .section-title { 
                font-size: 18px; 
                font-weight: bold; 
                color: #374151; 
                border-bottom: 1px solid #d1d5db; 
                padding-bottom: 5px; 
                margin-bottom: 15px; 
            }
            .stats-grid { 
                display: grid; 
                grid-template-columns: repeat(3, 1fr); 
                gap: 20px; 
                margin-bottom: 30px; 
            }
            .stat-card { 
                border: 1px solid #d1d5db; 
                border-radius: 8px; 
                padding: 20px; 
                text-align: center; 
            }
            .stat-number { 
                font-size: 24px; 
                font-weight: bold; 
                color: #1f2937; 
            }
            .stat-label { 
                color: #6b7280; 
                margin-top: 5px; 
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 15px; 
            }
            th, td { 
                border: 1px solid #d1d5db; 
                padding: 8px; 
                text-align: left; 
            }
            th { 
                background-color: #f9fafb; 
                font-weight: bold; 
            }
            .footer { 
                margin-top: 50px; 
                text-align: center; 
                color: #6b7280; 
                font-size: 12px; 
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title">규정 준수 보고서</div>
            <div class="subtitle">Compliance Report</div>
            ${data.building ? `<p>건물: ${data.building.name}</p>` : ''}
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${totalInspections}</div>
                <div class="stat-label">총 점검 수</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${completedInspections}</div>
                <div class="stat-label">완료된 점검</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${complianceRate}%</div>
                <div class="stat-label">준수율</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">점검 현황</div>
            <table>
                <thead>
                    <tr>
                        <th>점검 ID</th>
                        <th>유형</th>
                        <th>일정</th>
                        <th>상태</th>
                        <th>완료일</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredInspections.map(inspection => `
                        <tr>
                            <td>${inspection.id.substring(0, 8)}</td>
                            <td>${inspection.type}</td>
                            <td>${new Date(inspection.scheduledDate).toLocaleDateString('ko-KR')}</td>
                            <td>${inspection.status}</td>
                            <td>${inspection.completedDate ? new Date(inspection.completedDate).toLocaleDateString('ko-KR') : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <div class="section-title">규정 규칙</div>
            <table>
                <thead>
                    <tr>
                        <th>코드</th>
                        <th>설명</th>
                        <th>장비 유형</th>
                        <th>주기 (일)</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.rules.map(rule => `
                        <tr>
                            <td>${rule.code}</td>
                            <td>${rule.description}</td>
                            <td>${rule.equipmentType}</td>
                            <td>${rule.frequency}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>생성일: ${new Date().toLocaleDateString('ko-KR')} | 소방점검관리 시스템</p>
        </div>
    </body>
    </html>
  `;

  await page.setContent(html);
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20px',
      right: '20px',
      bottom: '20px',
      left: '20px'
    }
  });

  await browser.close();
  return Buffer.from(pdf);
}
