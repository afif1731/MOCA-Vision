import { useDataChannel } from '@livekit/components-react';
import { useState } from 'react';
import { useLoaderData } from 'react-router';

import { api } from '@/lib/axios';
import { cn } from '@/lib/utils';

import { Text } from '@/components/helper/text';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { deviceStatusMap, type IEdgeDeviceState, type IEdgeDeviceStatus } from '@/schemas/models';

import type { clientLoader } from '..';

export function DeviceStatus() {
  const { device } = useLoaderData<typeof clientLoader>();
  const [deviceState, setDeviceState] = useState<IEdgeDeviceState | null>(null);

  useDataChannel('device_status', (message) => {
    try {
      const str = new TextDecoder().decode(message.payload);
      const parsed = JSON.parse(str);
      const dataArray: IEdgeDeviceState[] = Array.isArray(parsed) ? parsed : [parsed];

      const state = dataArray.find((d) => d.id === device?.id);
      if (state) {
        setDeviceState(state);
      }
    } catch (error) {
      console.error('Failed to parse device_status message', error);
    }
  });

  return (
    <DeviceStatusContent
      device_status={device?.status}
      device_state={deviceState}
      device_id={device?.id}
      is_inference_active={device?.is_inference_active}
    />
  );
}

export function DeviceStatusContent({
  device_status,
  device_state,
  device_error_message,
  device_id,
  is_inference_active,
}: {
  device_status?: IEdgeDeviceStatus;
  device_state?: IEdgeDeviceState | null;
  device_error_message?: string;
  device_id?: string;
  is_inference_active?: boolean;
}) {
  const realStatus: IEdgeDeviceStatus = device_state
    ? device_status || 'OFFLINE'
    : device_status === 'DISABLED' || device_status === 'ERROR'
      ? device_status
      : 'NO_SIGNAL';

  const [inferenceActive, setInferenceActive] = useState(is_inference_active ?? false);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleInference = async () => {
    if (!device_id) return;
    try {
      setIsLoading(true);
      await api.patch(`/edge-device/${device_id}`, { is_inference_active: !inferenceActive });
      setInferenceActive(!inferenceActive);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        'flex w-full flex-col gap-6 rounded-md border border-teal-600 bg-teal-50 p-4 sm:p-8'
      )}
    >
      <Text type="t" className="font-semibold text-teal-800">
        Device Status
      </Text>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
        <div className="flex flex-col gap-1">
          <Text type="p" className="text-muted-foreground">
            Status
          </Text>
          <Text type="btn" className="font-medium">
            {deviceStatusMap[realStatus]}
          </Text>
        </div>

        <div className="flex flex-col gap-1">
          <Text type="p" className="text-muted-foreground">
            CPU Usage
          </Text>
          <Text type="btn" className="font-medium">
            {device_state?.cpu !== undefined ? `${device_state.cpu.toFixed(1)}%` : '-'}
          </Text>
        </div>

        <div className="flex flex-col gap-1">
          <Text type="p" className="text-muted-foreground">
            RAM Usage
          </Text>
          <Text type="btn" className="font-medium">
            {device_state?.ram !== undefined ? `${device_state.ram.toFixed(1)}%` : '-'}
          </Text>
        </div>

        <div className="flex flex-col gap-1">
          <Text type="p" className="text-muted-foreground">
            Storage
          </Text>
          <Text type="btn" className="font-medium">
            {device_state?.storage !== undefined ? `${device_state.storage.toFixed(1)}%` : '-'}
          </Text>
        </div>

        <div className="flex flex-col gap-1">
          <Text type="p" className="text-muted-foreground">
            Temperature
          </Text>
          <Text type="btn" className="font-medium">
            {device_state?.temperature !== undefined
              ? `${device_state.temperature.toFixed(1)} °C`
              : '-'}
          </Text>
        </div>
      </div>

      <div className="flex w-full items-center justify-between">
        <div className="flex flex-col gap-1">
          <Text type="p" className="text-muted-foreground">
            Inference
          </Text>
          <Text
            type="btn"
            className={cn('font-medium', inferenceActive ? 'text-green-600' : 'text-red-600')}
          >
            {inferenceActive ? 'Active' : 'Inactive'}
          </Text>
        </div>
        <Button
          variant="default"
          colors={inferenceActive ? 'destructive' : 'default'}
          disabled={isLoading || !device_id}
          onClick={handleToggleInference}
        >
          {inferenceActive ? 'Deactivate' : 'Activate'}
        </Button>
      </div>

      {device_status === 'ERROR' && (
        <>
          <Text type="t" className="font-semibold text-teal-800">
            Error Message
          </Text>

          <Textarea readOnly>{device_error_message}</Textarea>
        </>
      )}
    </div>
  );
}
