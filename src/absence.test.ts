import { describe, expect, it } from "vitest";
import {
  type AbsenceRecord,
  countAbsenceDays,
  countAbsenceDaysWithin,
  summarizeAbsences,
} from "./absence";

describe("absence helpers", () => {
  it("does not count departure or return dates as days away", () => {
    expect(countAbsenceDays({ departedOn: "2026-06-01", returnedOn: "2026-06-01" })).toBe(0);
    expect(countAbsenceDays({ departedOn: "2026-06-01", returnedOn: "2026-06-02" })).toBe(0);
    expect(countAbsenceDays({ departedOn: "2026-06-01", returnedOn: "2026-06-05" })).toBe(3);
  });

  it("counts only full absence days inside a requested window", () => {
    const absence = { departedOn: "2026-06-01", returnedOn: "2026-06-10" };

    expect(countAbsenceDaysWithin(absence, "2026-06-01", "2026-06-10")).toBe(8);
    expect(countAbsenceDaysWithin(absence, "2026-06-04", "2026-06-06")).toBe(3);
    expect(countAbsenceDaysWithin(absence, "2026-06-10", "2026-06-12")).toBe(0);
  });

  it("summarizes total, last 12 months, last 5 years, and longest absence", () => {
    const absences: AbsenceRecord[] = [
      {
        id: "one",
        destination: "France",
        reason: "Holiday",
        departedOn: "2026-06-01",
        returnedOn: "2026-06-06",
      },
      {
        id: "two",
        destination: "Spain",
        reason: "Family",
        departedOn: "2024-01-01",
        returnedOn: "2024-01-11",
      },
      {
        id: "three",
        destination: "Canada",
        reason: "Work",
        departedOn: "2019-01-01",
        returnedOn: "2019-02-01",
      },
    ];

    expect(summarizeAbsences(absences, new Date("2026-06-30T12:00:00Z"))).toEqual({
      totalDaysAway: 43,
      last12MonthsDays: 4,
      last5YearsDays: 13,
      longestAbsenceDays: 30,
      absenceCount: 3,
    });
  });
});
