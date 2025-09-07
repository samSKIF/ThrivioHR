"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    industry: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    superuserEmail: "",
    streetAddress: "",
    country: "",
    state: "",
    city: "",
    postalCode: "",
  });
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const res = await fetch("/api/corporate/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to create organization");
      router.push("/corporate/organizations");
    } catch (err: any) {
      setError(err.message ?? "Error creating organization");
    }
  }

  return (
    <div className="create-page">
      <h2>Create New Organization</h2>
      <p className="subheading">Set up a new tenant organization with initial admin user</p>
      <form onSubmit={handleSubmit} className="create-form">
        <section className="form-section">
          <h3>Organization Details</h3>
          <div className="field">
            <label>Organization Name *</label>
            <input name="name" value={form.name} onChange={handleChange} required />
          </div>
          <div className="field">
            <label>Industry *</label>
            <input name="industry" value={form.industry} onChange={handleChange} required />
          </div>
        </section>

        <section className="form-section">
          <h3>Contact Information</h3>
          <div className="field">
            <label>Contact Name *</label>
            <input name="contactName" value={form.contactName} onChange={handleChange} required />
          </div>
          <div className="field">
            <label>Contact Email *</label>
            <input name="contactEmail" type="email" value={form.contactEmail} onChange={handleChange} required />
          </div>
          <div className="field">
            <label>Contact Phone</label>
            <input name="contactPhone" value={form.contactPhone} onChange={handleChange} />
          </div>
          <div className="field">
            <label>Superuser Email *</label>
            <input name="superuserEmail" type="email" value={form.superuserEmail} onChange={handleChange} required />
          </div>
        </section>

        <section className="form-section">
          <h3>Organization Address</h3>
          <div className="field">
            <label>Street Address *</label>
            <input name="streetAddress" value={form.streetAddress} onChange={handleChange} required />
          </div>
          <div className="field-group">
            <div className="field">
              <label>Country *</label>
              <input name="country" value={form.country} onChange={handleChange} required />
            </div>
            <div className="field">
              <label>State/Province *</label>
              <input name="state" value={form.state} onChange={handleChange} required />
            </div>
            <div className="field">
              <label>City *</label>
              <input name="city" value={form.city} onChange={handleChange} required />
            </div>
            <div className="field">
              <label>ZIP/Postal Code *</label>
              <input name="postalCode" value={form.postalCode} onChange={handleChange} required />
            </div>
          </div>
        </section>

        {error && <p className="text-red-600 mb-4">{error}</p>}
        <div className="actions">
          <button type="button" className="secondary-button" onClick={() => router.push("/corporate/organizations")}>Cancel</button>
          <button type="submit" className="primary-button">Create Organization</button>
        </div>
      </form>
    </div>
  );
}
