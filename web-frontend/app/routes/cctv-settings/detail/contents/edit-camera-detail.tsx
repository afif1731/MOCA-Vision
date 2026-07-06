import { VideoIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { api } from '@/lib/axios';
import { cn } from '@/lib/utils';

import InputForm from '@/components/form/input';
import { Text } from '@/components/helper/text';

import { cameraSourceMap } from '@/schemas/models';

export function EditCameraDetail() {
  const { register } = useFormContext();
  const sourceType = useWatch({ name: 'source_type' });
  const [sampleVideos, setSampleVideos] = useState<string[]>([]);

  useEffect(() => {
    if (sourceType === 'STATIC_FILE') {
      api
        .get<string[]>('/system/sample-video')
        .then((res) => {
          setSampleVideos(res.data);
        })
        .catch(console.error);
    }
  }, [sourceType]);

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center gap-8 rounded-md border border-teal-600 bg-teal-50 p-4 sm:p-8 md:flex-row'
      )}
    >
      <CameraImage />

      <div className="flex w-full flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <InputForm isRequired name="name" label="CCTV Name" placeholder="Input your CCTV name" />
          <InputForm
            name="device_id"
            label="Device ID (Optional)"
            placeholder="Input UUID for Edge Device"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {sourceType === 'STATIC_FILE' ? (
            <div className="flex flex-col justify-center gap-2">
              <Text type="p" className="font-semibold text-teal-800">
                Source URL / Path
              </Text>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:font-medium file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register('source')}
              >
                <option value="" disabled>
                  Select a video...
                </option>
                {sampleVideos.map((vid) => (
                  <option key={vid} value={vid}>
                    {vid}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <InputForm
              isRequired
              name="source"
              label="Source URL / Path"
              placeholder="e.g., ip/path or /dev/video0"
            />
          )}

          <div className="flex flex-col justify-center gap-2">
            <Text type="p" className="font-semibold text-teal-800">
              Source Type
            </Text>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:font-medium file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...register('source_type')}
            >
              {Object.entries(cameraSourceMap).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          {sourceType === 'RTSP_LINK' && (
            <>
              <InputForm
                isRequired
                name="rtsp_username"
                label="RTSP Username"
                placeholder="Input RTSP Username"
              />

              <InputForm
                isRequired
                name="rtsp_password"
                label="RTSP Password"
                placeholder="Input RTSP Password (Re-enter for security)"
                type="password"
              />
            </>
          )}

          <InputForm
            isRequired
            type="number"
            name="cv_threshold"
            label="CV Threshold"
            placeholder="e.g., 0.5"
            inputProps={{ step: 0.1, min: 0, max: 1 }}
          />

          <InputForm
            name="error_message"
            label="Error Message"
            placeholder="Error message if any"
            isDisabled
          />
        </div>
      </div>
    </div>
  );
}

function CameraImage() {
  return (
    <div className="h-fit w-fit rounded-md border-2 border-teal-800 bg-white shadow-accent-foreground shadow-md">
      <VideoIcon className="size-48 stroke-3 p-4 text-teal-800" />
    </div>
  );
}
