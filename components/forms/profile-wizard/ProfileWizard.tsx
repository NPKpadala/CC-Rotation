"use client";

import { useState } from "react";
import { Stepper, type Step } from "./Stepper";
import { WizardProvider, useWizard } from "./wizard-context";
import { Step1Identity } from "./Step1Identity";
import { Step2Address } from "./Step2Address";
import { Step3Documents } from "./Step3Documents";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS: Step[] = [
  { number: 1, title: "Identity & KYC", description: "Customer details" },
  { number: 2, title: "Address", description: "Where they live" },
  { number: 3, title: "Documents", description: "Proofs & save" },
];

function WizardInner() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const { data, reset } = useWizard();

  // If there's any saved draft data, offer "Reset draft" so they can start fresh
  const hasDraft = data.name || data.mobile;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="w-full max-w-2xl">
          <Stepper steps={STEPS} currentStep={step} />
        </div>
        {hasDraft && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm("Discard draft and start fresh?")) {
                reset();
                setStep(1);
              }
            }}
            className="text-xs text-slate-500"
          >
            <RefreshCw className="h-3 w-3" /> Reset draft
          </Button>
        )}
      </div>

      {hasDraft && step === 1 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-3">
            <p className="text-xs text-amber-800">
              📝 Restored your previous draft. Data is auto-saved as you type.
            </p>
          </CardContent>
        </Card>
      )}

      <div>
        {step === 1 && <Step1Identity onNext={() => setStep(2)} />}
        {step === 2 && <Step2Address onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <Step3Documents onBack={() => setStep(2)} />}
      </div>
    </div>
  );
}

export function ProfileWizard() {
  return (
    <WizardProvider>
      <WizardInner />
    </WizardProvider>
  );
}
