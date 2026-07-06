import { valibotResolver } from '@hookform/resolvers/valibot';
import { Form, useNavigate } from 'react-router';
import { RemixFormProvider, useRemixForm } from 'remix-hook-form';

import { useIsMobile } from '@/hooks/use-mobile';
import { api } from '@/lib/axios';
import { cn, generateMeta, handleApiResponseError } from '@/lib/utils';

import TitleSection from '@/components/sections/title';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

import { CreateCameraSchema, type ICreateCamera } from '@/schemas/models';

import type { Route } from './+types';
import { CreateCameraDetail } from './contents/create-camera-detail';

export function meta({}: Route.MetaArgs) {
  return generateMeta('Create CCTV', 'Create CCTV Camera');
}

export default function CreateCameraPage({}: Route.ComponentProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const methods = useRemixForm<ICreateCamera>({
    mode: 'onBlur',
    defaultValues: {
      source_type: 'RTSP_LINK',
      edge_device_id: '',
    },
    submitHandlers: {
      onValid: async (data) => {
        try {
          const payload = {
            ...data,
            edge_device_id: data.edge_device_id || undefined,
            rtsp_username: data.rtsp_username || undefined,
            rtsp_password: data.rtsp_password || undefined,
          };
          await api.post('/camera', payload);
          toast.success('CCTV Camera created successfully');
          navigate('/cctv-settings');
        } catch (error) {
          handleApiResponseError(error);
        }
      },
    },
    resolver: valibotResolver(CreateCameraSchema),
  });

  const { handleSubmit } = methods;

  return (
    <div
      className={cn(
        'flex w-full flex-col bg-slate-100 px-8 py-8',
        isMobile ? 'min-h-lvh' : 'h-screen max-h-screen overflow-y-auto'
      )}
    >
      <TitleSection title="Create CCTV Camera" backTo="/cctv-settings" />

      <RemixFormProvider {...methods}>
        <Form
          id="create-camera"
          className="flex w-full flex-1 flex-col gap-y-3 pt-8 lg:gap-y-5"
          onSubmit={handleSubmit}
        >
          <CreateCameraDetail />

          <div className="mt-auto flex flex-col items-center justify-end gap-4 pt-8 sm:flex-row">
            <div className="flex h-fit w-full flex-row gap-4 sm:ml-auto sm:w-auto">
              <Button
                type="button"
                variant="outline"
                colors="destructive"
                onClick={() => navigate('/cctv-settings')}
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
