const LABELS = {
  favItem: "Favourite",
  city: "City",
  tags: "Tags",
  minOrders: "Min orders",
  maxOrders: "Max orders",
  minTotalSpend: "Min spend",
  maxTotalSpend: "Max spend",
  lastOrderBefore: "No order since",
  lastOrderAfter: "Ordered after",
  joinedBefore: "Joined before",
  joinedAfter: "Joined after"
};

export default function FilterChips({ filter }) {
  const entries = Object.entries(filter || {});
  if (!entries.length) return <span className="text-sm text-muted">All customers</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <span key={key} className="inline-flex items-center gap-1.5 rounded-full bg-accent-light px-3 py-1 text-xs font-medium text-accent">
          <span className="opacity-70">{LABELS[key] || key}:</span>
          {Array.isArray(value) ? value.join(", ") : String(value)}
        </span>
      ))}
    </div>
  );
}
