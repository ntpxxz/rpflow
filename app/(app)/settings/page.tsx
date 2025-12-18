// app/(app)/settings/page.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { User } from "@prisma/client"; // Use Prisma Type directly for consistency
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Users, Mail, Shield, User as UserIcon, Lock, Pencil, Trash2, KeyRound } from "lucide-react";

export default function Settings() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userMail, setUserMail] = useState("");
  const [role, setRole] = useState<string>("Requester");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Mode State
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Reset Password State
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    setLoading(true);
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUsers(data);
        } else {
          console.error("Invalid users data:", data);
          setUsers([]);
        }
      })
      .catch((err) => console.error("Failed to load users:", err))
      .finally(() => setLoading(false));
  };

  const handleSaveUser = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingUser) {
        // UPDATE Existing User
        const body: any = {
          id: editingUser.id,
          name,
          email,
          role,
          userMail: userMail || null,
        };
        // Only send password if it's not empty
        if (password) {
          body.password = password;
        }

        const res = await fetch("/api/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error("Failed to update user");

        const updatedUser = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
        alert("User updated successfully!");
      } else {
        // CREATE New User
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password,
            role,
            userMail: userMail || undefined
          }),
        });

        if (!res.ok) throw new Error("Failed to create user");

        const newUser = await res.json();
        setUsers((prev) => [newUser, ...prev]);
        alert("User created successfully!");
      }

      resetForm();
    } catch (error) {
      console.error(error);
      alert("Error saving user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete user");

      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (error) {
      console.error(error);
      alert("Error deleting user.");
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setUserMail(user.userMail || "");
    setPassword(""); // Reset password field as we don't show the hash
  };

  const openResetPassword = (user: User) => {
    setResetPasswordUser(user);
    setNewPassword("");
  };

  const handlePasswordResetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser || !newPassword) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: resetPasswordUser.id,
          password: newPassword,
        }),
      });

      if (!res.ok) throw new Error("Failed to reset password");

      alert("Password reset successfully!");
      setResetPasswordUser(null);
      setNewPassword("");
    } catch (error) {
      console.error(error);
      alert("Error resetting password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setName("");
    setEmail("");
    setPassword("");
    setUserMail("");
    setRole("Requester");
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case "admin": return "destructive"; // Red
      case "approver": return "default"; // Black/Dark
      case "purchaser": return "secondary"; // Gray
      default: return "outline"; // Outline for Requester
    }
  };

  return (
    <div className="space-y-6 pb-10 font-sans">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage user access and system configurations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* 1. Add/Edit User Form (Left Column) */}
        <div className="lg:col-span-1 space-y-6">
          <Card className={`border-slate-200 shadow-sm sticky top-6 ${editingUser ? "border-orange-400 ring-1 ring-orange-400" : ""}`}>
            <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                {editingUser ? (
                  <>
                    <UserIcon className="h-4 w-4 text-orange-600" /> Edit User
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 text-orange-600" /> Create New User
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {editingUser ? "Update user details below." : "Add a new user to the system."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form className="space-y-4" onSubmit={handleSaveUser}>

                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="name"
                      placeholder="e.g. Somchai Jai-dee"
                      className="pl-9"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Login Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@company.com"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">
                    {editingUser ? "New Password (Optional)" : "Password"}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder={editingUser ? "Leave blank to keep current" : "••••••••"}
                      className="pl-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required={!editingUser}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">System Role</Label>
                  <Select
                    value={role}
                    onValueChange={setRole}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="role" className="w-full pl-9 relative">
                      <Shield className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Requester">Requester</SelectItem>
                      <SelectItem value="Approver">Approver</SelectItem>
                      <SelectItem value="Purchaser">Purchaser</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    Determines what the user can see and do.
                  </p>
                </div>

                {/* User Notification Email - Available for all roles */}
                <div className="space-y-2">
                  <Label htmlFor="userMail">Notification Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-orange-500" />
                    <Input
                      id="userMail"
                      type="email"
                      placeholder="notify@company.com"
                      className="pl-9 border-orange-200 focus:border-orange-400"
                      value={userMail}
                      onChange={(e) => setUserMail(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Email for receiving notifications. If not set, login email will be used.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  {editingUser && (
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={resetForm}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="submit"
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : editingUser ? (
                      "Update User"
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" /> Create Account
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* 2. User List (Right Column) */}
        <div className="lg:col-span-2">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-500" /> User Management
                </CardTitle>
                <CardDescription>List of all registered users.</CardDescription>
              </div>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                {users.length} Users
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative w-full overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent border-b border-slate-100">
                      <TableHead className="h-11 pl-6 text-xs font-bold text-slate-500 uppercase tracking-wide w-[180px]">User</TableHead>
                      <TableHead className="h-11 text-xs font-bold text-slate-500 uppercase tracking-wide">Login Email</TableHead>
                      <TableHead className="h-11 text-xs font-bold text-slate-500 uppercase tracking-wide">Notify Email</TableHead>
                      <TableHead className="h-11 text-xs font-bold text-slate-500 uppercase tracking-wide text-center">Role</TableHead>
                      <TableHead className="h-11 text-xs font-bold text-slate-500 uppercase tracking-wide text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                        </TableCell>
                      </TableRow>
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                          No users found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((u) => (
                        <TableRow key={u.id} className="hover:bg-slate-50/80 border-b border-slate-100 transition-colors">
                          <TableCell className="py-3 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-sm font-bold border border-orange-200">
                                {u.name?.[0]?.toUpperCase() || "U"}
                              </div>
                              <span className="font-medium text-sm text-foreground">{u.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-sm text-muted-foreground font-normal">
                            {u.email}
                          </TableCell>
                          <TableCell className="py-3 text-sm text-muted-foreground font-normal">
                            {u.userMail ? (
                              <span className="text-orange-600 font-medium">{u.userMail}</span>
                            ) : (
                              <span className="text-slate-400 italic">-</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <Badge variant={getRoleBadgeVariant(u.role)} className="capitalize">
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 pr-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-500 hover:text-orange-600 hover:bg-orange-50"
                                onClick={() => openResetPassword(u)}
                                title="Reset Password"
                              >
                                <KeyRound className="h-4 w-4" />
                                <span className="sr-only">Reset Password</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                onClick={() => handleEdit(u)}
                                title="Edit User"
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDelete(u.id)}
                                title="Delete User"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={(open) => !open && setResetPasswordUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter a new password for <b>{resetPasswordUser?.name}</b>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordResetSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetPasswordUser(null)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>Reset Password</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}