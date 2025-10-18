"use client";

import { useEffect, useState } from "react";
import { Request } from "@/models/request";
import Card from "@/components/Card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Reports() {
  const [requests, setRequests] = useState<Request[]>([]);

  useEffect(() => {
    fetch("/api/requests")
      .then((res) => res.json())
      .then((data) => setRequests(data));
  }, []);

  // Aggregate requests per department
  const departmentData = requests.reduce((acc: any, r) => {
    if (!r.department) r.department = "Unassigned";
    const existing = acc.find((d: any) => d.department === r.department);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ department: r.department, count: 1 });
    }
    return acc;
  }, []);

  // Aggregate monthly spending (assuming each request has quantity x price=100 for demo)
  const monthlyData = requests.reduce((acc: any, r) => {
    const month = new Date(r.createdAt).toLocaleString("default", { month: "short" });
    const existing = acc.find((d: any) => d.month === month);
    if (existing) {
      existing.spending += r.quantity * 100;
    } else {
      acc.push({ month, spending: r.quantity * 100 });
    }
    return acc;
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      {/* Requests per Department */}
      <Card title="Requests per Department" className="mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={departmentData}>
            <XAxis dataKey="department" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Monthly Spending */}
      <Card title="Monthly Spending">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="spending" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
