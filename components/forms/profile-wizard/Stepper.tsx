"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  number: number;
  title: string;
  description?: string;
}

export function Stepper({ steps, currentStep }: { steps: Step[]; currentStep: number }) {
  return (
    <ol className="flex w-full items-center">
      {steps.map((s, idx) => {
        const isComplete = currentStep > s.number;
        const isCurrent = currentStep === s.number;
        const isLast = idx === steps.length - 1;

        return (
          <li key={s.number} className={cn("flex items-center", !isLast && "flex-1")}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  isComplete && "border-primary-600 bg-primary-600 text-white",
                  isCurrent && "border-primary-600 bg-white text-primary-600",
                  !isComplete && !isCurrent && "border-slate-300 bg-white text-slate-400"
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : s.number}
              </div>
              <div className="mt-2 hidden text-center md:block">
                <p
                  className={cn(
                    "text-xs font-medium",
                    isCurrent ? "text-primary-600" : isComplete ? "text-slate-700" : "text-slate-400"
                  )}
                >
                  {s.title}
                </p>
                {s.description && <p className="text-[10px] text-slate-400">{s.description}</p>}
              </div>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "mx-2 h-0.5 flex-1 transition-colors md:mx-3",
                  isComplete ? "bg-primary-600" : "bg-slate-200"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
