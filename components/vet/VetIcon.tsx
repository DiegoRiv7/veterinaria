type IconName =
  | "dashboard"
  | "today"
  | "calendar"
  | "patients"
  | "records"
  | "stock"
  | "chat"
  | "bell"
  | "chevronRight"
  | "chevronLeft"
  | "plus"
  | "search"
  | "warning"
  | "paw"
  | "logout"
  | "menu"
  | "close";

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
};

export function VetIcon({ name, size = 18, color = "currentColor", className }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: color,
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" />
          <rect x="3" y="14" width="7" height="7" rx="2" />
          <rect x="14" y="14" width="7" height="7" rx="2" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="3" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case "patients":
      return (
        <svg {...common}>
          <path d="M12 2C8.5 2 7 5 7 7c0 3 2 5 5 5s5-2 5-5c0-2-1.5-5-5-5z" />
          <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      );
    case "today":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "stock":
      return (
        <svg {...common}>
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "records":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="11" x2="12" y2="17" />
          <line x1="9" y1="14" x2="15" y2="14" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
      );
    case "chevronRight":
      return (
        <svg {...common} strokeWidth={2.5}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      );
    case "chevronLeft":
      return (
        <svg {...common} strokeWidth={2.5}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common} strokeWidth={2.5}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case "warning":
      return (
        <svg {...common}>
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "paw":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none" className={className}>
          <ellipse cx="6" cy="7" rx="2.5" ry="3" />
          <ellipse cx="10" cy="4" rx="2" ry="2.5" />
          <ellipse cx="14" cy="4" rx="2" ry="2.5" />
          <ellipse cx="18" cy="7" rx="2.5" ry="3" />
          <path d="M12 10c-3.5 0-7 2-7 6 0 2.5 1.5 4 4 4 1 0 2-.5 3-.5s2 .5 3 .5c2.5 0 4-1.5 4-4 0-4-3.5-6-7-6z" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common}>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      );
    case "close":
      return (
        <svg {...common} strokeWidth={2.5}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    default:
      return null;
  }
}
