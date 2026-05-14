export interface ServiceHourDay {
  day: number;
  label: string;
  enabled: boolean;
  start: string;
  end: string;
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"] as const;

export const DEFAULT_SERVICE_HOURS: ServiceHourDay[] = [
  { day: 0, label: "Dom", enabled: false, start: "09:00", end: "18:00" },
  { day: 1, label: "Seg", enabled: true, start: "09:00", end: "18:00" },
  { day: 2, label: "Ter", enabled: true, start: "09:00", end: "18:00" },
  { day: 3, label: "Qua", enabled: true, start: "09:00", end: "18:00" },
  { day: 4, label: "Qui", enabled: true, start: "09:00", end: "18:00" },
  { day: 5, label: "Sex", enabled: true, start: "09:00", end: "18:00" },
  { day: 6, label: "Sab", enabled: true, start: "09:00", end: "14:00" },
] as const;

function normalizeTime(value: unknown, fallback: string) {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value) ? value : fallback;
}

export function parseServiceHours(raw: string | null | undefined): ServiceHourDay[] {
  if (!raw) return DEFAULT_SERVICE_HOURS.map((item) => ({ ...item }));

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_SERVICE_HOURS.map((item) => ({ ...item }));
    }

    return DEFAULT_SERVICE_HOURS.map((fallback) => {
      const match = parsed.find((item) => Number(item?.day) === fallback.day);
      if (!match) return { ...fallback };

      return {
        day: fallback.day,
        label: WEEKDAY_LABELS[fallback.day],
        enabled: typeof match.enabled === "boolean" ? match.enabled : fallback.enabled,
        start: normalizeTime(match.start, fallback.start),
        end: normalizeTime(match.end, fallback.end),
      };
    });
  } catch {
    return DEFAULT_SERVICE_HOURS.map((item) => ({ ...item }));
  }
}

export function serializeServiceHours(hours: ServiceHourDay[]) {
  return JSON.stringify(hours.map(({ day, enabled, start, end }) => ({ day, enabled, start, end })));
}

export function getSaoPauloToday() {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}

export function formatDurationMinutes(value: number) {
  const safe = Math.max(0, Math.round(value || 0));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}min`;
}
