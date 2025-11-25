"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export default function LogoutPage() {
    useEffect(() => {
        signOut({ callbackUrl: "/login" });
    }, []);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Signing out...</p>
        </div>
    );
}
