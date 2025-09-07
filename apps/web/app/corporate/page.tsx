"use client";
import React, { useEffect, useState } from "react";

interface DashboardData {
  organizations: number;
  users: number;
  subscriptions: number;
  revenue: number;
  capacity: number;
  status: string;
}

const cardData = [
  { key: "organizations", label: "Organizations", color: "bg-blue-500" },
  { key: "users", label: "Users", color: "bg-green-500" },
  { key: "subscriptions", label: "Subscriptions", color: "bg-purple-500" },
  { key: "capacity", label: "Capacity", color: "bg-orange-500" },
  { key: "revenue", label: "Revenue", color: "bg-red-500" },
  { key: "status", label: "Status", color: "bg-indigo-500" },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/corporate/dashboard");
        if (!res.ok) throw new Error("Failed to load dashboard");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message ?? "Error loading dashboard");
      }
    }
    fetchData();
  }, []);

  if (error) {
    return <p className="text-red-600 mb-4">{error}</p>;
  }

  if (!data) {
    return <p className="text-gray-600">Loading dashboard…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-6">
        {cardData.map(({ key, label, color }) => {
          const value = key === "revenue" ? `$${(data as any)[key]}` : (data as any)[key];
          
          return (
            <div key={key} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
                <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>
                  <div className="w-6 h-6 bg-white rounded-sm"></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}