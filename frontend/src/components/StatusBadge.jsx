const styles = {
  draft: "bg-slate-100 text-slate-600",
  sending: "bg-amber-50 text-amber-700",
  sent: "bg-emerald-50 text-emerald-700"
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[status] || styles.draft}`}>
      {status}
    </span>
  );
}
