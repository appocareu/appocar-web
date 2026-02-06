"use client";

import type { ChangeEvent } from "react";
import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/components/I18nProvider";

export function SellClient() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    price: "",
    year: "",
    mileageKm: "",
    fuel: "Petrol",
    transmission: "Automatic",
    powerKw: "",
    location: "",
    body: "Sedan",
    description: "",
    color: "",
    drive: "FWD",
    doors: "4",
    seats: "5"
  });

  const update = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const submit = async () => {
    setStatus(null);
    if (!supabaseClient) {
      setStatus(t("sell.statusMissing"));
      return;
    }
    if (!user) {
      setStatus(t("sell.statusSignIn"));
      return;
    }
    const { error } = await supabaseClient.from("listings").insert({
      title: form.title,
      price: Number(form.price),
      currency: "EUR",
      year: Number(form.year),
      mileage_km: Number(form.mileageKm),
      fuel: form.fuel,
      transmission: form.transmission,
      power_kw: Number(form.powerKw),
      location: form.location,
      images: [
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1600&auto=format&fit=crop"
      ],
      seller_name: user.email ?? "Seller",
      seller_type: "Private",
      body: form.body,
      color: form.color,
      drive: form.drive,
      doors: Number(form.doors),
      seats: Number(form.seats),
      description: form.description,
      features: ["New listing"]
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus(t("sell.statusPublished"));
  };

  return (
    <div className="glass" style={{ padding: "2rem", display: "grid", gap: "1rem" }}>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <input className="input" placeholder={t("sell.titleField")} value={form.title} onChange={update("title")} />
        <input className="input" placeholder={t("sell.year")} type="number" value={form.year} onChange={update("year")} />
        <input className="input" placeholder={t("sell.mileage")} type="number" value={form.mileageKm} onChange={update("mileageKm")} />
        <input className="input" placeholder={t("sell.price")} type="number" value={form.price} onChange={update("price")} />
        <input className="input" placeholder={t("sell.power")} type="number" value={form.powerKw} onChange={update("powerKw")} />
        <select className="input" value={form.fuel} onChange={update("fuel")}>
          <option value="Petrol">{t("filters.petrol")}</option>
          <option value="Diesel">{t("filters.diesel")}</option>
          <option value="Hybrid">{t("filters.hybrid")}</option>
          <option value="Plug-in Hybrid">{t("filters.plugInHybrid")}</option>
          <option value="Electric">{t("filters.electric")}</option>
        </select>
        <select className="input" value={form.transmission} onChange={update("transmission")}>
          <option value="Automatic">{t("filters.automatic")}</option>
          <option value="Manual">{t("filters.manual")}</option>
        </select>
        <select className="input" value={form.body} onChange={update("body")}>
          <option value="Sedan">{t("filters.sedan")}</option>
          <option value="SUV">{t("filters.suv")}</option>
          <option value="Hatchback">{t("filters.hatchback")}</option>
          <option value="Coupe">{t("filters.coupe")}</option>
          <option value="Wagon">{t("filters.wagon")}</option>
          <option value="Convertible">{t("filters.convertible")}</option>
        </select>
        <input className="input" placeholder={t("sell.location")} value={form.location} onChange={update("location")} />
        <input className="input" placeholder={t("sell.color")} value={form.color} onChange={update("color")} />
        <select className="input" value={form.drive} onChange={update("drive")}>
          <option>FWD</option>
          <option>RWD</option>
          <option>AWD</option>
        </select>
        <input className="input" placeholder={t("sell.doors")} type="number" value={form.doors} onChange={update("doors")} />
        <input className="input" placeholder={t("sell.seats")} type="number" value={form.seats} onChange={update("seats")} />
      </div>
      <textarea className="input" rows={5} placeholder={t("sell.describe")} value={form.description} onChange={update("description")} />
      {status && <div className="muted">{status}</div>}
      <button className="primary" onClick={submit}>{t("sell.publish")}</button>
    </div>
  );
}
