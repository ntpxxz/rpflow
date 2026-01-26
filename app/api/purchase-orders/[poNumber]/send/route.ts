// app/api/purchase-orders/[poNumber]/send/route.ts
export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

// ฟังก์ชันแปลง file path เป็น base64 data URL
async function convertImageToBase64(imagePath: string): Promise<string | null> {
  try {
    const cleanPath = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
    const filePath = path.join(process.cwd(), "public", cleanPath);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      return null;
    }

    const imageBuffer = fs.readFileSync(filePath);
    const base64 = imageBuffer.toString("base64");
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === ".png" ? "image/png" : ext === ".gif" ? "image/gif" : ext === ".webp" ? "image/webp" : "image/jpeg";

    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`❌ Error converting image:`, error);
    return null;
  }
}

// ฟังก์ชันดึงชื่อจากอีเมล
function getNameFromEmail(email: string): string | null {
  const match = email.match(/^([^@]+)/);
  if (match) {
    const namePart = match[1];
    const name = namePart.replace(/[._]/g, " ");
    return name.charAt(0).toUpperCase() + name.slice(1).toUpperCase();
  }
  return null;
}

// สร้าง HTML template
function generatePOHtml(po: any, logoBase64: string | null): string {
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
          .company-info .logo { height: 50px; margin-bottom: 10px; }
          .company-info h1 { margin: 0 0 5px 0; font-size: 20px; color: #000; text-transform: uppercase; }
          .company-info p { margin: 0; font-size: 11px; color: #555; }
          .doc-title { text-align: right; }
          .doc-title h2 { margin: 0; font-size: 24px; color: #1a56db; text-transform: uppercase; letter-spacing: 1px; }
          .doc-title span { display: block; font-size: 12px; color: #666; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background-color: #f1f5f9; color: #1e293b; font-weight: 700; text-align: left; padding: 10px; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
          .img-box { width: 48px; height: 48px; object-fit: contain; border: 1px solid #eee; padding: 2px; background: white; border-radius: 4px; }
          .page-footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
      </head>       
      <body>
        <div class="header-container">
           <div class="company-info">
              ${logoBase64 ? `<img src="${logoBase64}" class="logo" />` : '<h1>MinebeaMitsumi (Thailand)</h1>'}
              <p>IOT Section, Spindle Motor Division</p>
              <p>1/1 Moo 7 Phaholyothin Rd, Km.51, Ayutthaya 13180</p>
              <p>Tel: 2472 | Email: nattapon.m@minebea.co.th</p>
           </div>
           <div class="doc-title">
              <h2>Purchase Order</h2>
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
              <th style="text-align:right;">Qty</th>
              <th style="text-align:right;">Unit Price</th>
              <th style="text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${po.items
      .map((item: any, index: number) => {
        return `
              <tr>
                <td style="text-align:center; color:#666;">${index + 1}</td>
                <td style="text-align:center;">${item.imageUrl ? `<img src="${item.imageUrl}" class="img-box" />` : "-"}</td>
                <td>
                    <span style="font-weight:bold; display:block;">${item.itemName}</span>
                </td>
                <td style="text-align:right;">${item.quantity}</td>
                <td style="text-align:right;">฿${Number(item.unitPrice).toFixed(2)}</td>
                <td style="text-align:right; font-weight:bold;">฿${(item.quantity * Number(item.unitPrice)).toFixed(2)}</td>
              </tr>
            `;
      })
      .join("")}
              <tr>
                <td colspan="4" style="text-align:right; font-weight:bold;"></td>
                <td colspan="1" style="text-align:left; font-weight:bold;">Total:</td>
                <td colspan="1" style="text-align:right; font-weight:bold; padding-top:15px;">฿${totalAmount.toFixed(2)}</td>
             </tr>
          </tbody>
        </table>
        <div class="thank-you" style="text-align:center; font-size:12px; color:#555; margin-top:30px;">
          Thank you for your business!
        </div>
        <div class="page-footer">System Generated by RPFlow</div>
      </body>
</html>
  `;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ poNumber: string }> }
) {
  const { poNumber } = await params;
  const { recipientEmail, ccEmails } = await req.json();

  if (!recipientEmail) {
    return NextResponse.json({ message: "Recipient email is required" }, { status: 400 });
  }

  try {
    const poDetails = await prisma.purchaseOrder.findUnique({
      where: { poNumber: poNumber },
      include: { items: true },
    });

    if (!poDetails) throw new Error("PO not found");

    // 1. แปลง Logo
    const logoBase64 = await convertImageToBase64('uploads/Logo_minebeamitsumi.png');

    // 2. แปลงรูปภาพสินค้า
    const itemsWithImages = await Promise.all(
      poDetails.items.map(async (item) => {
        let imageDataUrl = null;
        if (item.imageUrl) {
          if (Buffer.isBuffer(item.imageUrl)) {
            imageDataUrl = `data:image/jpeg;base64,${item.imageUrl.toString("base64")}`;
          } else if (typeof item.imageUrl === "string") {
            if (item.imageUrl.startsWith("data:")) {
              imageDataUrl = item.imageUrl;
            } else if (item.imageUrl.startsWith("/") || item.imageUrl.startsWith("uploads")) {
              imageDataUrl = await convertImageToBase64(item.imageUrl);
            }
          }
        }
        return { ...item, imageUrl: imageDataUrl };
      })
    );

    // 3. สร้าง HTML
    const html = generatePOHtml({ ...poDetails, items: itemsWithImages }, logoBase64);

    // 4. สร้าง PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600 });
    await page.setContent(html, { waitUntil: "networkidle0" });

    await page.evaluate(() => Promise.all(Array.from(document.images).filter(img => !img.complete).map(img => new Promise(res => { img.onload = img.onerror = res; }))));
    await new Promise((resolve) => setTimeout(resolve, 500));

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    });
    await browser.close();

    // 5. ส่ง Email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });

    const extractedName = getNameFromEmail(recipientEmail);
    const greetingTH = extractedName ? `เรียน คุณ ${extractedName},` : "เรียน ผู้จำหน่าย,";

    const mailOptions = {
      from: `IOT Purchase Request System <${GMAIL_USER}>`,
      to: recipientEmail,
      cc: ccEmails && ccEmails.length > 0 ? ccEmails : undefined,
      subject: `[ส่งใบสั่งซื้อ] IOT ${poNumber} - IOT Section`,
      html: `
        <p>${greetingTH}</p>
        <p>ทางแผนก IOT ขอสั่งซื้อสินค้าตามใบสั่งซื้อ (IOT PO) เลขที่ <strong>${poNumber}</strong></p>
        <p>กรุณาตรวจสอบรายละเอียดตามไฟล์ PDF ที่แนบมานี้</p>
        <br>
        <p>รบกวนท่านโปรดยืนยันการได้รับเอกสารฉบับนี้ และแจ้งกำหนดการจัดส่งสินค้าให้ทางเราทราบด้วยครับ</p>
        <p>หากมีข้อสงสัยประการใด สามารถติดต่อกลับได้ที่อีเมลนี้</p>
        <br>
        <p>ขอแสดงความนับถือ,<br>
        แผนก IOT</p>
        <p>Tel: 2472</p>
      `,
      attachments: [
        {
          filename: `${poNumber}.pdf`,
          content: Buffer.from(pdfBuffer),
          contentType: "application/pdf",
        },
      ],
    };
    await transporter.sendMail(mailOptions);

    // 6. อัปเดตสถานะ
    await prisma.purchaseOrder.update({
      where: { poNumber: poNumber },
      data: { status: "Sent", sentAt: new Date() }
    });

    return NextResponse.json({ message: "Email sent successfully!" });
  } catch (error: any) {
    console.error("\n❌ [PO_SEND_ERROR]", error);
    return NextResponse.json({ message: "Failed to send email", error: error.message }, { status: 500 });
  }
}
