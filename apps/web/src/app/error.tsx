"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding: 32 }}>
        <h2>Something went wrong</h2>
        <p>{error?.message}</p>
        <button onClick={() => reset()} style={{ marginTop: 12 }}>Try again</button>
      </body>
    </html>
  );
}
