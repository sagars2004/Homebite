import { createServerFn } from "@tanstack/react-start";
import novusPulseData from "../data/novus-pulse.json";
import type { NovusPulseSnapshot, ProductPulseData } from "./novus.types";

export const getProductPulse = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProductPulseData> => {
    const snapshot = novusPulseData as NovusPulseSnapshot;
    const coreFunnel = snapshot.funnels[0];
    const dropStep = coreFunnel.highestDropOffStep
      ? coreFunnel.steps.find((s) => s.stepNumber === coreFunnel.highestDropOffStep)
      : null;

    return {
      syncedAt: snapshot.syncedAt,
      statusMessage: snapshot.statusMessage,
      mappingStats: snapshot.mappingStats,
      memory: snapshot.memory,
      trackEvents: snapshot.trackEvents,
      funnels: snapshot.funnels,
      signals: snapshot.signals,
      headline: {
        biggestDropOffStep: dropStep?.label ?? null,
        biggestDropOffRate: dropStep ? Math.round(dropStep.dropOffRate * 100) : null,
        coreConversionPercent: Math.round(coreFunnel.overallConversionRate * 1000) / 10,
      },
    };
  },
);

export type { ProductPulseData, NovusFunnel, NovusTrackEvent, NovusSignal } from "./novus.types";
