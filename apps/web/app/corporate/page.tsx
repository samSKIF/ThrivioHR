"use client";
import React, { useEffect, useState } from "react";
import { Building, Users, Gift, ShoppingCart, DollarSign, LineChart } from "lucide-react";

interface DashboardData {
  organizations: number;
  users: number;
  subscriptions: number;
  revenue: number;
  capacity: number;
  status: string;
}

const cardDefinitions = [
  { key: "organizations", label: "Organizations", Icon: Building, color: "bg-blue-100 text-blue-600" },
  { key: "users", label: "Users", Icon: Users, color: "bg-green-100 text-green-600" },
  { key: "subscriptions", label: "Subscriptions", Icon: Gift, color: "bg-purple-100 text-purple-600" },
  { key: "capacity", label: "Capacity", Icon: ShoppingCart, color: "bg-orange-100 text-orange-600" },
  { key: "revenue", label: "Revenue", Icon: DollarSign, color: "bg-red-100 text-red-600" },
  { key: "status", label: "Status", Icon: LineChart, color: "bg-indigo-100 text-indigo-600" },
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

  return (
    <div>
      <h2 className="dashboard-heading">Overview</h2>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {!data ? (
        <p>Loading dashboard…</p>
      ) : (
        <div className="dashboard-grid">
          {cardDefinitions.map(({ key, label, Icon, color }) => (
            <div key={key} className="dashboard-card">
              <div className={`icon-badge ${color}`}>
                <Icon size={20} />
              </div>
              <span className="card-label">{label}</span>
              <span className="card-value">{key === "revenue" ? `$${(data as any)[key]}` : (data as any)[key]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}