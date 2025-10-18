"use client";

import { useState, useEffect, FormEvent } from "react";
import { User } from "@/models/users";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Card from "@/components/Card";

export default function Settings() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<User["role"]>("User");

  useEffect(() => {
    fetch("/api/users").then((res) => res.json()).then(setUsers);
  }, []);

  const handleAddUser = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role}),
    });
    const newUser = await res.json();
    setUsers((prev) => [...prev, newUser]);
    setName(""); setEmail(""); setRole("User");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Add User */}
      <Card title="Add User" className="mb-6">
        <form className="space-y-4" onSubmit={handleAddUser}>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div>
            <label className="font-medium">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as User["role"])} className="border rounded-lg px-3 py-2 w-full">
              <option value="User">User</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <Button type="submit">Add User</Button>
        </form>
      </Card>

      {/* User List */}
      <Card title="Users">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">Name</th>
              <th className="border px-4 py-2">Email</th>
              <th className="border px-4 py-2">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="text-center">
                <td className="border px-4 py-2">{u.name}</td>
                <td className="border px-4 py-2">{u.email}</td>
                <td className="border px-4 py-2">{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
