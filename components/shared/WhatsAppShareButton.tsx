"use client";

import { useState } from "react";
import { MessageCircle, Copy as CopyIcon, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";

interface WhatsAppShareButtonProps {
  customerName: string;
  customerMobile: string;
  transactionId: string;
  transactionDate: string;
  cardLast4: string;
  paidAmount: number;
  charges: number;
  clearedTotal: number;
  status: string;
  companyName: string;
  template?: string;
}

const DEFAULT_TEMPLATE = `Hi {customer_name},

Txn ID: {transaction_id}
Date: {date}
Card ••••{last4}

Paid: ₹{amount}
Charges: ₹{charges}
Cleared: ₹{cleared}
Status: {status}

— {company_name}`;

export function WhatsAppShareButton({
  customerName,
  customerMobile,
  transactionId,
  transactionDate,
  cardLast4,
  paidAmount,
  charges,
  clearedTotal,
  status,
  companyName,
  template,
}: WhatsAppShareButtonProps) {
  const tpl = template?.trim() || DEFAULT_TEMPLATE;
  const message = tpl
    .replaceAll("{customer_name}", customerName)
    .replaceAll("{transaction_id}", transactionId)
    .replaceAll("{date}", transactionDate)
    .replaceAll("{last4}", cardLast4)
    .replaceAll("{amount}", paidAmount.toFixed(2))
    .replaceAll("{charges}", charges.toFixed(2))
    .replaceAll("{cleared}", clearedTotal.toFixed(2))
    .replaceAll("{status}", status)
    .replaceAll("{company_name}", companyName);

  const [open, setOpen] = useState(false);
  const [text, setText] = useState(message);
  const [copied, setCopied] = useState(false);

  // Sync if upstream message changes
  if (open === false && text !== message) {
    setText(message);
  }

  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function copyAndOpenWhatsApp() {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied · opening WhatsApp");
      const cleanMobile = customerMobile.replace(/\D/g, "");
      const phone = cleanMobile.startsWith("91") ? cleanMobile : `91${cleanMobile}`;
      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener,noreferrer"
      );
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="inline-flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4 text-green-600" /> Share via WhatsApp
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send to {customerName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            className="font-mono text-xs"
          />
          <p className="text-xs text-slate-500">
            Edit if needed. The customer's mobile is{" "}
            <span className="font-mono font-semibold">{customerMobile}</span>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={copy} className="flex-1">
              {copied ? <Check className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
              {copied ? "Copied" : "Copy only"}
            </Button>
            <Button type="button" onClick={copyAndOpenWhatsApp} className="flex-1">
              <ExternalLink className="h-4 w-4" /> Copy & Send via WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
