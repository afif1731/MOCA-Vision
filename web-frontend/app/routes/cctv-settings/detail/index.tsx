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

import { EditCameraSchema, type ICameraDetail, type IEditCamera } from '@/schemas/models';

import type { Route } from './+types';
import { CameraStatusContent } from './contents/camera-status';
import { EditCameraDetail } from './contents/edit-camera-detail';

export function meta({}: Route.MetaArgs) {
  return generateMeta('CCTV Detail', 'Edit CCTV Camera Detail');
}

export async function clientLoader({ params: { camera_id } }: Route.ClientLoaderArgs) {
  try {
    const response = await api.get<ICameraDetail>(`/camera/${camera_id}`);
    return { camera: response.data };
  } catch (error) {
    handleApiResponseError(error, { withToast: false });
    return { camera: undefined };
  }
}

export default function CameraDetailPage({ loaderData }: Route.ComponentProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { open } = useDialogStore();

  const camera = loaderData.camera;
  const revalidator = useRevalidator();

  const methods = useRemixForm<IEditCamera>({
    mode: 'onBlur',
    submitHandlers: {
      onValid: async (data) => {
        try {
          const payload = {
            ...data,
            edge_device_id: data.edge_device_id || null,
            rtsp_username: data.rtsp_username || undefined,
            rtsp_password: data.rtsp_password || undefined,
          };
          await api.patch(`/camera/${camera?.id}`, payload);
          toast.success('CCTV updated successfully');
          revalidator.revalidate();
        } catch (error) {
          handleApiResponseError(error);
        }
      },
    },
    resolver: valibotResolver(EditCameraSchema),
  });

  const { reset, handleSubmit } = methods;

  useEffect(() => {
    if (camera) {
      reset({
        name: camera.name ?? '',
        source: camera.source ?? '',
        source_type: camera.source_type ?? 'RTSP_LINK',
        rtsp_username: camera.rtsp_username ?? '',
        rtsp_password: camera.rtsp_password ?? '',
        edge_device_id: camera.edge_device_id ?? '',
      });
    }
  }, [reset, camera]);

  return (
    <>
      {camera && (
        <div
          className={cn(
            'block w-full bg-slate-100 px-8 py-8',
            isMobile ? 'min-h-lvh' : 'h-screen max-h-screen overflow-y-auto'
          )}
        >
          <TitleSection title="CCTV Detail" description={camera.name} backTo="/cctv-settings" />

          <RemixFormProvider {...methods}>
            <Form
              id={`edit-camera-${camera.id}`}
              className="flex w-full flex-col gap-y-3 pt-8 lg:gap-y-5"
              onSubmit={handleSubmit}
            >
              <EditCameraDetail />

              <CameraStatusContent
                camera_status={camera?.status}
                camera_error_message={camera?.error_message}
              />

              <div className="mt-8 flex flex-col items-center justify-end gap-4 sm:flex-row">
                <Button
                  type="button"
                  variant="default"
                  colors="destructive"
                  leftIcon={<Trash2Icon />}
                  onClick={() => open('delete-camera')}
                >
                  Delete CCTV
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  colors={camera.status === 'ONLINE' ? 'destructive' : 'teal-800'}
                  className="w-full sm:w-auto"
                  onClick={() => open('toggle-camera-status')}
                >
                  Set {camera.status === 'ONLINE' ? 'Offline' : 'Online'}
                </Button>

                <div className="flex w-full flex-row gap-4 sm:ml-auto sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    colors="destructive"
                    onClick={() => {
                      reset({
                        name: camera.name ?? '',
                        source: camera.source ?? '',
                        source_type: camera.source_type ?? 'RTSP_LINK',
                        rtsp_username: camera.rtsp_username ?? '',
                        rtsp_password: camera.rtsp_password ?? '',
                        edge_device_id: camera.edge_device_id ?? '',
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
            dialogId="toggle-camera-status"
            title={`Set CCTV to ${camera.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE'}`}
            description={`Are you sure you want to set this CCTV to ${camera.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE'}?`}
            actionText="Confirm"
            onConfirm={async () => {
              try {
                const newStatus = camera.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
                await api.patch(`/camera/${camera.id}`, { status: newStatus });
                toast.success(`CCTV status changed to ${newStatus}`);
                revalidator.revalidate();
              } catch (error) {
                handleApiResponseError(error);
              }
            }}
          />

          <ConfirmDialog
            dialogId="delete-camera"
            title="Delete CCTV Camera"
            description="Are you sure you want to delete this CCTV? This action cannot be undone."
            actionText="Delete"
            onConfirm={async () => {
              try {
                await api.delete(`/camera/${camera.id}`);
                toast.success('CCTV deleted successfully');
                navigate('/cctv-settings');
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
