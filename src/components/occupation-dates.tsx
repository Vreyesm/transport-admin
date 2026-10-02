"use client";
import { useState } from "react";
import { Occupation } from "@/lib/types";
import { localInput } from "@/lib/time";

export function OccupationDates({
  occupation,
  allDay,
  setAllDay,
}: {
  occupation: Occupation;
  allDay: boolean;
  setAllDay: (value: boolean) => void;
}) {
  const [start, setStart] = useState(() => localInput(occupation.starts_at));
  const [end, setEnd] = useState(() => localInput(occupation.ends_at));
  const [endDay, setEndDay] = useState(() =>
    localInput(
      new Date(Date.parse(occupation.ends_at) - 1).toISOString(),
    ).slice(0, 10),
  );
  return (
    <>
      <label className="check">
        <input
          type="checkbox"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
        />
        Días completos (incluye el último día)
      </label>
      <div className="form-grid">
        <label>
          Inicio
          <input
            name="start"
            type={allDay ? "date" : "datetime-local"}
            required
            value={allDay ? start.slice(0, 10) : start}
            onInput={(e) =>
              setStart(
                allDay
                  ? e.currentTarget.value +
                      "T" +
                      (start.split("T")[1] || "09:00")
                  : e.currentTarget.value,
              )
            }
          />
        </label>
        <label>
          Término
          <input
            name="end"
            type={allDay ? "date" : "datetime-local"}
            required
            value={allDay ? endDay : end}
            onInput={(e) => {
              if (allDay) {
                setEndDay(e.currentTarget.value);
                setEnd(
                  e.currentTarget.value + "T" + (end.split("T")[1] || "18:00"),
                );
              } else {
                setEnd(e.currentTarget.value);
                setEndDay(e.currentTarget.value.slice(0, 10));
              }
            }}
          />
        </label>
      </div>
    </>
  );
}
