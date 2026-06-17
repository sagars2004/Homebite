export type NovusFunnelStep = {
  stepNumber: number;
  label: string;
  sessionCount: number;
  dropOffRate: number;
  conversionRate: number;
};

export type NovusFunnel = {
  id: string;
  name: string;
  description: string;
  totalSessions: number;
  completedSessions: number;
  overallConversionRate: number;
  highestDropOffStep?: number;
  steps: NovusFunnelStep[];
};

export type NovusTrackEvent = {
  id: string;
  name: string;
  description: string;
  surface: string;
};

export type NovusSignal = {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: string;
  keyMetric: { label: string; value: string };
  whySurfaced: string;
  detectedAt: string;
};

export type NovusMemoryItem = {
  name: string;
  description: string;
};

export type NovusMemory = {
  persona: { name: string; description: string };
  productAreas: NovusMemoryItem[];
  keyFlows: NovusMemoryItem[];
};

export type NovusMappingStats = {
  pages: number;
  events: number;
  funnelsAndJourneys: number;
};

export type NovusPulseSnapshot = {
  syncedAt: string;
  source: "novus-mcp";
  statusMessage: string;
  mappingStats: NovusMappingStats;
  memory: NovusMemory;
  signals: NovusSignal[];
  trackEvents: NovusTrackEvent[];
  funnels: NovusFunnel[];
};

export type ProductPulseData = {
  syncedAt: string;
  statusMessage: string;
  mappingStats: NovusMappingStats;
  memory: NovusMemory;
  trackEvents: NovusTrackEvent[];
  funnels: NovusFunnel[];
  signals: NovusSignal[];
  headline: {
    biggestDropOffStep: string | null;
    biggestDropOffRate: number | null;
    coreConversionPercent: number;
  };
};
