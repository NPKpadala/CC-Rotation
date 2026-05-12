"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface WizardData {
  // Step 1
  name: string;
  mobile: string;
  alternativeNumber: string;
  email: string;
  selfiePhotoUrl: string;
  dateOfBirth: string;
  occupation: string;
  aadhaarNumber: string;
  panNumber: string;

  // Step 2
  permanentAddressLine1: string;
  permanentAddressLine2: string;
  permanentLandmark: string;
  permanentCity: string;
  permanentState: string;
  permanentPincode: string;
  currentSameAsPermanent: boolean;
  currentAddressLine1: string;
  currentAddressLine2: string;
  currentLandmark: string;
  currentCity: string;
  currentState: string;
  currentPincode: string;

  // Step 3
  aadhaarFrontUrl: string;
  aadhaarBackUrl: string;
  panCardUrl: string;
  gasBillUrl: string;
  electricityBillUrl: string;
  rentAgreementUrl: string;
  bankPassbookUrl: string;
  internalNotes: string;
}

const initial: WizardData = {
  name: "",
  mobile: "",
  alternativeNumber: "",
  email: "",
  selfiePhotoUrl: "",
  dateOfBirth: "",
  occupation: "",
  aadhaarNumber: "",
  panNumber: "",
  permanentAddressLine1: "",
  permanentAddressLine2: "",
  permanentLandmark: "",
  permanentCity: "",
  permanentState: "",
  permanentPincode: "",
  currentSameAsPermanent: true,
  currentAddressLine1: "",
  currentAddressLine2: "",
  currentLandmark: "",
  currentCity: "",
  currentState: "",
  currentPincode: "",
  aadhaarFrontUrl: "",
  aadhaarBackUrl: "",
  panCardUrl: "",
  gasBillUrl: "",
  electricityBillUrl: "",
  rentAgreementUrl: "",
  bankPassbookUrl: "",
  internalNotes: "",
};

interface WizardCtx {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
  reset: () => void;
}

const Ctx = createContext<WizardCtx | null>(null);

const STORAGE_KEY = "profile-wizard-draft-v1";

export function WizardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<WizardData>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...initial, ...JSON.parse(raw) } : initial;
    } catch {
      return initial;
    }
  });

  const update = useCallback((patch: Partial<WizardData>) => {
    setData((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota errors */
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setData(initial);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return <Ctx.Provider value={{ data, update, reset }}>{children}</Ctx.Provider>;
}

export function useWizard(): WizardCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWizard must be used within WizardProvider");
  return ctx;
}
