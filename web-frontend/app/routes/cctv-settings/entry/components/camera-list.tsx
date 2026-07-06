import { VideoIcon } from 'lucide-react';
import { Link } from 'react-router';

import { cn } from '@/lib/utils';

import { Text } from '@/components/helper/text';

import type { ICameraItem } from '@/schemas/models';
import { cameraSourceMap } from '@/schemas/models';

import {
  DeviceStatusFrame,
  DeviceStatusMap,
} from '../../../device-settings/entry/components/device-list';

export function CameraListComponent({ cameras }: { cameras: ICameraItem[] }) {
  if (!cameras || cameras.length === 0)
    return (
      <div className="flex w-full flex-row items-center justify-start pt-5">
        <Text type="h5" className="font-semibold text-red-500">
          No CCTV found...
        </Text>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      {cameras.map((camera) => (
        <CameraItem key={camera.id} camera={camera} />
      ))}
    </div>
  );
}

function CameraItem({ camera }: { camera: ICameraItem }) {
  return (
    <div className="flex h-fit w-full flex-row items-center justify-evenly gap-6 rounded-xl bg-white px-4 py-3 drop-shadow-black/50 drop-shadow-xl">
      <VideoIcon
        className={cn(
          'size-9 stroke-3',
          camera.status === 'ONLINE' ? 'text-black' : 'text-slate-500'
        )}
      />

      <div className="flex w-full flex-col items-start justify-start gap-4">
        <div className="flex w-full flex-row justify-between">
          <Link to={`/cctv-settings/${camera.id}`}>
            <Text
              type="t"
              className={cn(
                'font-semibold hover:underline',
                camera.status === 'ONLINE'
                  ? 'text-red-500 hover:text-red-600'
                  : 'text-red-300 hover:text-red-400'
              )}
            >
              {camera.name}
            </Text>
          </Link>
          <div className="flex flex-row items-center justify-start gap-1 p-0">
            <Text type="btn" className={cn('font-semibold text-slate-500')}>
              {camera.device_id
                ? `Edge Device ID: ${camera.device_id.split('-')[0]}`
                : 'Unassigned'}
            </Text>
          </div>
        </div>

        <Text type="p" className="pb-2 text-moca-base">
          #{camera.id}
        </Text>

        <div className="flex flex-row items-start justify-center gap-4">
          <DeviceStatusFrame>
            <Text type="btn"> Status: </Text>
            <DeviceStatusMap status={camera.status} />
          </DeviceStatusFrame>

          <DeviceStatusFrame>
            <Text type="btn"> Source Type: </Text>
            <Text type="btn" className="font-semibold text-teal-800">
              {cameraSourceMap[camera.source_type] || camera.source_type}
            </Text>
          </DeviceStatusFrame>

          <DeviceStatusFrame>
            <Text type="btn"> CV Threshold: </Text>
            <Text type="btn" className="font-semibold text-teal-800">
              {camera.cv_threshold}
            </Text>
          </DeviceStatusFrame>
        </div>
      </div>
    </div>
  );
}
