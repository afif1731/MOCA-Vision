import { valibotResolver } from '@hookform/resolvers/valibot';
import { LiveKitRoom } from '@livekit/components-react';
import { Trash2Icon } from 'lucide-react';
import { useEffect } from 'react';
import { Form, useNavigate, useRevalidator } from 'react-router';
import { RemixFormProvider, useRemixForm } from 'remix-hook-form';

import useDialogStore from '@/hooks/store/use-dialog';
import useLiveKitStore from '@/hooks/store/use-livekit';
import { useIsMobile } from '@/hooks/use-mobile';
import { api } from '@/lib/axios';
import { cn, generateMeta, handleApiResponseError } from '@/lib/utils';

import TitleSection from '@/components/sections/title';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

import { EditDeviceSchema, type IDeviceDetail } from '@/schemas/models';

import type { Route } from './+types';
import { DeviceCameraList } from './contents/camera-list';
import { DeviceStatus, DeviceStatusContent } from './contents/device-status';
import { EditDeviceDetail } from './contents/edit-device-detail';

export function meta({}: Route.MetaArgs) {
  return generateMeta('Device Detail', 'Edit Edge Device Detail');
}

export async function clientLoader({ params: { device_id } }: Route.ClientLoaderArgs) {
  try {
    const response = await api.get<IDeviceDetail>(`/edge-device/${device_id}`);
    await api.get('/edge-device/status');

    return { device: response.data };
  } catch (error) {
    handleApiResponseError(error, { withToast: false });
    return { device: undefined };
  }
}

export default function DeviceDetailPage({ loaderData }: Route.ComponentProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { token } = useLiveKitStore();
  const { open } = useDialogStore();

  const serverUrl = import.meta.env.VITE_LIVEKIT_URL;

  const device = loaderData.device;

  const revalidator = useRevalidator();

  const methods = useRemixForm({
    mode: 'onBlur',
    submitHandlers: {
      onValid: async (data) => {
        try {
          const payload = {
            name: data.name,
            location: data.location,
            type: data.type,
            max_cameras: data.max_cameras
              ? Number.parseInt(data.max_cameras as string, 10)
              : undefined,
          };
          await api.patch(`/edge-device/${device?.id}`, payload);
          toast.success('Device updated successfully');
          revalidator.revalidate();
        } catch (error) {
          handleApiResponseError(error);
        }
      },
    },
    resolver: valibotResolver(EditDeviceSchema),
  });

  const { reset, handleSubmit } = methods;

  useEffect(() => {
    if (device) {
      reset({
        name: device.name ?? '',
        type: device.type ?? '',
        location: device.location ?? '',
        max_cameras: String(device.max_cameras) ?? '',
      });
    }
  }, [reset, device]);

  return (
    <>
      {device && (
        <div
          className={cn(
            'block w-full bg-slate-100 px-8 py-8',
            isMobile ? 'min-h-lvh' : 'h-screen max-h-screen overflow-y-auto'
          )}
        >
          <TitleSection
            title="Edge Device Detail"
            description={device.name}
            backTo="/device-settings"
          />

          <RemixFormProvider {...methods}>
            <Form
              id={`edit-device-${device.id}`}
              className="flex w-full flex-col gap-y-3 pt-8 lg:gap-y-5"
              onSubmit={handleSubmit}
            >
              <EditDeviceDetail />
              {token ? (
                <LiveKitRoom token={token} serverUrl={serverUrl}>
                  <DeviceStatus />
                </LiveKitRoom>
              ) : (
                <DeviceStatusContent
                  device_status={device?.status}
                  device_id={device?.id}
                  is_inference_active={device?.is_inference_active}
                />
              )}
              <DeviceCameraList cameras={device.cameras} />

              <div className="mt-8 flex flex-col items-center justify-end gap-4 sm:flex-row">
                <Button
                  type="button"
                  variant="default"
                  colors="destructive"
                  leftIcon={<Trash2Icon />}
                  onClick={() => open('delete-device')}
                >
                  Delete Device
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  colors={device.status === 'ONLINE' ? 'destructive' : 'teal-800'}
                  className="w-full sm:w-auto"
                  onClick={() => open('toggle-device-status')}
                >
                  Set {device.status === 'ONLINE' ? 'Offline' : 'Online'}
                </Button>

                <div className="flex w-full flex-row gap-4 sm:ml-auto sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    colors="destructive"
                    onClick={() => {
                      reset({
                        name: device.name ?? '',
                        type: device.type ?? '',
                        location: device.location ?? '',
                        max_cameras: String(device.max_cameras) ?? '',
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
            dialogId="toggle-device-status"
            title={`Set Device to ${device.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE'}`}
            description={`Are you sure you want to set this device to ${device.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE'}?`}
            actionText="Confirm"
            onConfirm={async () => {
              try {
                const newStatus = device.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
                await api.patch(`/edge-device/${device.id}`, { status: newStatus });
                toast.success(`Device status changed to ${newStatus}`);
                revalidator.revalidate();
              } catch (error) {
                handleApiResponseError(error);
              }
            }}
          />

          <ConfirmDialog
            dialogId="delete-device"
            title="Delete Edge Device"
            description="Are you sure you want to delete this device? This action cannot be undone."
            actionText="Delete"
            onConfirm={async () => {
              try {
                await api.delete(`/edge-device/${device.id}`);
                toast.success('Device deleted successfully');
                navigate('/device-settings');
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
