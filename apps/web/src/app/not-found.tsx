import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ padding: 32, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <h2>Page not found</h2>
      <p>The page you requested does not exist.</p>
      <Link href="/" style={{ display: "inline-block", marginTop: 12 }}>
        Go back home
      </Link>
    </main>
  );
}
