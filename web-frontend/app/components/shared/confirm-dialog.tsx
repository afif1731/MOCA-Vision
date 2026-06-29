import { useState } from 'react';

import useDialogStore from '@/hooks/store/use-dialog';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export interface ConfirmDialogProps {
  dialogId: string;
  title: string;
  description: string;
  actionText?: string;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmDialog({
  dialogId,
  title,
  description,
  actionText = 'Continue',
  onConfirm,
}: ConfirmDialogProps) {
  const { isOpen, close } = useDialogStore();
  const [isLoading, setIsLoading] = useState(false);

  async function handleConfirm() {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
      close(dialogId);
    }
  }

  return (
    <AlertDialog open={!!isOpen[dialogId]}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading} onClick={() => close(dialogId)}>
            Cancel
          </AlertDialogCancel>
          <Button onClick={handleConfirm} colors="destructive" isLoading={isLoading}>
            {actionText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
