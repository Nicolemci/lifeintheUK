export type AbsenceRecord = {
  id: string;
  destination: string;
  reason: string;
  departedOn: string;
  returnedOn: string;
  notes?: string;
};

export type AbsenceSummary = {
  totalDaysAway: number;
  last12MonthsDays: number;
  last5YearsDays: number;
  longestAbsenceDays: number;
  absenceCount: number;
};

export const NATURALISATION_LAST_12_MONTHS_LIMIT = 90;
export const NATURALISATION_LAST_5_YEARS_LIMIT = 450;
export const ILR_ROLLING_12_MONTHS_GUIDE_LIMIT = 180;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDateOnly(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function diffDays(startDate: Date, endDate: Date): number {
  return Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY);
}

function isValidDateInput(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  return toDateInputValue(parseDateOnly(date)) === date;
}

export function isoDateToDisplay(date: string): string {
  if (!isValidDateInput(date)) {
    return date;
  }

  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export function displayDateToIso(date: string): string | null {
  const match = date.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

  return isValidDateInput(isoDate) ? isoDate : null;
}

export function countAbsenceDays(absence: Pick<AbsenceRecord, "departedOn" | "returnedOn">): number {
  if (!isValidDateInput(absence.departedOn) || !isValidDateInput(absence.returnedOn)) {
    return 0;
  }

  const departed = parseDateOnly(absence.departedOn);
  const returned = parseDateOnly(absence.returnedOn);

  return Math.max(0, diffDays(departed, returned) - 1);
}

export function countAbsenceDaysWithin(
  absence: Pick<AbsenceRecord, "departedOn" | "returnedOn">,
  periodStart: string,
  periodEnd: string,
): number {
  if (
    !isValidDateInput(absence.departedOn) ||
    !isValidDateInput(absence.returnedOn) ||
    !isValidDateInput(periodStart) ||
    !isValidDateInput(periodEnd)
  ) {
    return 0;
  }

  const firstFullDayAway = addDays(parseDateOnly(absence.departedOn), 1);
  const lastFullDayAway = addDays(parseDateOnly(absence.returnedOn), -1);
  const start = parseDateOnly(periodStart);
  const end = parseDateOnly(periodEnd);

  if (lastFullDayAway < firstFullDayAway || end < start) {
    return 0;
  }

  const overlapStart = firstFullDayAway > start ? firstFullDayAway : start;
  const overlapEnd = lastFullDayAway < end ? lastFullDayAway : end;

  if (overlapEnd < overlapStart) {
    return 0;
  }

  return diffDays(overlapStart, overlapEnd) + 1;
}

export function summarizeAbsences(absences: AbsenceRecord[], today: Date = new Date()): AbsenceSummary {
  const todayValue = toDateInputValue(today);
  const last12MonthsStart = toDateInputValue(addDays(parseDateOnly(todayValue), -365));
  const last5YearsStart = toDateInputValue(addDays(parseDateOnly(todayValue), -365 * 5));

  return absences.reduce<AbsenceSummary>(
    (summary, absence) => {
      const absenceDays = countAbsenceDays(absence);

      return {
        totalDaysAway: summary.totalDaysAway + absenceDays,
        last12MonthsDays:
          summary.last12MonthsDays + countAbsenceDaysWithin(absence, last12MonthsStart, todayValue),
        last5YearsDays: summary.last5YearsDays + countAbsenceDaysWithin(absence, last5YearsStart, todayValue),
        longestAbsenceDays: Math.max(summary.longestAbsenceDays, absenceDays),
        absenceCount: summary.absenceCount + 1,
      };
    },
    {
      totalDaysAway: 0,
      last12MonthsDays: 0,
      last5YearsDays: 0,
      longestAbsenceDays: 0,
      absenceCount: 0,
    },
  );
}

export function createAbsenceId(): string {
  return `absence-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
