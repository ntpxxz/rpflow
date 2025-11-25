// app/api/purchase-orders/[poNumber]/preview/route.ts
export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";


// ฟังก์ชันแปลง file path เป็น base64 data URL
async function convertImageToBase64(imagePath: string): Promise<string | null> {
  try {
    // ลบ leading slash ถ้ามี
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;

    // สร้าง full path
    const filePath = path.join(process.cwd(), 'public', cleanPath);

    console.log(`📂 Trying to read image from: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      return null;
    }

    // อ่านไฟล์
    const imageBuffer = fs.readFileSync(filePath);
    const base64 = imageBuffer.toString('base64');

    // ตรวจสอบ extension เพื่อกำหนด MIME type
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png'
      : ext === '.gif' ? 'image/gif'
        : ext === '.webp' ? 'image/webp'
          : 'image/jpeg';

    console.log(`✅ Image converted successfully (${mimeType})`);
    return `data:${mimeType};base64,${base64}`;

  } catch (error) {
    console.error(`❌ Error converting image:`, error);
    return null;
  }
}

// สร้าง HTML template
function generatePOHtml(po: any): string {
  const totalAmount = po.items.reduce(
    (sum: number, item: any) => sum + item.quantity * Number(item.unitPrice),
    0
  );
  const poNumber = po.poNumber;

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
                    <h2>Request For Order</h2>  
                    <span>Document No: <strong>${poNumber}</strong></span>
                    <span>Date: <strong>${format(new Date(), "dd MMM yyyy")}</strong></span>
                </div>              
        </div>
        <table>
          <thead>
            <tr>
              <th width="40" style="text-align:center;">#</th>
              <th width="60" style="text-align:start;">Item</th>
              <th></th>
              <th class="text-right">Qty</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${po.items
      .map((item: { itemName: any; imageUrl: any; quantity: number; unitPrice: any; }, index: number) => {
        return `
              <tr>
                <td style="text-align:center; color:#666;">${index + 1}</td>
                <td style="text-align:center;">${item.imageUrl ? `<img src="${item.imageUrl}" class="img-box" />` : "-"}</td>
                <td>
                    <span style="font-weight:bold; display:block;">${item.itemName}</span>
                </td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">฿${Number(item.unitPrice).toFixed(2)}</td>
                <td class="text-right font-medium">฿${(
            item.quantity * Number(item.unitPrice)
          ).toFixed(2)}</td>
              </tr>
            `;
      })
      .join("")}
              <tr>
                <td colspan="4" style="text-align:right; font-weight:bold;"></td>
                <td colspan="1" style="text-align:left; font-weight:bold;">Total:</td>
                <td colspan="1" class="text-right"style="font-weight:bold; padding-top:15px;">฿${totalAmount.toFixed(2)}</td>
                
             </tr>
          </tbody>
        </table>
        <div class="footer">         
        </div>
        <div class="thank-you ote" style="text-align:center; font-size:12px; color:#555; margin-top:30px;">
          Thank you for your business!
        </div>
      </body>
</html>
  `;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ poNumber: string }> }
) {
  const { poNumber } = await params;


  try {
    console.log(`\n📦 Processing PO: ${poNumber}`);

    // 1. ดึงข้อมูล PO
    const poDetails = await prisma.purchaseOrder.findUnique({
      where: { poNumber: poNumber },
      include: { items: true },
    });

    if (!poDetails) {
      throw new Error("PO not found");
    }

    // 2. แปลงรูปภาพเป็น base64
    console.log(`\n🖼️  Converting ${poDetails.items.length} images...`);

    const itemsWithImages = await Promise.all(
      poDetails.items.map(async (item) => {
        let imageDataUrl = null;

        if (item.imageUrl) {
          // ถ้าเป็น Buffer
          if (Buffer.isBuffer(item.imageUrl)) {
            const base64 = item.imageUrl.toString('base64');
            imageDataUrl = `data:image/jpeg;base64,${base64}`;
            console.log(`✅ Converted Buffer to base64 for: ${item.itemName}`);
          }
          // ถ้าเป็น file path
          else if (typeof item.imageUrl === 'string') {
            if (item.imageUrl.startsWith('data:')) {
              // Already base64
              imageDataUrl = item.imageUrl;
              console.log(`✅ Already base64 for: ${item.itemName}`);
            } else if (item.imageUrl.startsWith('/') || item.imageUrl.startsWith('uploads')) {
              // File path - need to convert
              imageDataUrl = await convertImageToBase64(item.imageUrl);
              if (imageDataUrl) {
                console.log(`✅ Converted file to base64 for: ${item.itemName}`);
              } else {
                console.log(`❌ Failed to convert for: ${item.itemName}`);
              }
            }
          }
        }

        return { ...item, imageUrl: imageDataUrl };
      })
    );

    const poWithImages = { ...poDetails, items: itemsWithImages };

    // Debug summary
    const imageStats = itemsWithImages.filter(i => i.imageUrl).length;
    console.log(`\n📊 Image conversion complete: ${imageStats}/${itemsWithImages.length} images ready`);

    // 3. สร้าง HTML
    const html = generatePOHtml(poWithImages);

    // 4. สร้าง PDF ด้วย Puppeteer
    console.log(`\n🎨 Generating PDF...`);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // รอให้รูปภาพโหลดเสร็จ
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise((resolve) => {
                img.onload = img.onerror = resolve;
              })
          )
      );
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });

    await browser.close();
    console.log(`✅ PDF generated successfully`);

    console.log(`\n✅ Sending PDF buffer to client...`);

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${poNumber}.pdf"`,
      },
    });

  } catch (error) {
    // (แก้ไข) ปรับ Error log
    console.error("\n❌ [PO_PREVIEW_ERROR]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to generate PDF preview", error: errorMessage },
      { status: 500 }
    );
  }
}