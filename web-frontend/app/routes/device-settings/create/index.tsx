import { valibotResolver } from '@hookform/resolvers/valibot';
import { Form, useNavigate } from 'react-router';
import { RemixFormProvider, useRemixForm } from 'remix-hook-form';

import { useIsMobile } from '@/hooks/use-mobile';
import { api } from '@/lib/axios';
import { cn, generateMeta, handleApiResponseError } from '@/lib/utils';

import TitleSection from '@/components/sections/title';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

import { CreateDeviceSchema, type ICreateDevice } from '@/schemas/models';

import type { Route } from './+types';
import { CreateDeviceDetail } from './contents/create-device-detail';

export function meta({}: Route.MetaArgs) {
  return generateMeta('Create Device', 'Create Edge Device');
}

export default function CreateDevicePage({}: Route.ComponentProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const methods = useRemixForm<ICreateDevice>({
    mode: 'onBlur',
    defaultValues: {
      max_cameras: '1',
      is_inference_active: false,
    },
    submitHandlers: {
      onValid: async (data) => {
        try {
          const payload = {
            ...data,
            id: data.id || undefined,
            max_cameras: data.max_cameras ? Number.parseInt(data.max_cameras as string, 10) : 1,
          };
          await api.post('/edge-device', payload);
          toast.success('Device created successfully');
          navigate('/device-settings');
        } catch (error) {
          handleApiResponseError(error);
        }
      },
    },
    resolver: valibotResolver(CreateDeviceSchema),
  });

  const { handleSubmit } = methods;

  return (
    <div
      className={cn(
        'block w-full bg-slate-100 px-8 py-8',
        isMobile ? 'min-h-lvh' : 'h-screen max-h-screen overflow-y-auto'
      )}
    >
      <TitleSection title="Create Edge Device" backTo="/device-settings" />

      <RemixFormProvider {...methods}>
        <Form
          id="create-device"
          className="flex w-full flex-col gap-y-3 pt-8 lg:gap-y-5"
          onSubmit={handleSubmit}
        >
          <CreateDeviceDetail />

          <div className="mt-8 flex flex-col items-center justify-end gap-4 sm:flex-row">
            <div className="flex w-full flex-row gap-4 sm:ml-auto sm:w-auto">
              <Button
                type="button"
                variant="outline"
                colors="destructive"
                onClick={() => navigate('/device-settings')}
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
