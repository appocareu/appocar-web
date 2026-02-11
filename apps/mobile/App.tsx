import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { mockListings, supabase } from "@appocar/shared";
import { dictionaries, getDeviceLocale, type Locale } from "./src/i18n";
import { Logo } from "./src/Logo";
import { fetchListing, fetchListings, login, logout } from "./src/api";

export default function App() {
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [listings, setListings] = useState(mockListings);
  const [count, setCount] = useState<number | null>(null);
  const [locale, setLocale] = useState<Locale>("cs");
  const [loadingListings, setLoadingListings] = useState(false);
  const [tab, setTab] = useState<"home" | "search" | "sell" | "profile">("home");
  const [selectedListing, setSelectedListing] = useState<any | null>(null);

  const useBackend = Boolean(process.env.EXPO_PUBLIC_API_BASE_URL);
  const t = (key: string) => dictionaries[locale][key] ?? dictionaries.en[key] ?? key;

  useEffect(() => {
    if (useBackend) {
      setReady(true);
      return;
    }
    if (!supabase) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    return () => subscription.subscription.unsubscribe();
  }, [useBackend]);

  useEffect(() => {
    setLocale(getDeviceLocale());
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoadingListings(true);
      const backend = await fetchListings(query, token ?? undefined);
      if (backend?.items?.length) {
        setListings(
          backend.items.map((record: any) => ({
            id: record.id,
            title: record.title,
            price: Number(record.price),
            currency: record.currency,
            year: record.year,
            mileageKm: record.mileage_km ?? record.mileageKm ?? 0,
            fuel: record.fuel,
            transmission: record.transmission,
            powerKw: record.power_kw ?? record.powerKw ?? 0,
            location: record.location,
            images: record.images ?? [],
            sellerName: record.seller_name ?? record.sellerName ?? "Seller",
            sellerType: record.seller_type ?? record.sellerType ?? "Private",
            createdAt: record.created_at ?? record.createdAt ?? new Date().toISOString(),
            body: record.body ?? "Sedan",
            color: record.color ?? "",
            drive: record.drive ?? "FWD",
            doors: record.doors ?? 4,
            seats: record.seats ?? 5,
            description: record.description ?? "",
            features: record.features ?? []
          }))
        );
        setCount(backend.count ?? null);
        setLoadingListings(false);
        return;
      }
      if (supabase) {
        const { data } = await supabase.from("listings").select("*");
        if (data && data.length > 0) {
          setListings(
            data.map((record: any) => ({
              id: record.id,
              title: record.title,
              price: Number(record.price),
              currency: record.currency,
              year: record.year,
              mileageKm: record.mileage_km,
              fuel: record.fuel,
              transmission: record.transmission,
              powerKw: record.power_kw,
              location: record.location,
              images: record.images,
              sellerName: record.seller_name,
              sellerType: record.seller_type,
              createdAt: record.created_at,
              body: record.body,
              color: record.color,
              drive: record.drive,
              doors: record.doors,
              seats: record.seats,
              description: record.description,
              features: record.features
            }))
          );
        }
      }
      setLoadingListings(false);
    };
    run();
  }, [user, query, token]);

  const filtered = useMemo(() => {
    return listings.filter((listing) =>
      listing.title.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, listings]);

  const handleAuth = async () => {
    setStatus(null);
    if (useBackend) {
      const res = await login(email, fullName);
      if (!res?.token) {
        setStatus("Login failed.");
        return;
      }
      setToken(res.token);
      setUser(res.user ?? { email, name: fullName });
      return;
    }
    if (!supabase) {
      setStatus("Supabase env vars are missing.");
      return;
    }
    if (isSignUp) {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });
      if (error) {
        setStatus(error.message);
        return;
      }
      if (data.user) {
        await supabase.from("profiles").insert({ user_id: data.user.id, full_name: fullName, type: "Private" });
      }
      setStatus("Account created. Check your email to confirm.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setStatus(error.message);
  };

  if (!ready) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.subtitle}>{t("loading")}</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.logoRow}>
            <Logo size={34} />
            <Text style={styles.title}>{isSignUp ? t("authSignUp") : t("authSignIn")}</Text>
          </View>
          <View style={styles.langRow}>
            <Text style={styles.langLabel}>{t("language")}</Text>
            <View style={styles.langButtons}>
              {(["en", "cs", "uk"] as Locale[]).map((code) => (
                <TouchableOpacity
                  key={code}
                  style={[styles.langButton, locale === code && styles.langButtonActive]}
                  onPress={() => setLocale(code)}
                >
                  <Text style={[styles.langButtonText, locale === code && styles.langButtonTextActive]}>
                    {code.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {isSignUp && (
            <TextInput
              placeholder={t("authFullName")}
              placeholderTextColor="#7b8794"
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
            />
          )}
          <TextInput
            placeholder={t("authEmail")}
            placeholderTextColor="#7b8794"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            placeholder={t("authPassword")}
            placeholderTextColor="#7b8794"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {status && <Text style={styles.cardMeta}>{status}</Text>}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleAuth}>
            <Text style={styles.primaryText}>{isSignUp ? t("authSignUp") : t("authSignIn")}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsSignUp((prev) => !prev)}>
            <Text style={styles.link}>{isSignUp ? t("authSwitchToSignIn") : t("authSwitchToSignUp")}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.tabs}>
        {[
          { key: "home", label: t("tabHome") },
          { key: "search", label: t("tabSearch") },
          { key: "sell", label: t("tabSell") },
          { key: "profile", label: t("tabProfile") }
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.tab, tab === item.key && styles.tabActive]}
            onPress={() => setTab(item.key as any)}
          >
            <Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {selectedListing && (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => setSelectedListing(null)}>
              <Text style={styles.link}>{t("back")}</Text>
            </TouchableOpacity>
            <Text style={styles.cardTitle}>{selectedListing.title}</Text>
            <Text style={styles.cardMeta}>
              {selectedListing.year} · {selectedListing.mileageKm?.toLocaleString?.() ?? ""} km · {selectedListing.fuel}
            </Text>
            <Text style={styles.price}>
              {selectedListing.price?.toLocaleString?.() ?? selectedListing.price} {selectedListing.currency}
            </Text>
            <Text style={styles.cardMeta}>{selectedListing.location}</Text>
            <View style={styles.badgeRow}>
              <Text style={styles.badge}>{selectedListing.transmission}</Text>
              <Text style={styles.badge}>{selectedListing.body}</Text>
              <Text style={styles.badge}>{selectedListing.drive}</Text>
            </View>
            <Text style={styles.sectionTitle}>{t("details")}</Text>
            <Text style={styles.cardMeta}>{selectedListing.description}</Text>
            <Text style={styles.sectionTitle}>{t("features")}</Text>
            <Text style={styles.cardMeta}>{(selectedListing.features || []).join(", ")}</Text>
            <TouchableOpacity style={styles.primaryBtn}>
              <Text style={styles.primaryText}>{t("contactSeller")}</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === "home" && !selectedListing && (
          <>
            <View style={styles.header}>
              <View style={styles.logoRow}>
                <Logo size={34} />
                <Text style={styles.title}>{t("title")}</Text>
              </View>
              <Text style={styles.subtitle}>{t("subtitle")}</Text>
            </View>

            <View style={styles.langRowInline}>
              <Text style={styles.langLabel}>{t("language")}</Text>
              <View style={styles.langButtons}>
                {(["en", "cs", "uk"] as Locale[]).map((code) => (
                  <TouchableOpacity
                    key={code}
                    style={[styles.langButton, locale === code && styles.langButtonActive]}
                    onPress={() => setLocale(code)}
                  >
                    <Text style={[styles.langButtonText, locale === code && styles.langButtonTextActive]}>
                      {code.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.searchCard}>
              <TextInput
                placeholder={t("searchPlaceholder")}
                placeholderTextColor="#7b8794"
                style={styles.input}
                value={query}
                onChangeText={setQuery}
              />
              <View style={styles.categoryRow}>
                {["SUV", "Sedan", "Electric", "Wagon"].map((tag) => (
                  <View key={tag} style={styles.chip}>
                    <Text style={styles.chipText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{count ?? "42k+"}</Text>
                <Text style={styles.statLabel}>{t("statListings")}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>98%</Text>
                <Text style={styles.statLabel}>{t("statResponse")}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>7.2k</Text>
                <Text style={styles.statLabel}>{t("statAlerts")}</Text>
              </View>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>{t("featured")}</Text>
              <TouchableOpacity>
                <Text style={styles.link}>{t("viewAll")}</Text>
              </TouchableOpacity>
            </View>

            {loadingListings && <Text style={styles.cardMeta}>{t("loading")}</Text>}

            {filtered.map((listing) => (
              <View key={listing.id} style={styles.card}>
                <Text style={styles.cardTitle}>{listing.title}</Text>
                <Text style={styles.cardMeta}>
                  {listing.year} · {listing.mileageKm.toLocaleString()} km · {listing.fuel}
                </Text>
                <View style={styles.cardRow}>
                  <Text style={styles.price}>
                    {listing.price.toLocaleString()} {listing.currency}
                  </Text>
                  <Text style={styles.badge}>{listing.sellerType}</Text>
                </View>
                <Text style={styles.cardMeta}>{listing.location}</Text>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={async () => {
                    const detail = await fetchListing(listing.id, token ?? undefined);
                    if (detail) {
                      setSelectedListing({
                        ...listing,
                        ...detail,
                        mileageKm: detail.mileage_km ?? detail.mileageKm ?? listing.mileageKm,
                        powerKw: detail.power_kw ?? detail.powerKw ?? listing.powerKw,
                        sellerType: detail.seller_type ?? detail.sellerType ?? listing.sellerType,
                        sellerName: detail.seller_name ?? detail.sellerName ?? listing.sellerName
                      });
                    } else {
                      setSelectedListing(listing);
                    }
                  }}
                >
                  <Text style={styles.primaryText}>{t("viewListing")}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {tab === "search" && (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t("tabSearch")}</Text>
              <TextInput
                placeholder={t("searchPlaceholder")}
                placeholderTextColor="#7b8794"
                style={styles.input}
                value={query}
                onChangeText={setQuery}
              />
            </View>
            {filtered.map((listing) => (
              <View key={listing.id} style={styles.card}>
                <Text style={styles.cardTitle}>{listing.title}</Text>
                <Text style={styles.cardMeta}>
                  {listing.year} · {listing.mileageKm.toLocaleString()} km · {listing.fuel}
                </Text>
                <View style={styles.cardRow}>
                  <Text style={styles.price}>
                    {listing.price.toLocaleString()} {listing.currency}
                  </Text>
                  <Text style={styles.badge}>{listing.sellerType}</Text>
                </View>
                <Text style={styles.cardMeta}>{listing.location}</Text>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={async () => {
                    const detail = await fetchListing(listing.id, token ?? undefined);
                    if (detail) {
                      setSelectedListing({
                        ...listing,
                        ...detail,
                        mileageKm: detail.mileage_km ?? detail.mileageKm ?? listing.mileageKm,
                        powerKw: detail.power_kw ?? detail.powerKw ?? listing.powerKw,
                        sellerType: detail.seller_type ?? detail.sellerType ?? listing.sellerType,
                        sellerName: detail.seller_name ?? detail.sellerName ?? listing.sellerName
                      });
                    } else {
                      setSelectedListing(listing);
                    }
                  }}
                >
                  <Text style={styles.primaryText}>{t("viewListing")}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {tab === "sell" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t("tabSell")}</Text>
            <Text style={styles.cardMeta}>{t("sellMobileHint")}</Text>
          </View>
        )}

        {tab === "profile" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t("tabProfile")}</Text>
            <Text style={styles.cardMeta}>{user?.email}</Text>
            {useBackend && token && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={async () => {
                  await logout(token);
                  setToken(null);
                  setUser(null);
                }}
              >
                <Text style={styles.secondaryText}>{t("logout")}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f6f9"
  },
  content: {
    padding: 20,
    gap: 20
  },
  header: {
    gap: 6
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#10131a"
  },
  subtitle: {
    color: "#5f6a7a",
    fontSize: 14
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8
  },
  tab: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e6ef"
  },
  tabActive: {
    backgroundColor: "#1a1f2b"
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a1f2b"
  },
  tabTextActive: {
    color: "#fff"
  },
  searchCard: {
    backgroundColor: "#ffffffcc",
    borderRadius: 18,
    padding: 14,
    borderColor: "#e2e6ef",
    borderWidth: 1
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  chip: {
    backgroundColor: "#f1f4f9",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155"
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    marginBottom: 16
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)"
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a"
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748b"
  },
  input: {
    fontSize: 16,
    color: "#10131a",
    borderWidth: 1,
    borderColor: "#e2e6ef",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff"
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600"
  },
  link: {
    color: "#0d8bff",
    fontWeight: "600"
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e6ef",
    alignItems: "center"
  },
  secondaryText: {
    fontWeight: "600",
    color: "#1a1f2b"
  },
  langRow: {
    marginTop: 4,
    gap: 8
  },
  langRowInline: {
    marginTop: -6,
    gap: 8
  },
  langLabel: {
    color: "#5f6a7a",
    fontSize: 12
  },
  langButtons: {
    flexDirection: "row",
    gap: 8
  },
  langButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e6ef",
    backgroundColor: "#fff"
  },
  langButtonActive: {
    backgroundColor: "#1a1f2b"
  },
  langButtonText: {
    color: "#1a1f2b",
    fontWeight: "600",
    fontSize: 12
  },
  langButtonTextActive: {
    color: "#fff"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    gap: 8,
    shadowColor: "#0f1117",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600"
  },
  cardMeta: {
    color: "#5f6a7a",
    fontSize: 13
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8
  },
  price: {
    fontSize: 18,
    fontWeight: "700"
  },
  badge: {
    backgroundColor: "#f0f1f5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    color: "#5f6a7a",
    fontWeight: "600",
    overflow: "hidden"
  },
  primaryBtn: {
    marginTop: 6,
    backgroundColor: "#1a1f2b",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center"
  },
  primaryText: {
    color: "#fff",
    fontWeight: "600"
  }
});
