"use client";

import { useState } from "react";
import { Copy, Check, X, MessageCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface SuccessCopyPopupProps {
  open: boolean;
  onClose: () => void;
  customerName: string;
  customerMobile: string;
  paidAmount: number;
  cardLabel: string;
  date: string;
  companyName: string;
  transactionId?: string; // ADDED v1.4
  template?: string;
}

const DEFAULT_TEMPLATE = `Hi {customer_name},

✅ Your payment has been received successfully!

Txn ID: {transaction_id}
📅 Date: {date}
💳 Card: {card}
💰 Amount Paid: ₹{amount}
📊 Status: FULLY CLEARED — NO DUE REMAINING

Thank you for your payment!

— {company_name}`;

function fillTemplate(
  template: string,
  vars: { customer_name: string; date: string; card: string; amount: string; company_name: string; transaction_id: string }
): string {
  return template
    .replace(/\{customer_name\}/g, vars.customer_name)
    .replace(/\{date\}/g, vars.date)
    .replace(/\{card\}/g, vars.card)
    .replace(/\{amount\}/g, vars.amount)
    .replace(/\{company_name\}/g, vars.company_name)
    .replace(/\{transaction_id\}/g, vars.transaction_id);
}

/**
 * Format an Indian mobile to international format for wa.me link.
 * "9876543210" → "919876543210"
 */
function toWhatsAppNumber(mobile: string): string {
  const clean = mobile.replace(/\D/g, "");
  if (clean.length === 10) return `91${clean}`;
  if (clean.length === 12 && clean.startsWith("91")) return clean;
  return clean;
}

export function SuccessCopyPopup({
  open,
  onClose,
  customerName,
  customerMobile,
  paidAmount,
  cardLabel,
  date,
  companyName,
  transactionId,
  template,
}: SuccessCopyPopupProps) {
  const [copied, setCopied] = useState(false);

  const message = fillTemplate(template || DEFAULT_TEMPLATE, {
    customer_name: customerName,
    date,
    card: cardLabel,
    amount: paidAmount.toLocaleString("en-IN"),
    company_name: companyName,
    transaction_id: transactionId ?? "—",
  });

  function copyToClipboard() {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function copyAndWhatsApp() {
    navigator.clipboard.writeText(message).catch(() => {});
    const waNumber = toWhatsAppNumber(customerMobile);
    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" /> Payment Cleared
          </DialogTitle>
          <DialogDescription>
            Send the confirmation message to <strong>{customerName}</strong>:
          </DialogDescription>
        </DialogHeader>

        <div className="my-3 rounded-lg border border-green-200 bg-green-50/40 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Customer:</span>
            <span className="font-mono">{customerMobile}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Amount:</span>
            <span className="font-mono font-bold text-green-700">{formatCurrency(paidAmount)}</span>
          </div>
        </div>

        <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
          {message}
        </pre>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4" /> Close
          </Button>
          <Button variant="outline" onClick={copyToClipboard}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button onClick={copyAndWhatsApp} className="bg-green-600 hover:bg-green-700">
            <MessageCircle className="h-4 w-4" /> Copy & Send via WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
