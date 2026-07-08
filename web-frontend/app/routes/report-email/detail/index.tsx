import { valibotResolver } from '@hookform/resolvers/valibot';
import { Trash2Icon } from 'lucide-react';
import { useEffect } from 'react';
import { Form, useNavigate, useRevalidator } from 'react-router';
import { RemixFormProvider, useRemixForm } from 'remix-hook-form';

import useDialogStore from '@/hooks/store/use-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { api } from '@/lib/axios';
import { cn, generateMeta, handleApiResponseError } from '@/lib/utils';

import TitleSection from '@/components/sections/title';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

import {
  EditEmailReceiverSchema,
  type IEditEmailReceiver,
  type IEmailReceiverDetail,
} from '@/schemas/models';

import type { Route } from './+types';
import { EditEmailDetail } from './contents/edit-email-detail';

export function meta({}: Route.MetaArgs) {
  return generateMeta('Email Receiver Detail', 'Edit Email Receiver Detail');
}

export async function clientLoader({ params: { id } }: Route.ClientLoaderArgs) {
  try {
    const response = await api.get<IEmailReceiverDetail>(`/report/email/${id}`);
    return { receiver: response.data };
  } catch (error) {
    handleApiResponseError(error, { withToast: false });
    return { receiver: undefined };
  }
}

export default function EmailDetailPage({ loaderData }: Route.ComponentProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { open } = useDialogStore();

  const receiver = loaderData.receiver;
  const revalidator = useRevalidator();

  const methods = useRemixForm<IEditEmailReceiver>({
    mode: 'onBlur',
    defaultValues: {
      name: receiver?.name ?? '',
      email: receiver?.email ?? '',
      is_activated: receiver?.is_activated ?? true,
    },
    submitHandlers: {
      onValid: async (data) => {
        try {
          await api.patch(`/report/email/${receiver?.id}`, data);
          toast.success('Email Receiver updated successfully');
          revalidator.revalidate();
        } catch (error) {
          handleApiResponseError(error);
        }
      },
    },
    resolver: valibotResolver(EditEmailReceiverSchema),
  });

  const { reset, handleSubmit } = methods;

  useEffect(() => {
    if (receiver) {
      reset({
        name: receiver.name ?? '',
        email: receiver.email ?? '',
        is_activated: receiver.is_activated ?? true,
      });
    }
  }, [reset, receiver]);

  return (
    <>
      {receiver && (
        <div
          className={cn(
            'flex w-full flex-col bg-slate-100 px-8 py-8',
            isMobile ? 'min-h-lvh' : 'h-screen max-h-screen overflow-y-auto'
          )}
        >
          <TitleSection
            title="Email Receiver Detail"
            description={receiver.name}
            backTo="/report-email"
          />

          <RemixFormProvider {...methods}>
            <Form
              id={`edit-email-${receiver.id}`}
              className="flex w-full flex-1 flex-col gap-y-3 pt-8 lg:gap-y-5"
              onSubmit={handleSubmit}
            >
              <EditEmailDetail />

              <div className="mt-auto flex flex-col items-center justify-end gap-4 pt-8 sm:flex-row">
                <Button
                  type="button"
                  variant="default"
                  colors="destructive"
                  leftIcon={<Trash2Icon />}
                  onClick={() => open('delete-email')}
                >
                  Delete Receiver
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  colors={receiver.is_activated ? 'destructive' : 'teal-800'}
                  className="w-full sm:w-auto"
                  onClick={() => open('toggle-email-status')}
                >
                  Set {receiver.is_activated ? 'Disabled' : 'Enabled'}
                </Button>

                <div className="flex w-full flex-row gap-4 sm:ml-auto sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    colors="destructive"
                    onClick={() => {
                      reset({
                        name: receiver.name ?? '',
                        email: receiver.email ?? '',
                        is_activated: receiver.is_activated ?? true,
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={methods.formState.isSubmitting}
                  >
                    Update
                  </Button>
                </div>
              </div>
            </Form>
          </RemixFormProvider>

          <ConfirmDialog
            dialogId="toggle-email-status"
            title={`Set Receiver to ${receiver.is_activated ? 'DISABLED' : 'ENABLED'}`}
            description={`Are you sure you want to set this receiver to ${receiver.is_activated ? 'DISABLED' : 'ENABLED'}?`}
            actionText="Confirm"
            onConfirm={async () => {
              try {
                const newStatus = !receiver.is_activated;
                await api.patch(`/report/email/${receiver.id}`, { is_activated: newStatus });
                toast.success(`Receiver status changed to ${newStatus ? 'Enabled' : 'Disabled'}`);
                revalidator.revalidate();
              } catch (error) {
                handleApiResponseError(error);
              }
            }}
          />

          <ConfirmDialog
            dialogId="delete-email"
            title="Delete Email Receiver"
            description="Are you sure you want to delete this receiver? This action cannot be undone."
            actionText="Delete"
            onConfirm={async () => {
              try {
                await api.delete(`/report/email/${receiver.id}`);
                toast.success('Receiver deleted successfully');
                navigate('/report-email');
              } catch (error) {
                handleApiResponseError(error);
              }
            }}
          />
        </div>
      )}
    </>
  );
}
