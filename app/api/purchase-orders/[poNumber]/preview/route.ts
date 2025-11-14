// app/api/purchase-orders/[poNumber]/send/route.ts
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

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      padding: 5px;
      background: white;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    .header-left h1 {
      font-size: 28px;
      color: #111827;
      margin-bottom: 8px;
    }
    .header-left h2 {
      font-size: 24px;
      color: #374151;
    }
    .header-right {
      text-align: right;
    }
    .header-right .title {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .header-right p {
      font-size: 13px;
      color: #6b7280;
    }
    .details-box {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .details-box h3 {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      margin-bottom: 10px;
      font-weight: 600;
    }
    .details-box p {
      font-size: 13px;
      color: #374151;
      margin-bottom: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    thead {
      background: #f3f4f6;
    }
    th {
      padding: 12px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      border: 1px solid #e5e7eb;
    }
    th.text-right {
      text-align: right;
    }
    td {
      padding: 12px;
      font-size: 13px;
      color: #1f2937;
      border: 1px solid #e5e7eb;
      vertical-align: middle;
    }
    td.text-right {
      text-align: right;
    }
    td.font-medium {
      font-weight: 500;
    }
    .item-image {
      width: 60px;
      height: 60px;
      object-fit: cover;
      border-radius: 4px;
      display: block;
    }
    .no-image {
      width: 60px;
      height: 60px;
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      color: #9ca3af;
      font-size: 10px;
    }
    .footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 30px;
    }
    .totals {
      width: 300px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 13px;
    }
    .total-row.final {
      border-top: 2px solid #d1d5db;
      margin-top: 10px;
      padding-top: 10px;
      font-size: 16px;
      font-weight: bold;
    }
    .thank-you {
      text-align: center;
      margin-top: 60px;
      font-size: 11px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>PURCHASE ORDER</h1>
      <h2>${po.poNumber}</h2>
      <p><strong>Sent Date:</strong> ${
      po.sentAt ? format(new Date(po.sentAt), "dd MMM yyyy") : "N/A"
    }</p>
    </div>
    <div class="header-right">
      <div class="title">IOT SECTION</div>
      <p>NMB, Spindle motor division</p>
      <p>Tel: 2472</p>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Item Name</th>
        <th>Image</th>
        <th class="text-right">Qty</th>
        <th class="text-right">Unit Price</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${po.items
        .map((item: any) => {
          return `
        <tr>
          <td class="font-medium">${item.itemName}</td>
          <td>
            ${
              item.imageUrl
                ? `<img src="${item.imageUrl}" alt="${item.itemName}" class="item-image" />`
                : '<div class="no-image">No Image</div>'
            }
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
    </tbody>
  </table>

  <div class="footer">
    <div class="totals">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>฿${totalAmount.toFixed(2)}</span>
      </div>
      <div class="total-row final">
        <span>Total Amount:</span>
        <span>฿${totalAmount.toFixed(2)}</span>
      </div>
    </div>
  </div>

  <div class="thank-you">
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
    
    return new NextResponse(pdfBuffer, {
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