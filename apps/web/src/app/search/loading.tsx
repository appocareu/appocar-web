export default function Loading() {
  return (
    <div className="search-layout">
      <aside className="glass filter-sidebar">
        <div className="skeleton skeleton-line" style={{ width: "60%" }} />
        <div className="skeleton skeleton-line" style={{ width: "80%" }} />
        <div className="skeleton skeleton-line" style={{ width: "50%" }} />
        <div className="skeleton skeleton-line" style={{ width: "70%" }} />
        <div className="skeleton skeleton-line" style={{ width: "90%" }} />
        <div className="skeleton skeleton-line" style={{ width: "75%" }} />
      </aside>
      <section className="search-results">
        <div className="skeleton skeleton-line" style={{ width: "30%", marginBottom: "1rem" }} />
        <div className="skeleton-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton skeleton-card" />
          ))}
        </div>
      </section>
    </div>
  );
}
