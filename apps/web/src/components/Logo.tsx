export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div className="logo-lockup">
      <img
        src="/logo.svg"
        alt="APPOCAR"
        width={size}
        height={size}
        style={{ display: "block" }}
      />
      <span className="logo-wordmark">APPOCAR</span>
    </div>
  );
}
