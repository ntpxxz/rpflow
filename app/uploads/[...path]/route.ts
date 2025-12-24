import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path: pathParts } = await params;
        const filename = pathParts.join("/");

        // Security check: prevent directory traversal
        if (filename.includes("..")) {
            return new NextResponse("Invalid path", { status: 400 });
        }

        const filePath = path.join(process.cwd(), "public", "uploads", filename);

        if (!fs.existsSync(filePath)) {
            return new NextResponse("File not found", { status: 404 });
        }

        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        let contentType = "application/octet-stream";

        switch (ext) {
            case ".png": contentType = "image/png"; break;
            case ".jpg":
            case ".jpeg": contentType = "image/jpeg"; break;
            case ".webp": contentType = "image/webp"; break;
            case ".gif": contentType = "image/gif"; break;
            case ".svg": contentType = "image/svg+xml"; break;
            case ".pdf": contentType = "application/pdf"; break;
        }

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        console.error("[UPLOADS_GET]", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
