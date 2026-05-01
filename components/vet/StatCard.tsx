import { VetIcon } from "./VetIcon";

type IconName = React.ComponentProps<typeof VetIcon>["name"];

type Props = {
  label: string;
  value: string | number;
  sub?: string;
  icon: IconName;
  /** CSS color used for icon and glow */
  color: string;
};

export function StatCard({ label, value, sub, icon, color }: Props) {
  return (
    <div
      className="relative overflow-hidden flex flex-col gap-2 p-5 border"
      style={{
        background: "var(--vet-bg-card)",
        borderColor: "var(--vet-border)",
        borderRadius: 22,
      }}
    >
      <div
        aria-hidden
        className="absolute -top-5 -right-5 w-20 h-20 rounded-full opacity-15 blur-xl"
        style={{ background: color }}
      />
      <div
        className="w-10 h-10 rounded-[12px] flex items-center justify-center border"
        style={{ background: `color-mix(in oklab, ${color} 13%, transparent)`, borderColor: `color-mix(in oklab, ${color} 27%, transparent)` }}
      >
        <VetIcon name={icon} size={20} color={color} />
      </div>
      <div
        className="vet-mono text-[32px] font-bold leading-none"
        style={{ color: "var(--vet-text-1)" }}
      >
        {value}
      </div>
      <div className="text-[13px] font-bold" style={{ color: "var(--vet-text-2)" }}>
        {label}
      </div>
      {sub && (
        <div className="text-[11px] font-semibold" style={{ color: "var(--vet-text-3)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}
