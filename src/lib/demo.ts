import { Data } from "./types";
import { localDate } from "./time";
import { demoUsage } from "./demo-usage";
export function demoData(): Data {
  const today = localDate(new Date());
  return {
    settings: { name: "Gestión municipal", color: "#2563eb", logo: "" },
    vehicles: [
      {
        id: "demo-1",
        name: "Bus municipal 01",
        plate: "LKTR-24",
        type: "bus",
        brand: "Mercedes-Benz",
        model: "OF 1721",
        year: 2022,
        capacity: 45,
        features: "Aire acondicionado · Cinturones de seguridad · Maletero",
        archived: false,
        photos: [],
      },
      {
        id: "demo-2",
        name: "Minibús municipal 02",
        plate: "PBGH-62",
        type: "minibus",
        brand: "Hyundai",
        model: "County",
        year: 2023,
        capacity: 25,
        features: "Aire acondicionado · Acceso asistido",
        archived: false,
        photos: [],
      },
      {
        id: "demo-3",
        name: "Bus municipal 03",
        plate: "JDFR-18",
        type: "bus",
        brand: "Volvo",
        model: "B270F",
        year: 2020,
        capacity: 42,
        features: "Cinturones de seguridad · Maletero",
        archived: false,
        photos: [],
      },
      {
        id: "demo-4",
        name: "Minibús municipal 04",
        plate: "RXYZ-76",
        type: "minibus",
        brand: "Mercedes-Benz",
        model: "Sprinter",
        year: 2024,
        capacity: 19,
        features: "Aire acondicionado · Acceso asistido",
        archived: false,
        photos: [],
      },
    ],
    occupations: demoUsage(today),
  };
}
