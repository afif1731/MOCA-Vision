import { valibotResolver } from '@hookform/resolvers/valibot';
import { Form, useNavigate } from 'react-router';
import { RemixFormProvider, useRemixForm } from 'remix-hook-form';

import { useIsMobile } from '@/hooks/use-mobile';
import { api } from '@/lib/axios';
import { cn, generateMeta, handleApiResponseError } from '@/lib/utils';

import TitleSection from '@/components/sections/title';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

import { CreateWhatsappReceiverSchema, type ICreateWhatsappReceiver } from '@/schemas/models';

import type { Route } from './+types';
import { CreateWaDetail } from './contents/create-wa-detail';

export function meta({}: Route.MetaArgs) {
  return generateMeta('Create WA Receiver', 'Create WhatsApp Receiver');
}

export default function CreateWaPage({}: Route.ComponentProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const methods = useRemixForm<ICreateWhatsappReceiver>({
    mode: 'onBlur',
    defaultValues: {
      name: '',
      wa_chat_id: '',
      is_group: false,
      is_activated: true,
    },
    submitHandlers: {
      onValid: async (data) => {
        try {
          await api.post('/report/wa', data);
          toast.success('WhatsApp Receiver created successfully');
          navigate('/report-wa');
        } catch (error) {
          handleApiResponseError(error);
        }
      },
    },
    resolver: valibotResolver(CreateWhatsappReceiverSchema),
  });

  const { handleSubmit } = methods;

  return (
    <div
      className={cn(
        'flex w-full flex-col bg-slate-100 px-8 py-8',
        isMobile ? 'min-h-lvh' : 'h-screen max-h-screen overflow-y-auto'
      )}
    >
      <TitleSection title="Create WhatsApp Receiver" backTo="/report-wa" />

      <RemixFormProvider {...methods}>
        <Form
          id="create-wa"
          className="flex w-full flex-1 flex-col gap-y-3 pt-8 lg:gap-y-5"
          onSubmit={handleSubmit}
        >
          <CreateWaDetail />

          <div className="mt-auto flex flex-col items-center justify-end gap-4 pt-8 sm:flex-row">
            <div className="flex h-fit w-full flex-row gap-4 sm:ml-auto sm:w-auto">
              <Button
                type="button"
                variant="outline"
                colors="destructive"
                onClick={() => navigate('/report-wa')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={methods.formState.isSubmitting}
              >
                Create
              </Button>
            </div>
          </div>
        </Form>
      </RemixFormProvider>
    </div>
  );
}
