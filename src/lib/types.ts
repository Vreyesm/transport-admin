export type Vehicle = {
  id: string;
  name: string;
  plate: string;
  type: "bus" | "minibus";
  brand: string;
  model: string;
  year: number;
  capacity: number;
  features: string;
  notes?: string;
  archived: boolean;
  photos: string[];
};
export type Occupation = {
  id: string;
  vehicle_id: string;
  kind: "reservation" | "maintenance";
  starts_at: string;
  ends_at: string;
  cancelled: boolean;
  activity?: string;
  destination?: string;
  organization?: string;
  responsible?: string;
  contact?: string;
  notes?: string;
};
export type Settings = { name: string; color: string; logo: string };
export type Data = {
  vehicles: Vehicle[];
  occupations: Occupation[];
  settings: Settings;
};
