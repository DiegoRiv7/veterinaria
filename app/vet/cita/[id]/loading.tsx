export default function Loading() {
  return (
    <div className="flex flex-col gap-5 max-w-[860px] mx-auto w-full">
      <div className="h-3 w-20 rounded-full" style={{ background: "var(--vet-bg-hover)" }} />
      <div>
        <div className="h-7 w-72 rounded-full mb-2" style={{ background: "var(--vet-bg-hover)" }} />
        <div className="h-4 w-48 rounded-full" style={{ background: "var(--vet-bg-hover)" }} />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-[120px] rounded-[18px] border"
          style={{ background: "var(--vet-bg-card)", borderColor: "var(--vet-border)" }}
        />
      ))}
    </div>
  );
}
