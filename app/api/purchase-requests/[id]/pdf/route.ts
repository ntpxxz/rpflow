
export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { format } from "date-fns";

// Helper: Convert image to base64
async function convertImageToBase64(imagePath: string): Promise<string | null> {
    try {
        const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
        const filePath = path.join(process.cwd(), 'public', cleanPath);

        if (!fs.existsSync(filePath)) {
            console.error(`❌ [PDF] File not found: ${filePath}`);
            return null;
        }

        const imageBuffer = fs.readFileSync(filePath);
        const base64 = imageBuffer.toString('base64');
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

        return `data:${mimeType};base64,${base64}`;
    } catch (error) {
        console.error("Image conversion error:", error);
        return null;
    }
}

// HTML Generator for Purchase Request
function generatePRHtml(pr: any, items: any[]): string {
    const today = format(new Date(), 'dd MMM yyyy');
    const createdDate = format(new Date(pr.createdAt), 'dd MMM yyyy');
    const dueDate = pr.dueDate ? format(new Date(pr.dueDate), 'dd MMM yyyy') : '-';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { margin: 10mm 15mm; }
          body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 12px; color: #333; line-height: 1.4; }
          .header-container { display: flex; justify-content: space-between; align-items: top; margin-bottom: 20px; }
          .company-info h1 { margin: 0 0 5px 0; font-size: 20px; color: #000; text-transform: uppercase; }
          .company-info p { margin: 0; font-size: 11px; color: #555; }
          .doc-title { text-align: right; }
          .doc-title h2 { margin: 0; font-size: 24px; color: #ea580c; text-transform: uppercase; letter-spacing: 1px; } /* Orange color for PR */
          .doc-title span { display: block; font-size: 12px; color: #666; margin-top: 4px; }
          
          .info-box { border: 1px solid #e2e8f0; border-radius: 4px; padding: 15px; margin-bottom: 20px; background-color: #f8fafc; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .info-item label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block; }
          .info-item span { font-size: 13px; font-weight: 600; color: #0f172a; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background-color: #f1f5f9; color: #1e293b; font-weight: 700; text-align: left; padding: 10px; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
          .img-box { width: 48px; height: 48px; object-fit: contain; border: 1px solid #eee; padding: 2px; background: white; border-radius: 4px; }
          
          .footer-container { margin-top: 40px; page-break-inside: avoid; }
          .signature-section { display: flex; justify-content: space-between; margin-top: 40px; }
          .sig-box { width: 45%; text-align: center; }
          .sig-line { border-bottom: 1px solid #333; margin: 40px 20px 10px 20px; }
          .sig-label { font-size: 11px; font-weight: bold; text-transform: uppercase; }
          
          .page-footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 10px; }
          
          .total-row td { font-weight: bold; background-color: #fff7ed; border-top: 2px solid #fdba74; color: #9a3412; }
        </style>
      </head>
      <body>
        <div class="header-container">
           <div class="company-info">
              <h1>MinebeaMitsumi (Thailand)</h1>
              <p>IOT Section, Spindle Motor Division</p>
              <p>1/1 Moo 7 Phaholyothin Rd, Km.51, Ayutthaya 13180</p>
              <p>Tel: 2472 | Email: nattapon.m@minebea.co.th</p>
           </div>
           <div class="doc-title">
              <h2>Purchase Request</h2>
              <span>Document No: <strong>${pr.id}</strong></span>
              <span>Date: <strong>${createdDate}</strong></span>
           </div>
        </div>

        <div class="info-box">
          <div class="info-grid">
            <div class="info-item">
              <label>Requester</label>
              <span>${pr.user.name}</span>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${pr.user.email}</div>
            </div>
            <div class="info-item" style="text-align: right;">
              <label>Due Date</label>
              <span>${dueDate}</span>
              <div style="margin-top: 5px;">
                <span style="background-color: ${pr.status === 'Approved' ? '#dcfce7' : '#ffedd5'}; color: ${pr.status === 'Approved' ? '#166534' : '#9a3412'}; padding: 2px 8px; border-radius: 99px; font-size: 10px; text-transform: uppercase;">
                  ${pr.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th width="40" style="text-align:center;">#</th>
              <th width="60" style="text-align:center;">Image</th>
              <th>Item Description</th>
              <th width="60" style="text-align:center;">Qty</th>
              <th width="100" style="text-align:right;">Unit Price</th>
              <th width="100" style="text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, index) => `
              <tr>
                <td style="text-align:center; color:#666;">${index + 1}</td>
                <td style="text-align:center;">${item.imageUrl ? `<img src="${item.imageUrl}" class="img-box" />` : '-'}</td>
                <td>
                    <span style="font-weight:bold; display:block;">${item.itemName}</span>
                    <span style="font-size:11px; color:#64748b;">${item.detail || item.inventoryDetails?.description || ''}</span>
                </td>
                <td style="text-align:center;"><strong>${item.quantity}</strong></td>
                <td style="text-align:right;">฿${Number(item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td> 
                <td style="text-align:right; font-weight:bold;">฿${(item.quantity * Number(item.unitPrice)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td> 
              </tr>
            `).join('')}
             <tr class="total-row">
                <td colspan="5" style="text-align:right; padding-right: 20px;">Grand Total (THB):</td>
                <td style="text-align:right; font-size: 14px;">฿${Number(pr.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
             </tr>
          </tbody>
        </table>

        <div class="footer-container">
            <div class="signature-section">
                <div class="sig-box">
                    <div class="sig-line"></div>
                    <div class="sig-label">Requested By</div>
                    <div style="font-size: 12px; margin-top: 5px;">${pr.user.name}</div>
                    <div style="font-size: 10px; color: #666;">${createdDate}</div>
                </div>
                <div class="sig-box">
                    <div class="sig-line"></div>
                    <div class="sig-label">Approved By</div>
                    <div style="font-size: 12px; margin-top: 5px;">Manager / Approver</div>
                    <div style="font-size: 10px; color: #666;">Date: _______________</div>
                </div>
            </div>     
        </div>
        <div class="page-footer">System Generated by RPFlow | Printed on ${today}</div>
      </body>
      </html>
  `;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const pr = await prisma.purchaseRequest.findUnique({
            where: { id },
            include: {
                user: true,
                items: true,
            }
        });

        if (!pr) {
            return NextResponse.json({ message: "Purchase Request not found" }, { status: 404 });
        }

        // Convert images
        const itemsWithImages = await Promise.all(pr.items.map(async (item) => {
            let imgUrl = null;
            if (item.imageUrl) {
                if (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('data:')) {
                    imgUrl = item.imageUrl;
                }
                else if (item.imageUrl.startsWith('/') || item.imageUrl.startsWith('uploads')) {
                    imgUrl = await convertImageToBase64(item.imageUrl);
                }
            }
            return {
                ...item,
                imageUrl: imgUrl,
            };
        }));

        // Generate HTML
        const html = generatePRHtml(pr, itemsWithImages);

        // Generate PDF
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 1600 });
        await page.setContent(html, { waitUntil: 'networkidle0' });

        await page.evaluate(() => Promise.all(Array.from(document.images).filter(img => !img.complete).map(img => new Promise(res => { img.onload = img.onerror = res; }))));
        // await new Promise(r => setTimeout(r, 500));

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        });

        await browser.close();

        return new NextResponse(pdfBuffer as any, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="PR-${pr.id}.pdf"`
            }
        });

    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ message: "Failed to generate PDF", error: error.message }, { status: 500 });
    }
}
