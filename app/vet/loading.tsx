export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div
          className="h-3 w-44 rounded-full mb-2"
          style={{ background: "var(--vet-bg-hover)" }}
        />
        <div className="h-7 w-72 rounded-full" style={{ background: "var(--vet-bg-hover)" }} />
      </div>
      <div className="grid gap-3.5 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[140px] rounded-[22px] border"
            style={{ background: "var(--vet-bg-card)", borderColor: "var(--vet-border)" }}
          />
        ))}
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
        <div
          className="h-[420px] rounded-[22px] border"
          style={{ background: "var(--vet-bg-card)", borderColor: "var(--vet-border)" }}
        />
        <div className="flex flex-col gap-3.5">
          <div
            className="h-[180px] rounded-[22px] border"
            style={{ background: "var(--vet-bg-card)", borderColor: "var(--vet-border)" }}
          />
          <div
            className="h-[180px] rounded-[22px] border"
            style={{ background: "var(--vet-bg-card)", borderColor: "var(--vet-border)" }}
          />
        </div>
      </div>
    </div>
  );
}
