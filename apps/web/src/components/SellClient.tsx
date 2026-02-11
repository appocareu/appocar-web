"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/components/I18nProvider";
import { api } from "@/lib/api";
import { BRANDS, fetchBrandsFromBackend, fetchModelsFromBackend } from "@/lib/brands";

const TOTAL_STEPS = 8;

const EQUIPMENT = [
  "AC",
  "Climate",
  "Camera",
  "Heated seats",
  "LED",
  "Leather",
  "Park sensors",
  "CarPlay",
  "Panoramic roof",
  "Adaptive cruise"
];

export function SellClient() {
  const { user, signUp, signInWithProvider } = useAuth();
  const { t } = useI18n();
  const [status, setStatus] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    accountName: "",
    email: "",
    password: "",
    phone: "",
    sellerType: "private",
    verifyAccount: false,
    title: "",
    make: "",
    model: "",
    year: "",
    price: "",
    mileageKm: "",
    fuel: "Petrol",
    transmission: "Automatic",
    body: "Sedan",
    vin: "",
    powerKw: "",
    drive: "FWD",
    color: "",
    doors: "4",
    seats: "5",
    co2: "",
    consumption: "",
    evRangeKm: "",
    evBatteryKwh: "",
    evChargeType: "",
    evFastChargeKw: "",
    options: [] as string[],
    description: "",
    dealType: "buy",
    uploads: [] as string[],
    delivery: true,
    verifyListing: false,
    premium: false,
    promoShare: false,
    promoAlerts: true,
    location: "",
    lat: "",
    lng: "",
    owners: "",
    whatsapp: ""
  });
  const draftKey = "appocar_sell_draft_v2";
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ label: string; lat: number; lng: number }>>([]);
  const [brandOptions, setBrandOptions] = useState(BRANDS);
  const [modelOptions, setModelOptions] = useState<string[]>([]);

  const update = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = event.target.type === "checkbox" ? (event.target as HTMLInputElement).checked : event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleOption = (value: string) => {
    setForm((prev) => {
      const next = new Set(prev.options);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return { ...prev, options: Array.from(next) };
    });
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (files.length > 20) {
      setStatus(t("sell.uploadLimit"));
      return;
    }
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          setStatus(t("sell.uploadLimit"));
          continue;
        }
        const data = new FormData();
        data.append("file", file);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}/api/uploads`, {
          method: "POST",
          body: data,
          credentials: "include"
        });
        if (!res.ok) continue;
        const json = await res.json();
        if (json?.url) uploaded.push(json.url);
      }
      if (uploaded.length) {
        setForm((prev) => ({ ...prev, uploads: [...prev.uploads, ...uploaded] }));
      }
    } catch {
      setStatus(t("sell.uploadFailed"));
    }
  };

  const suggestedPrice = useMemo(() => {
    const year = Number(form.year);
    const mileage = Number(form.mileageKm);
    if (!year || !mileage) return null;
    const age = Math.max(0, 2026 - year);
    const base = Math.max(6000, 42000 - age * 1800 - mileage * 0.02);
    return Math.round(base / 100) * 100;
  }, [form.year, form.mileageKm]);

  const autoFillVin = () => {
    if (!form.vin || form.vin.length < 6) {
      setStatus(t("sell.vinHint"));
      return;
    }
    const run = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
        const res = await fetch(`${base}/api/vin?vin=${encodeURIComponent(form.vin)}`, {
          credentials: "include"
        });
        if (!res.ok) {
          setStatus(t("sell.vinFailed"));
          return;
        }
        const payload = await res.json();
        const data = payload?.data ?? payload;
        const source = data?.vehicle || data?.car || data;
        const make = source?.make || source?.brand || source?.manufacturer;
        const model = source?.model || source?.model_name;
        const year = source?.year || source?.productionYear || source?.firstRegistrationYear;
        const mileage = source?.mileage || source?.odometer || source?.km || source?.kilometers;
        setForm((prev) => ({
          ...prev,
          make: prev.make || make || "",
          model: prev.model || model || "",
          year: prev.year || (year ? String(year) : ""),
          mileageKm: prev.mileageKm || (mileage ? String(mileage) : "")
        }));
        setStatus(t("sell.vinFilled"));
      } catch {
        setStatus(t("sell.vinFailed"));
      }
    };
    run();
  };

  const generateDescription = () => {
    const parts = [
      form.make && form.model ? `${form.make} ${form.model}` : "",
      form.year ? `${form.year}` : "",
      form.mileageKm ? `${form.mileageKm} km` : "",
      form.fuel ? `${form.fuel}` : "",
      form.transmission ? `${form.transmission}` : ""
    ].filter(Boolean);
    const options = form.options.length ? form.options.join(", ") : t("sell.descOptionsFallback");
    const text = `${t("sell.descLead")} ${parts.join(" · ")}. ${t("sell.descOptions")} ${options}. ${
      form.delivery ? t("sell.descDelivery") : ""
    }`;
    setForm((prev) => ({ ...prev, description: text }));
  };

  const validateStep = (nextStep: number) => {
    if (nextStep <= 1) return null;
    if (step === 1 && !user) {
      if (!form.accountName || !form.email || !form.password || !form.phone) {
        return t("sell.requiredAccount");
      }
    }
    if (step === 2) {
      if (!form.make || !form.model || !form.year || !form.price || !form.mileageKm || !form.location) {
        return t("sell.requiredBasics");
      }
    }
    if (step === 5 && form.uploads.length < 2) {
      return t("sell.minPhotos");
    }
    if (step === 6 && !form.description) {
      return t("sell.requiredDescription");
    }
    return null;
  };

  const handleNext = () => {
    const error = validateStep(step + 1);
    if (error) {
      setStatus(error);
      return;
    }
    setStatus(null);
    setStep((prev) => Math.min(TOTAL_STEPS, prev + 1));
  };

  const handlePrev = () => {
    setStatus(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const submit = async () => {
    setStatus(null);
    if (!form.title) {
      setStatus(t("sell.requiredTitle"));
      return;
    }
    if (!form.make || !form.model || !form.year || !form.price || !form.mileageKm || !form.location) {
      setStatus(t("sell.requiredBasics"));
      return;
    }
    if (form.uploads.length < 2) {
      setStatus(t("sell.minPhotos"));
      return;
    }
    if (!form.description || !form.phone) {
      setStatus(t("sell.requiredDescription"));
      return;
    }

    try {
      await api("/api/listings", {
        method: "POST",
        json: {
          title: form.title,
          price: Number(form.price),
          currency: "EUR",
          year: Number(form.year),
          mileageKm: Number(form.mileageKm),
          fuel: form.fuel,
          transmission: form.transmission,
          powerKw: Number(form.powerKw),
          location: form.location,
          lat: form.lat ? Number(form.lat) : undefined,
          lng: form.lng ? Number(form.lng) : undefined,
          images: form.uploads,
          sellerName: user?.email ?? form.accountName ?? "Seller",
          sellerEmail: user?.email ?? null,
          sellerType: form.sellerType === "dealer" ? "Dealer" : "Private",
          body: form.body,
          color: form.color,
          drive: form.drive,
          doors: Number(form.doors),
          seats: Number(form.seats),
          description: form.description,
          features: [
            ...(form.delivery ? ["Delivery available"] : []),
            ...(form.verifyListing ? ["Verified listing"] : []),
            ...form.options
          ],
          vin: form.vin,
          owners: form.owners,
          phone: form.phone,
          whatsapp: form.whatsapp,
          dealType: form.dealType,
          verified: form.verifyListing,
          make: form.make,
          model: form.model,
          evRangeKm: form.evRangeKm ? Number(form.evRangeKm) : undefined,
          evBatteryKwh: form.evBatteryKwh ? Number(form.evBatteryKwh) : undefined,
          evFastChargeKw: form.evFastChargeKw ? Number(form.evFastChargeKw) : undefined,
          evChargeType: form.evChargeType || undefined,
          co2Gkm: form.co2 ? Number(form.co2) : undefined,
          consumption: form.consumption || undefined
        }
      });
      setStatus(t("sell.statusPublished"));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : t("sell.statusMissing"));
    }
  };

  const saveDraft = () => {
    window.localStorage.setItem(draftKey, JSON.stringify(form));
    setStatus(t("sell.draftSaved"));
  };

  const loadDraft = () => {
    try {
      const stored = window.localStorage.getItem(draftKey);
      if (stored) {
        setForm(JSON.parse(stored));
        setStatus(t("sell.draftLoaded"));
      }
    } catch {
      setStatus(t("sell.draftFailed"));
    }
  };

  const createAccount = async () => {
    setStatus(null);
    if (!form.email || !form.password || !form.accountName) {
      setStatus(t("sell.requiredAccount"));
      return;
    }
    const result = await signUp(form.email, form.password, form.accountName);
    if (result.verificationRequired) {
      setStatus(t("auth.verifyRequiredBody"));
      return;
    }
    if (!result.ok) {
      setStatus(result.message || t("auth.genericError"));
      return;
    }
    setStatus(t("sell.accountReady"));
  };

  useEffect(() => {
    loadDraft();
  }, []);

  useEffect(() => {
    fetchBrandsFromBackend().then(setBrandOptions);
  }, []);

  useEffect(() => {
    fetchModelsFromBackend(form.make).then(setModelOptions);
  }, [form.make]);

  useEffect(() => {
    if (!form.location) {
      setLocationSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
        const res = await fetch(`${base}/api/geocode?q=${encodeURIComponent(form.location)}`);
        const data = await res.json();
        setLocationSuggestions(Array.isArray(data.items) ? data.items : []);
      } catch {
        setLocationSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [form.location]);

  const steps = [
    t("sell.stepAccount"),
    t("sell.stepBasics"),
    t("sell.stepTech"),
    t("sell.stepEquipment"),
    t("sell.stepPhotos"),
    t("sell.stepDescription"),
    t("sell.stepPricing"),
    t("sell.stepPromotion")
  ];

  return (
    <section className="sell-wizard" id="sell-wizard">
      <div className="sell-wizard__header">
        <div>
          <div className="sell-wizard__eyebrow">{t("sell.wizardBadge")}</div>
          <h2>{t("sell.wizardTitle")}</h2>
          <p className="muted">{t("sell.wizardSubtitle")}</p>
        </div>
        <div className="sell-wizard__progress">
          <div className="sell-wizard__progress-bar">
            <span style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
          <div className="sell-wizard__progress-text">
            {t("sell.progress")} {step}/{TOTAL_STEPS}
          </div>
        </div>
      </div>

      <div className="sell-wizard__steps">
        {steps.map((label, index) => (
          <button
            key={label}
            className={step === index + 1 ? "sell-step active" : "sell-step"}
            type="button"
            onClick={() => setStep(index + 1)}
          >
            <span>{index + 1}</span>
            {label}
          </button>
        ))}
      </div>

      {step === 1 && (
        <div className="sell-wizard__card">
          <div className="sell-wizard__title">{t("sell.accountTitle")}</div>
          <div className="sell-wizard__subtitle">{t("sell.accountSubtitle")}</div>
          {user ? (
            <div className="sell-wizard__notice">{t("sell.accountSignedIn", { email: user.email ?? "" })}</div>
          ) : (
            <>
              <div className="sell-wizard__social">
                <button
                  className="secondary"
                  type="button"
                  onClick={() => signInWithProvider("google").then((msg) => msg && setStatus(msg))}
                >
                  {t("sell.socialGoogle")}
                </button>
                <button className="secondary" type="button">{t("sell.socialApple")}</button>
                <button
                  className="secondary"
                  type="button"
                  onClick={() => signInWithProvider("facebook").then((msg) => msg && setStatus(msg))}
                >
                  {t("sell.socialFacebook")}
                </button>
              </div>
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <input className="input" placeholder={t("sell.fullName")} value={form.accountName} onChange={update("accountName")} />
                <input className="input" placeholder={t("auth.email")} value={form.email} onChange={update("email")} />
                <input className="input" placeholder={t("auth.password")} type="password" value={form.password} onChange={update("password")} />
                <input className="input" placeholder={t("sell.phone")} value={form.phone} onChange={update("phone")} />
                <select className="input" value={form.sellerType} onChange={update("sellerType")}>
                  <option value="private">{t("sell.sellerPrivate")}</option>
                  <option value="dealer">{t("sell.sellerDealer")}</option>
                </select>
              </div>
              <label className="checkbox">
                <input type="checkbox" checked={form.verifyAccount} onChange={update("verifyAccount")} />
                <span>{t("sell.verifyAccount")}</span>
              </label>
              <div className="sell-wizard__actions">
                <button className="primary" type="button" onClick={createAccount}>{t("sell.createAccount")}</button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="sell-wizard__card">
          <div className="sell-wizard__title">{t("sell.basicsTitle")}</div>
          <div className="sell-wizard__subtitle">{t("sell.basicsSubtitle")}</div>
          <div className="sell-wizard__vin">
            <input className="input" placeholder={t("sell.vin")} value={form.vin} onChange={update("vin")} />
            <button className="secondary" type="button" onClick={autoFillVin}>{t("sell.vinFill")}</button>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <select className="input" value={form.make} onChange={(event) => {
              const value = event.target.value;
              setForm((prev) => ({ ...prev, make: value, model: "" }));
            }}>
              <option value="">{t("filters.make")}</option>
              {brandOptions.map((brand) => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
            <select className="input" value={form.model} onChange={update("model")}>
              <option value="">{t("filters.model")}</option>
              {(modelOptions.length ? modelOptions : []).map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            <input className="input" placeholder={t("sell.titleField")} value={form.title} onChange={update("title")} />
            <input className="input" placeholder={t("sell.year")} type="number" value={form.year} onChange={update("year")} />
            <input className="input" placeholder={t("sell.mileage")} type="number" value={form.mileageKm} onChange={update("mileageKm")} />
            <input className="input" placeholder={t("sell.price")} type="number" value={form.price} onChange={update("price")} />
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
            <input className="input" placeholder={t("sell.color")} value={form.color} onChange={update("color")} />
            <select className="input" value={form.drive} onChange={update("drive")}>
              <option>FWD</option>
              <option>RWD</option>
              <option>AWD</option>
            </select>
            <input className="input" placeholder={t("sell.doors")} type="number" value={form.doors} onChange={update("doors")} />
            <input className="input" placeholder={t("sell.seats")} type="number" value={form.seats} onChange={update("seats")} />
          </div>
          <div className="sell-wizard__location">
            <div style={{ position: "relative" }}>
              <input className="input" placeholder={t("sell.location")} value={form.location} onChange={update("location")} />
              {locationSuggestions.length > 0 && (
                <div className="location-suggestions">
                  {locationSuggestions.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className="location-suggestion"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          location: item.label,
                          lat: String(item.lat),
                          lng: String(item.lng)
                        }));
                        setLocationSuggestions([]);
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="sell-wizard__suggested">
              {t("sell.suggestedPrice")}: {suggestedPrice ? `${suggestedPrice} €` : t("sell.suggestedPriceHint")}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="sell-wizard__card">
          <div className="sell-wizard__title">{t("sell.techTitle")}</div>
          <div className="sell-wizard__subtitle">{t("sell.techSubtitle")}</div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <input className="input" placeholder={t("sell.power")} type="number" value={form.powerKw} onChange={update("powerKw")} />
            <input className="input" placeholder={t("sell.co2")} type="number" value={form.co2} onChange={update("co2")} />
            <input className="input" placeholder={t("sell.consumption")} value={form.consumption} onChange={update("consumption")} />
            <input className="input" placeholder={t("sell.owners")} value={form.owners} onChange={update("owners")} />
            <input className="input" placeholder={t("sell.evRange")} type="number" value={form.evRangeKm} onChange={update("evRangeKm")} />
            <input className="input" placeholder={t("sell.evBattery")} type="number" value={form.evBatteryKwh} onChange={update("evBatteryKwh")} />
            <input className="input" placeholder={t("sell.evCharge")} value={form.evChargeType} onChange={update("evChargeType")} />
            <input className="input" placeholder={t("sell.evFastCharge")} type="number" value={form.evFastChargeKw} onChange={update("evFastChargeKw")} />
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={form.delivery} onChange={update("delivery")} />
            <span>{t("sell.delivery")}</span>
          </label>
        </div>
      )}

      {step === 4 && (
        <div className="sell-wizard__card">
          <div className="sell-wizard__title">{t("sell.optionsTitle")}</div>
          <div className="sell-wizard__subtitle">{t("sell.optionsHint")}</div>
          <div className="options-grid">
            {EQUIPMENT.map((opt) => (
              <button
                key={opt}
                className={form.options.includes(opt) ? "chip selected" : "chip"}
                onClick={() => toggleOption(opt)}
                type="button"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="sell-wizard__card">
          <div className="sell-wizard__title">{t("sell.photosTitle")}</div>
          <div className="sell-wizard__subtitle">{t("sell.photosHint")}</div>
          <div className="sell-form__uploader">
            <div className="muted">{t("sell.photosHintDetail")}</div>
            <label className="secondary" style={{ cursor: "pointer" }}>
              {t("sell.photosAction")}
              <input
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={(event) => uploadFiles(event.target.files)}
              />
            </label>
          </div>
          {form.uploads.length > 0 && (
            <div className="uploads-grid">
              {form.uploads.map((url) => (
                <img key={url} src={url} alt="upload" />
              ))}
            </div>
          )}
        </div>
      )}

      {step === 6 && (
        <div className="sell-wizard__card">
          <div className="sell-wizard__title">{t("sell.descriptionTitle")}</div>
          <div className="sell-wizard__subtitle">{t("sell.descriptionHint")}</div>
          <textarea className="input" rows={6} placeholder={t("sell.describe")} value={form.description} onChange={update("description")} />
          <button className="secondary" type="button" onClick={generateDescription}>{t("sell.generateDesc")}</button>
        </div>
      )}

      {step === 7 && (
        <div className="sell-wizard__card">
          <div className="sell-wizard__title">{t("sell.publishTitle")}</div>
          <div className="sell-wizard__subtitle">{t("sell.publishHint")}</div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <input className="input" placeholder={t("sell.phone")} value={form.phone} onChange={update("phone")} />
            <input className="input" placeholder={t("sell.whatsapp")} value={form.whatsapp} onChange={update("whatsapp")} />
          </div>
          <div className="sell-wizard__pricing">
            <label className={form.premium ? "plan" : "plan active"}>
              <input type="radio" name="plan" checked={!form.premium} onChange={() => setForm((prev) => ({ ...prev, premium: false }))} />
              <div>
                <strong>{t("sell.planFree")}</strong>
                <div className="muted">{t("sell.planFreeCopy")}</div>
              </div>
            </label>
            <label className={form.premium ? "plan active" : "plan"}>
              <input type="radio" name="plan" checked={form.premium} onChange={() => setForm((prev) => ({ ...prev, premium: true }))} />
              <div>
                <strong>{t("sell.planPremium")}</strong>
                <div className="muted">{t("sell.planPremiumCopy")}</div>
              </div>
            </label>
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={form.verifyListing} onChange={update("verifyListing")} />
            <span>{t("sell.verifyListing")}</span>
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={form.dealType === "leasing"} onChange={(event) => setForm((prev) => ({ ...prev, dealType: event.target.checked ? "leasing" : "buy" }))} />
            <span>{t("sell.offerLeasing")}</span>
          </label>
        </div>
      )}

      {step === 8 && (
        <div className="sell-wizard__card">
          <div className="sell-wizard__title">{t("sell.promoTitle")}</div>
          <div className="sell-wizard__subtitle">{t("sell.promoHint")}</div>
          <label className="checkbox">
            <input type="checkbox" checked={form.promoShare} onChange={update("promoShare")} />
            <span>{t("sell.promoShare")}</span>
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={form.promoAlerts} onChange={update("promoAlerts")} />
            <span>{t("sell.promoAlerts")}</span>
          </label>
        </div>
      )}

      {status && <div className="sell-wizard__status">{status}</div>}

      <div className="sell-form__nav">
        <button className="secondary" type="button" disabled={step === 1} onClick={handlePrev}>
          {t("sell.prev")}
        </button>
        {step < TOTAL_STEPS ? (
          <button className="primary" type="button" onClick={handleNext}>
            {t("sell.next")}
          </button>
        ) : (
          <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
            <button className="secondary" type="button" onClick={saveDraft}>{t("sell.saveDraft")}</button>
            <button className="primary" type="button" onClick={submit}>{t("sell.publish")}</button>
          </div>
        )}
      </div>
    </section>
  );
}
