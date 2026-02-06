export type Locale = "en" | "cs" | "uk";

export const dictionaries: Record<Locale, Record<string, string>> = {
  en: {
    title: "APPOCAR",
    subtitle: "Premium iOS 18-inspired marketplace",
    searchPlaceholder: "Search make, model, trim",
    featured: "Featured",
    viewAll: "View all",
    authSignIn: "Sign in",
    authSignUp: "Create account",
    authFullName: "Full name",
    authEmail: "Email",
    authPassword: "Password",
    authSwitchToSignUp: "Create a new account",
    authSwitchToSignIn: "I already have an account",
    loading: "Loading...",
    language: "Language"
  },
  cs: {
    title: "APPOCAR",
    subtitle: "Prémiové tržiště ve stylu iOS 18",
    searchPlaceholder: "Hledat značku, model, výbavu",
    featured: "Doporučené",
    viewAll: "Zobrazit vše",
    authSignIn: "Přihlásit se",
    authSignUp: "Vytvořit účet",
    authFullName: "Jméno a příjmení",
    authEmail: "Email",
    authPassword: "Heslo",
    authSwitchToSignUp: "Vytvořit nový účet",
    authSwitchToSignIn: "Už mám účet",
    loading: "Načítání...",
    language: "Jazyk"
  },
  uk: {
    title: "APPOCAR",
    subtitle: "Преміум‑маркетплейс у стилі iOS 18",
    searchPlaceholder: "Пошук марки, моделі, комплектації",
    featured: "Рекомендовані",
    viewAll: "Дивитись все",
    authSignIn: "Увійти",
    authSignUp: "Створити акаунт",
    authFullName: "Повне імʼя",
    authEmail: "Email",
    authPassword: "Пароль",
    authSwitchToSignUp: "Створити новий акаунт",
    authSwitchToSignIn: "У мене вже є акаунт",
    loading: "Завантаження...",
    language: "Мова"
  }
};

export function getDeviceLocale(): Locale {
  const locale = (Intl.DateTimeFormat().resolvedOptions().locale || "cs").toLowerCase();
  if (locale.startsWith("cs")) return "cs";
  if (locale.startsWith("uk") || locale.startsWith("ua")) return "uk";
  return "en";
}
