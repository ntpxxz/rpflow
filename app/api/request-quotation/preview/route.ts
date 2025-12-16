// app/api/request-quotation/preview/route.ts
export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

// Helper: แปลงรูปภาพ (Updated to match send route robustness)
async function convertImageToBase64(imagePath: string): Promise<string | null> {
  try {
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    const filePath = path.join(process.cwd(), 'public', cleanPath);

    console.log(`📂 [Preview] Trying to read image from: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ [Preview] File not found: ${filePath}`);
      return null;
    }

    const imageBuffer = fs.readFileSync(filePath);
    const base64 = imageBuffer.toString('base64');
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

    console.log(`✅ [Preview] Image converted successfully (${mimeType})`);
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error("Image conversion error:", error);
    return null;
  }
}

// HTML Generator
function generateRFQHtml(rfqNumber: string, items: any[]): string {
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

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
          .doc-title h2 { margin: 0; font-size: 24px; color: #1a56db; text-transform: uppercase; letter-spacing: 1px; }
          .doc-title span { display: block; font-size: 12px; color: #666; margin-top: 4px; }
          .info-grid { display: table; width: 100%; margin-bottom: 20px; border-collapse: separate; border-spacing: 10px 0; }
          .info-col { display: table-cell; width: 48%; vertical-align: top; border: 1px solid #ddd; border-radius: 4px; padding: 15px; background-color: #fcfcfc; }
          .info-label { font-size: 10px; font-weight: bold; color: #888; text-transform: uppercase; margin-bottom: 5px; display: block; }
          .info-line { border-bottom: 1px dashed #ccc; padding-bottom: 2px; margin-bottom: 4px; min-height: 16px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background-color: #f1f5f9; color: #1e293b; font-weight: 700; text-align: left; padding: 10px; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
          .img-box { width: 48px; height: 48px; object-fit: contain; border: 1px solid #eee; padding: 2px; background: white; border-radius: 4px; }
          .footer-container { margin-top: 40px; page-break-inside: avoid; }
          .terms-box { border: 1px solid #e2e8f0; padding: 10px; border-radius: 4px; margin-bottom: 20px; font-size: 11px; background-color: #fff; }
          .signature-grid { display: table; width: 100%; border-spacing: 20px 0; }
          .sig-box { display: table-cell; width: 50%; border-top: 1px solid #333; padding-top: 10px; text-align: center; }
          .page-footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 10px; }
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
              <h2>Request For Quotation</h2>
              <span>Document No: <strong>${rfqNumber || 'DRAFT'}</strong></span>
              <span>Date: <strong>${today}</strong></span>
           </div>
        </div>
        <table>
          <thead>
            <tr>
              <th width="40" style="text-align:center;">#</th>
              <th width="60">Image</th>
              <th>Item Description</th>
              <th width="60" style="text-align:center;">Qty</th>
              <th width="80" style="text-align:right;">Unit Price</th>
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
                    <span style="font-size:11px; color:#64748b;">${item.detail || ''}</span>
                </td>
                <td style="text-align:center;"><strong>${item.qty}</strong></td>
                <td style="background-color: #fafafa;"></td> 
                <td style="background-color: #fafafa;"></td> 
              </tr>
            `).join('')}
             <tr>
                <td colspan="4" style="text-align:right; font-weight:bold; padding-top:15px;">Total (Excl. VAT):</td>
                <td colspan="2" style="background-color: #fafafa;"></td>
             </tr>
          </tbody>
        </table>
        <div class="footer-container">
            <div class="terms-box">
                <b>Note / Remarks:</b><br/>
                1. Please provide quotation by: _______________________<br/>
                2. Specify lead time and payment terms.<br/>
                3. This is a system generated document.<br/>
            </div>            
        </div>
        <div class="page-footer">System Generated by RPFlow</div>
      </body>
      </html>
  `;
}

export async function POST(req: NextRequest) {
  try {
    const { itemIds, rfqNumber } = await req.json();

    const itemsData = await prisma.requestItem.findMany({
      where: { id: { in: itemIds } },
      include: { request: true }
    });

    // 2. แปลงรูปภาพ
    const itemsWithImages = await Promise.all(itemsData.map(async (item) => {
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
        qty: item.quantity - item.quantityOrdered
      };
    }));

    // สร้าง HTML
    const html = generateRFQHtml(rfqNumber || 'DRAFT', itemsWithImages);

    // 3. สร้าง PDF
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    await page.evaluate(() => Promise.all(Array.from(document.images).filter(img => !img.complete).map(img => new Promise(res => { img.onload = img.onerror = res; }))));
    await new Promise(r => setTimeout(r, 500));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    });

    await browser.close();

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${rfqNumber}.pdf"`
      }
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: "Failed to generate RFQ PDF", error: error.message }, { status: 500 });
  }
}