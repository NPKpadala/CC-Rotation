"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArdSwipeForm } from "./ArdSwipeForm";

interface ProfileOption { id: string; name: string; mobile: string }
interface CardOption {
  id: string;
  bankName: string;
  cardNumberLast4: string;
  cardNumberFull: string | null;
  cardNetwork: string;
  defaultPercentage: number;
  profileId: string;
  swipeAttemptCount: number;
}

export function ArdSwipeFormDialog({
  profiles,
  cards,
  defaultProfileId,
}: {
  profiles: ProfileOption[];
  cards: CardOption[];
  defaultProfileId?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> New ARD Swipe
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>New ARD Swipe</DialogTitle>
          <DialogDescription>
            Customer brings card → swipe via gateway → send cash. Live calculation on the right.
          </DialogDescription>
        </DialogHeader>
        <ArdSwipeForm
          profiles={profiles}
          cards={cards}
          defaultProfileId={defaultProfileId}
          onComplete={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
