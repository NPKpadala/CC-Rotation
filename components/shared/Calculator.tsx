"use client";

import { useState } from "react";
import { Calculator as CalcIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Calculator() {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [waitingForNew, setWaitingForNew] = useState(false);

  function pressDigit(d: string) {
    if (waitingForNew || display === "0") {
      setDisplay(d);
      setWaitingForNew(false);
    } else {
      setDisplay(display + d);
    }
  }

  function pressDot() {
    if (waitingForNew) {
      setDisplay("0.");
      setWaitingForNew(false);
    } else if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  }

  function pressOp(o: string) {
    const cur = parseFloat(display);
    if (prev === null) {
      setPrev(cur);
    } else if (op) {
      const result = compute(prev, cur, op);
      setPrev(result);
      setDisplay(String(result));
    }
    setOp(o);
    setWaitingForNew(true);
  }

  function pressEquals() {
    const cur = parseFloat(display);
    if (prev !== null && op) {
      const result = compute(prev, cur, op);
      setDisplay(String(result));
      setPrev(null);
      setOp(null);
      setWaitingForNew(true);
    }
  }

  function compute(a: number, b: number, o: string): number {
    switch (o) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b === 0 ? 0 : a / b;
      case "%": return (a * b) / 100;
      default: return b;
    }
  }

  function clear() {
    setDisplay("0");
    setPrev(null);
    setOp(null);
    setWaitingForNew(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-float transition hover:bg-primary-700 lg:bottom-4"
        aria-label="Open calculator"
      >
        <CalcIcon className="h-5 w-5" />
      </button>
    );
  }

  const buttons = [
    ["C", "%", "/", "*"],
    ["7", "8", "9", "-"],
    ["4", "5", "6", "+"],
    ["1", "2", "3", "="],
    ["0", ".", "⌫", "="],
  ] as const;

  return (
    <div className="fixed bottom-20 right-4 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-float lg:bottom-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700">Calculator</p>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-2 truncate rounded-lg bg-slate-900 px-3 py-3 text-right font-mono text-2xl text-white">
        {display}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {buttons.flat().map((b, i) => {
          const isOp = ["+", "-", "*", "/", "%", "="].includes(b);
          const isClear = b === "C" || b === "⌫";
          return (
            <Button
              key={i}
              variant={isOp ? "default" : isClear ? "outline" : "secondary"}
              size="sm"
              className="h-10 text-base"
              onClick={() => {
                if (b === "C") clear();
                else if (b === "⌫") setDisplay(display.length > 1 ? display.slice(0, -1) : "0");
                else if (b === "=") pressEquals();
                else if (b === ".") pressDot();
                else if (isOp) pressOp(b);
                else pressDigit(b);
              }}
            >
              {b}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
