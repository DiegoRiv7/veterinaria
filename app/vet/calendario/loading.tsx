export default function Loading() {
  return (
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
      <div
        className="h-[460px] rounded-[22px] border"
        style={{ background: "var(--vet-bg-card)", borderColor: "var(--vet-border)" }}
      />
      <div
        className="h-[460px] rounded-[22px] border"
        style={{ background: "var(--vet-bg-card)", borderColor: "var(--vet-border)" }}
      />
    </div>
  );
}
