// app/api/request-quotation/send/route.ts
export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

// 1. ฟังก์ชันแปลงรูปภาพ (ใช้เหมือน PO)
async function convertImageToBase64(imagePath: string): Promise<string | null> {
  try {
    const cleanPath = imagePath.startsWith("/")
      ? imagePath.slice(1)
      : imagePath;
    const filePath = path.join(process.cwd(), "public", cleanPath);
    if (!fs.existsSync(filePath)) return null;
    const imageBuffer = fs.readFileSync(filePath);
    const base64 = imageBuffer.toString("base64");
    const ext = path.extname(filePath).toLowerCase();
    const mimeType =
      ext === ".png"
        ? "image/png"
        : ext === ".gif"
          ? "image/gif"
          : ext === ".webp"
            ? "image/webp"
            : "image/jpeg";
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error("Image conversion error:", error);
    return null;
  }
}

// 2. ฟังก์ชันดึงชื่อจากอีเมล (เหมือน PO)
function getNameFromEmail(email: string): string | null {
  const match = email.match(/^([^@]+)/);
  if (match) {
    const namePart = match[1];
    const name = namePart.replace(/[._]/g, " ");
    return name.charAt(0).toUpperCase() + name.slice(1).toUpperCase();
  }
  return null;
}

// 3. HTML Template สำหรับ PDF (ใช้ Layout เดียวกับ Preview เพื่อความสวยงาม)
function generateRFQHtml(rfqNumber: string, items: any[]): string {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
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
              <span>Document No: <strong>${rfqNumber}</strong></span>
              <span>Date: <strong>${today}</strong></span>
           </div>
        </div>
        <table>
          <thead>
            <tr>
              <th width="40" style="text-align:center;">#</th>
              <th width="60" style="text-align:start;">Item</th>
              <th></th>
              <th width="60" style="text-align:center;">Qty</th>
              <th width="80" style="text-align:right;">Unit Price</th>
              <th width="100" style="text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item, index) => `
              <tr>
                <td style="text-align:center; color:#666;">${index + 1}</td>
                <td style="text-align:center;">${item.imageUrl ? `<img src="${item.imageUrl}" class="img-box" />` : "-"}</td>
                <td>
                    <span style="font-weight:bold; display:block;">${item.itemName}</span>
                    <span style="font-size:11px; color:#64748b;">${item.detail || ""}</span>
                </td>
                <td style="text-align:center;"><strong>${item.qty}</strong></td>
                <td style="background-color: #fafafa;"></td> 
                <td style="background-color: #fafafa;"></td> 
              </tr>
            `
              )
              .join("")}
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
            </div>
        </div>
        <div class="page-footer">System Generated by RPFlow</div>
      </body>
      </html>
    `;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { itemIds, recipientEmail, ccEmail, rfqNumber } = body;

    if (!itemIds || !recipientEmail) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log(`\n📧 Sending RFQ: ${rfqNumber} to ${recipientEmail}`);

    // 1. ดึงข้อมูลสินค้า
    const itemsData = await prisma.requestItem.findMany({
      where: { id: { in: itemIds } },
    });

    // 2. แปลงรูปภาพสำหรับ PDF
    const itemsWithImages = await Promise.all(
      itemsData.map(async (item) => {
        let imgUrl = null;
        if (item.imageUrl) {
          if (
            item.imageUrl.startsWith("http") ||
            item.imageUrl.startsWith("data:")
          ) {
            imgUrl = item.imageUrl;
          } else if (
            item.imageUrl.startsWith("/") ||
            item.imageUrl.startsWith("uploads")
          ) {
            imgUrl = await convertImageToBase64(item.imageUrl);
          }
        }
        return {
          ...item,
          imageUrl: imgUrl,
          qty: item.quantity - item.quantityOrdered,
        };
      })
    );

    // 3. สร้าง PDF
    console.log(`📄 Generating PDF for RFQ...`);
    const html = generateRFQHtml(rfqNumber, itemsWithImages);

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600 });
    await page.setContent(html, { waitUntil: "networkidle0" });

    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise((res) => {
                img.onload = img.onerror = res;
              })
          )
      )
    );
    await new Promise((r) => setTimeout(r, 500));

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    });
    await browser.close();

    // 4. สร้างเนื้อหาอีเมล (เหมือน PO)
    const extractedName = getNameFromEmail(recipientEmail);
    const greetingTH = extractedName
      ? `เรียน คุณ ${extractedName},`
      : "เรียน ผู้จำหน่าย,";

    // 5. ส่งอีเมล
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: GMAIL_USER,
      to: recipientEmail,
      cc: ccEmail || undefined,
      subject: `[ขอใบเสนอราคา] ${rfqNumber} - IOT Section`,
      html: `
                <p>${greetingTH}</p>
                <p>ทางแผนก IOT มีความประสงค์ขอใบเสนอราคา (Request for Quotation) เลขที่ <strong>${rfqNumber}</strong></p>
                <p>กรุณาตรวจสอบรายละเอียดรายการสินค้าตามไฟล์ PDF ที่แนบมานี้</p>
                <br>
                <p>รบกวนท่านโปรดจัดทำใบเสนอราคาและแจ้งกำหนดการจัดส่งสินค้า (Lead Time) ให้ทางเราทราบด้วยครับ</p>
                <p>หากมีข้อสงสัยประการใด สามารถติดต่อกลับได้ที่อีเมลนี้</p>
                <br>
                <p>ขอแสดงความนับถือ,<br>
                แผนก IOT</p>
                <p>Tel: 2472</p>
            `,
      attachments: [
        {
          filename: `${rfqNumber}.pdf`,
          content: Buffer.from(pdfBuffer), // Convert Uint8Array to Buffer
          contentType: "application/pdf",
        },
      ],
    });

    console.log(`✅ Email sent successfully!`);

    // 6. อัปเดตสถานะใน Database
    await prisma.requestItem.updateMany({
      where: { id: { in: itemIds } },
      data: { isQuotationRequested: true },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Error sending RFQ:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
