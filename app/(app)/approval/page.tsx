"use client";

import { useState, useEffect } from "react";
import { Request } from "@/models/request";
import Button from "@/components/Button";
import Card from "@/components/Card";

export default function Approval() {
  const [requests, setRequests] = useState<Request[]>([]);

  // Fetch all requests
  useEffect(() => {
    fetch("/api/requests")
      .then((res) => res.json())
      .then((data) => setRequests(data));
  }, []);

  // Handle Approve / Reject
  const handleUpdateStatus = async (id: string, status: "Approved" | "Rejected") => {
    const res = await fetch("/api/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const updatedRequest = await res.json();

    setRequests((prev) =>
      prev.map((r) => (r.id === updatedRequest.id ? updatedRequest : r))
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Approval Requests</h1>
      <Card title="Pending Requests">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">Item Name</th>
              <th className="border px-4 py-2">Quantity</th>
              <th className="border px-4 py-2">Description</th>
              <th className="border px-4 py-2">Status</th>
              <th className="border px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests
              .filter((r) => r.status === "Pending")
              .map((r) => (
                <tr key={r.id} className="text-center">
                  <td className="border px-4 py-2">{r.itemName}</td>
                  <td className="border px-4 py-2">{r.quantity}</td>
                  <td className="border px-4 py-2">{r.description}</td>
                  <td className="border px-4 py-2">{r.status}</td>
                  <td className="border px-4 py-2 space-x-2">
                    <Button onClick={() => handleUpdateStatus(r.id, "Approved")}>
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleUpdateStatus(r.id, "Rejected")}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Reject
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
