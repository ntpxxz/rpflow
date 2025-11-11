import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { google } from "googleapis";

// 🔻 (ข้อมูลลับ) ต้องไปใส่ใน .env.local
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN; // 👈 คุณต้องไปเอา Refresh Token มาเก็บไว้
const MY_EMAIL = "bomzza01@gmail.com"; // 👈 บัญชี Gmail ที่คุณใช้ส่ง

export async function POST(
  req: NextRequest,
  { params }: { params: { poNumber: string } }
) {
  const { poNumber } = params;
  const { recipientEmail, pdfBase64 } = await req.json();

  if (!recipientEmail || !pdfBase64) {
    return NextResponse.json(
      { message: "Recipient email and PDF data are required" },
      { status: 400 }
    );
  }

  try {
    // 1. สร้าง OAuth2 client
    const oAuth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET
    );
    oAuth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

    // 2. ขอ Access Token ใหม่ (Token นี้จะหมดอายุเร็ว)
    const { token: accessToken } = await oAuth2Client.getAccessToken();
    if (!accessToken) {
      throw new Error("Failed to get Google access token");
    }

    // 3. สร้าง "ตัวส่งอีเมล" (Transporter) ด้วย Nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: MY_EMAIL,
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        refreshToken: GOOGLE_REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    // 4. ส่งอีเมล (โครงสร้างของ Nodemailer)
    const mailOptions = {
      from: `Procurement <${MY_EMAIL}>`, // 👈 ส่งจากบัญชี Gmail ของคุณ
      to: recipientEmail,
      subject: `Purchase Order Confirmation: ${poNumber}`,
      html: `<p>Please find our Purchase Order (${poNumber}) attached.</p><p>Thank you,</p><p>IOT Section</p>`, // 👈 (เราไม่ได้ใช้ React Email แล้ว ต้องเขียน HTML เอง)
      attachments: [
        {
          filename: `${poNumber}.pdf`,
          content: pdfBase64,
          encoding: "base64", // 👈 Nodemailer ใช้ 'encoding'
          contentType: "application/pdf"
        },
      ],
    };

    // 5. สั่งส่ง
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: "Email sent successfully!" });

  } catch (error) {
    console.error("[PO_SEND_GMAIL_ERROR]", error);
    return NextResponse.json(
      { message: "Failed to send email via Gmail", error: error.message },
      { status: 500 }
    );
  }
}