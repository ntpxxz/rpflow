"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSession } from "next-auth/react";
import { User } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, User as UserIcon, Mail, Shield, Lock, Save, KeyRound } from "lucide-react";

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form States
    const [name, setName] = useState("");
    const [userMail, setUserMail] = useState("");

    // Password Change States
    const [currentPassword, setCurrentPassword] = useState(""); // Not actually used for verification in this simple implementation, but good for UI
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    useEffect(() => {
        if (status === "authenticated" && session?.user) {
            fetchUserData((session.user as any).id);
        } else if (status === "unauthenticated") {
            setLoading(false);
        }
    }, [status, session]);

    const fetchUserData = async (id: string) => {
        try {
            const res = await fetch(`/api/users?id=${id}`);
            if (res.ok) {
                const data = await res.json();
                setUser(data);
                setName(data.name);
                setUserMail(data.userMail || "");
            }
        } catch (error) {
            console.error("Failed to fetch user data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e: FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSaving(true);

        try {
            const res = await fetch("/api/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: user.id,
                    name,
                    userMail: userMail || null,
                }),
            });

            if (!res.ok) throw new Error("Failed to update profile");

            const updatedUser = await res.json();
            setUser(updatedUser);
            alert("Profile updated successfully!");
        } catch (error) {
            console.error(error);
            alert("Error updating profile.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async (e: FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (newPassword !== confirmPassword) {
            alert("New passwords do not match.");
            return;
        }

        if (newPassword.length < 6) {
            alert("Password must be at least 6 characters long.");
            return;
        }

        setIsSaving(true);

        try {
            const res = await fetch("/api/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: user.id,
                    password: newPassword,
                }),
            });

            if (!res.ok) throw new Error("Failed to update password");

            alert("Password changed successfully!");
            setNewPassword("");
            setConfirmPassword("");
            setCurrentPassword("");
        } catch (error) {
            console.error(error);
            alert("Error changing password.");
        } finally {
            setIsSaving(false);
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <p className="text-muted-foreground">User not found or not logged in.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10 max-w-4xl mx-auto font-sans">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage your account settings and preferences.</p>
            </div>

            <div className="grid grid-cols-1 gap-8">

                {/* Profile Information */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-blue-600" /> Personal Information
                        </CardTitle>
                        <CardDescription>Update your personal details.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                <div className="space-y-2">
                                    <Label htmlFor="email">Login Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="email"
                                            value={user.email}
                                            disabled
                                            className="pl-9 bg-slate-50 text-slate-500"
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Used for login. Cannot be changed.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="role">System Role</Label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="role"
                                            value={user.role}
                                            disabled
                                            className="pl-9 bg-slate-50 text-slate-500 capitalize"
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Your permission level in the system.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <div className="relative">
                                        <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="pl-9"
                                            placeholder="Your Full Name"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="userMail">Notification Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-orange-500" />
                                        <Input
                                            id="userMail"
                                            value={userMail}
                                            onChange={(e) => setUserMail(e.target.value)}
                                            className="pl-9 border-orange-200 focus:border-orange-400"
                                            placeholder="notify@company.com"
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Where you receive system notifications.</p>
                                </div>

                            </div>

                            <div className="flex justify-end pt-4">
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSaving}>
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Security / Password */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-orange-600" /> Security
                        </CardTitle>
                        <CardDescription>Manage your password.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">

                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="newPassword"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="pl-9"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="pl-9"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-start pt-2">
                                <Button type="submit" variant="outline" disabled={isSaving || !newPassword}>
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Update Password"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
