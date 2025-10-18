"use client";

import { useState, useEffect, FormEvent } from "react";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { Request } from "@/models/request";

export default function Purchase() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Fetch existing requests
  useEffect(() => {
    fetch("/api/requests")
      .then((res) => res.json())
      .then((data) => setRequests(data));
  }, []);

  // Handle form submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const formData: Partial<Request> = {
      itemName,
      quantity,
      description,
    };

    // TODO: handle file upload if needed

    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const newRequest = await res.json();
    setRequests((prev) => [...prev, newRequest]);

    // Reset form
    setItemName("");
    setQuantity(1);
    setDescription("");
    setFile(null);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Purchase Request</h1>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-white p-6 rounded-2xl shadow-md mb-6"
      >
        <Input
          label="Item Name"
          type="text"
          placeholder="Enter item name"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          required
        />
        <Input
          label="Quantity"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          required
        />
        <Input
          label="Description"
          type="text"
          placeholder="Optional description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input
          label="Upload Image"
          type="file"
          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
        />
        <Button type="submit">Submit Request</Button>
      </form>

      {/* Table of requests */}
      <div className="bg-white p-6 rounded-2xl shadow-md">
        <h2 className="text-xl font-semibold mb-4">Requests</h2>
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">Item Name</th>
              <th className="border px-4 py-2">Quantity</th>
              <th className="border px-4 py-2">Description</th>
              <th className="border px-4 py-2">Status</th>
              <th className="border px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="text-center">
                <td className="border px-4 py-2">{r.itemName}</td>
                <td className="border px-4 py-2">{r.quantity}</td>
                <td className="border px-4 py-2">{r.description}</td>
                <td className="border px-4 py-2">{r.status}</td>
                <td className="border px-4 py-2">
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
