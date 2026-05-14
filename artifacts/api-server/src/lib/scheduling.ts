const SERVICE_STORE_TYPES = new Set(["manicure", "salao"]);
const BRAZIL_TIMEZONE = "America/Sao_Paulo";
const DEFAULT_SLOT_STEP_MINUTES = 30;

export interface ServiceScheduleDay {
  day: number;
  enabled: boolean;
  start: string;
  end: string;
}

export interface OccupiedInterval {
  start: string;
  end: string;
}

export interface AvailableSlot {
  start: string;
  end: string;
  label: string;
}

export const DEFAULT_SERVICE_HOURS: ServiceScheduleDay[] = [
  { day: 0, enabled: false, start: "09:00", end: "18:00" },
  { day: 1, enabled: true, start: "09:00", end: "18:00" },
  { day: 2, enabled: true, start: "09:00", end: "18:00" },
  { day: 3, enabled: true, start: "09:00", end: "18:00" },
  { day: 4, enabled: true, start: "09:00", end: "18:00" },
  { day: 5, enabled: true, start: "09:00", end: "18:00" },
  { day: 6, enabled: true, start: "09:00", end: "14:00" },
];

function normalizeTime(value: unknown, fallback: string) {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value) ? value : fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeDay(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 0 && numeric <= 6 ? numeric : fallback;
}

export function isServiceStoreType(storeType?: string | null) {
  return SERVICE_STORE_TYPES.has(String(storeType || "").toLowerCase());
}

export function parseServiceHours(raw: string | null | undefined): ServiceScheduleDay[] {
  if (!raw) return DEFAULT_SERVICE_HOURS;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_SERVICE_HOURS;

    return DEFAULT_SERVICE_HOURS.map((fallback) => {
      const match = parsed.find((item) => normalizeDay(item?.day, -1) === fallback.day);
      if (!match) return fallback;

      return {
        day: fallback.day,
        enabled: normalizeBoolean(match.enabled, fallback.enabled),
        start: normalizeTime(match.start, fallback.start),
        end: normalizeTime(match.end, fallback.end),
      };
    });
  } catch {
    return DEFAULT_SERVICE_HOURS;
  }
}

export function parseDurationMinutes(value: string | null | undefined) {
  const source = String(value || "").toLowerCase().trim();
  if (!source) return 60;

  const hoursMatch = source.match(/(\d+)\s*h/);
  const minutesMatch = source.match(/(\d+)\s*(m|min)/);

  const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;
  const combined = hours * 60 + minutes;
  if (combined > 0) return Math.min(Math.max(combined, 15), 8 * 60);

  const numeric = Number(source.replace(/[^\d]/g, ""));
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.min(Math.max(numeric, 15), 8 * 60);
  }

  return 60;
}

export function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(value: number) {
  const safe = Math.max(0, value);
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

export function getSaoPauloNowParts() {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: BRAZIL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${lookup.year}-${lookup.month}-${lookup.day}`,
    time: `${lookup.hour}:${lookup.minute}`,
  };
}

export function buildAvailableSlots(input: {
  date: string;
  durationMinutes: number;
  storeHours: ServiceScheduleDay[];
  occupiedIntervals: OccupiedInterval[];
}) {
  const { date, storeHours, occupiedIntervals } = input;
  const durationMinutes = Math.max(15, input.durationMinutes || 60);
  const selectedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(selectedDate.getTime())) return [] as AvailableSlot[];

  const weekday = selectedDate.getDay();
  const schedule = storeHours.find((item) => item.day === weekday);
  if (!schedule?.enabled) return [] as AvailableSlot[];

  const startMinutes = timeToMinutes(schedule.start);
  const endMinutes = timeToMinutes(schedule.end);
  if (endMinutes <= startMinutes) return [] as AvailableSlot[];

  const now = getSaoPauloNowParts();
  const minimumStartMinutes = date === now.date ? timeToMinutes(now.time) : -1;
  const occupied = occupiedIntervals
    .map((interval) => ({
      start: timeToMinutes(interval.start),
      end: timeToMinutes(interval.end),
    }))
    .filter((interval) => interval.end > interval.start);

  const slots: AvailableSlot[] = [];
  for (
    let cursor = startMinutes;
    cursor + durationMinutes <= endMinutes;
    cursor += DEFAULT_SLOT_STEP_MINUTES
  ) {
    const slotEnd = cursor + durationMinutes;
    if (cursor < minimumStartMinutes) continue;
    if (occupied.some((interval) => overlaps(cursor, slotEnd, interval.start, interval.end))) continue;

    slots.push({
      start: minutesToTime(cursor),
      end: minutesToTime(slotEnd),
      label: `${minutesToTime(cursor)} - ${minutesToTime(slotEnd)}`,
    });
  }

  return slots;
}

export function isSlotAvailable(input: {
  date: string;
  startTime: string;
  durationMinutes: number;
  storeHours: ServiceScheduleDay[];
  occupiedIntervals: OccupiedInterval[];
}) {
  const slots = buildAvailableSlots({
    date: input.date,
    durationMinutes: input.durationMinutes,
    storeHours: input.storeHours,
    occupiedIntervals: input.occupiedIntervals,
  });

  const match = slots.find((slot) => slot.start === input.startTime);
  return {
    available: Boolean(match),
    endTime: match?.end || "",
  };
}
