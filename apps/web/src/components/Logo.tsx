export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
      <img
        src="/logo.svg"
        alt="APPOCAR"
        width={size}
        height={size}
        style={{ display: "block" }}
      />
      <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>APPOCAR</span>
    </div>
  );
}
