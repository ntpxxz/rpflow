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
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Users, Mail, Shield, User as UserIcon } from "lucide-react";

export default function Settings() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("Requester");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleAddUser = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });

      if (!res.ok) throw new Error("Failed to create user");

      const newUser = await res.json();
      setUsers((prev) => [newUser, ...prev]);

      // Reset form
      setName("");
      setEmail("");
      setRole("Requester");
    } catch (error) {
      console.error(error);
      alert("Error adding user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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

        {/* 1. Add User Form (Left Column) */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-200 shadow-sm sticky top-6">
            <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-orange-600" /> Create New User
              </CardTitle>
              <CardDescription>Add a new user to the system.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form className="space-y-4" onSubmit={handleAddUser}>

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
                  <Label htmlFor="email">Email Address</Label>
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

                <Button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white shadow-sm mt-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Create Account
                </Button>
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
                      <TableHead className="h-11 pl-6 text-xs font-bold text-slate-500 uppercase tracking-wide w-[250px]">User</TableHead>
                      <TableHead className="h-11 text-xs font-bold text-slate-500 uppercase tracking-wide">Email</TableHead>
                      <TableHead className="h-11 text-xs font-bold text-slate-500 uppercase tracking-wide text-right pr-6">Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-32 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                        </TableCell>
                      </TableRow>
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
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
                          <TableCell className="py-3 pr-6 text-right">
                            <Badge variant={getRoleBadgeVariant(u.role)} className="capitalize">
                              {u.role}
                            </Badge>
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
    </div>
  );
}