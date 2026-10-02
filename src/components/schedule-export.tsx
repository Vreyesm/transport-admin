"use client";
import { useState } from "react";
import { Occupation, Vehicle } from "@/lib/types";
import { scheduleRows, scheduleCSV } from "@/lib/export";
import { Button } from "./ui/button";

export function ScheduleExport({
  occupations,
  vehicles,
  date,
  weekly,
  admin,
  changeDate,
}: {
  occupations: Occupation[];
  vehicles: Vehicle[];
  date: string;
  weekly: boolean;
  admin: boolean;
  changeDate: (date: string) => void;
}) {
  const [period, setPeriod] = useState(weekly ? "week" : "day");
  const [cancelled, setCancelled] = useState(false);
  const [preview, setPreview] = useState(false);
  const report = scheduleRows(
    occupations,
    vehicles,
    date,
    period === "week",
    admin,
    cancelled,
  );
  return (
    <section className="panel schedule-export">
      <div className="export-controls">
        <label>
          Fecha seleccionada
          <input
            type="date"
            aria-label="Fecha de programación"
            value={date}
            onChange={(e) => {
              if (e.target.value) changeDate(e.target.value);
            }}
          />
        </label>
        <label>
          Programación{" "}
          <select
            aria-label="Período de exportación"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="day">Diaria</option>
            <option value="week">Semanal</option>
          </select>
        </label>
        {admin && (
          <label className="check">
            <input
              type="checkbox"
              checked={cancelled}
              onChange={(e) => setCancelled(e.target.checked)}
            />
            Incluir canceladas
          </label>
        )}
        <Button
          variant="outline"
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([scheduleCSV(report.headers, report.rows)], {
                type: "text/csv;charset=utf-8",
              }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = `programacion-${report.start}-${report.end}.csv`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          Exportar CSV
        </Button>
        <Button variant="outline" onClick={() => setPreview(!preview)}>
          {preview ? "Ocultar vista imprimible" : "Vista imprimible"}
        </Button>
      </div>
      <p>
        {" "}
        {report.start} → {report.end} · Horarios America/Santiago · Filtros
        actuales · Los viajes que cruzan días conservan su horario completo.
      </p>
      {preview && (
        <div className="print-report">
          <h2>Programación de transporte</h2>
          <p>
            {report.start} → {report.end} · Hora de Chile (America/Santiago)
          </p>
          <Button className="print-button" onClick={() => window.print()}>
            Imprimir
          </Button>
          <div className="report-scroll">
            <table>
              <thead>
                <tr>
                  {report.headers.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!report.rows.length && (
            <p>Sin asignaciones para este período y filtros.</p>
          )}
        </div>
      )}
    </section>
  );
}
