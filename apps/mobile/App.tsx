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

export default function App() {
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [listings, setListings] = useState(mockListings);
  const [locale, setLocale] = useState<Locale>("cs");

  const t = (key: string) => dictionaries[locale][key] ?? dictionaries.en[key] ?? key;

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    setLocale(getDeviceLocale());
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("listings")
      .select("*")
      .then(({ data }) => {
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
      });
  }, [user]);

  const filtered = useMemo(() => {
    return listings.filter((listing) =>
      listing.title.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, listings]);

  const handleAuth = async () => {
    setStatus(null);
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{t("featured")}</Text>
          <TouchableOpacity>
            <Text style={styles.link}>{t("viewAll")}</Text>
          </TouchableOpacity>
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
            <TouchableOpacity style={styles.primaryBtn}>
              <Text style={styles.primaryText}>View listing</Text>
            </TouchableOpacity>
          </View>
        ))}
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
  searchCard: {
    backgroundColor: "#ffffffcc",
    borderRadius: 18,
    padding: 14,
    borderColor: "#e2e6ef",
    borderWidth: 1
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
