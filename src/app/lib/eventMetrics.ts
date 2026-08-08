export type Event26Metric = {
  key: string;
  shortCode: string;
  name: string;
  city?: string;
  stateProv?: string;
  country?: string;
  startDate?: string;
  endDate?: string;
  week: number | null;
  district?: string | null;
  top10Rms: number;
  top25Rms: number;
  overallRms: number;
  teamCount: number;
  updatedAt: string;
};
