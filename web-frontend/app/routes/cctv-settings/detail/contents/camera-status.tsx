import { cn } from '@/lib/utils';

import { Text } from '@/components/helper/text';
import { Textarea } from '@/components/ui/textarea';

import { deviceStatusMap, type IEdgeDeviceStatus } from '@/schemas/models';

export function CameraStatusContent({
  camera_status,
  camera_error_message,
}: {
  camera_status?: IEdgeDeviceStatus;
  camera_error_message?: string | null;
}) {
  const realStatus: IEdgeDeviceStatus = camera_status || 'OFFLINE';

  return (
    <div
      className={cn(
        'flex w-full flex-col gap-6 rounded-md border border-teal-600 bg-teal-50 p-4 sm:p-8'
      )}
    >
      <Text type="t" className="font-semibold text-teal-800">
        Camera Status
      </Text>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Text type="p" className="text-muted-foreground">
            Status
          </Text>
          <Text type="btn" className="font-medium">
            {deviceStatusMap[realStatus] || realStatus}
          </Text>
        </div>
      </div>

      {realStatus === 'ERROR' && camera_error_message && (
        <div className="flex flex-col gap-2 pt-4">
          <Text type="t" className="font-semibold text-teal-800">
            Error Message
          </Text>

          <Textarea readOnly value={camera_error_message} />
        </div>
      )}
    </div>
  );
}
