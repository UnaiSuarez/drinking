"use client";

import { createContext, useContext } from "react";

export type Training = {
  step: string;
  completed: string[];
  run: (action: string) => Promise<boolean>;
};

export const TrainingContext = createContext<Training | null>(null);
export const useTraining = () => useContext(TrainingContext);
