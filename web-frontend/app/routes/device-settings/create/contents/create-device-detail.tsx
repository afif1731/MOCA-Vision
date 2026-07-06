import { HardDriveIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { cn, createSlug } from '@/lib/utils';

import InputForm from '@/components/form/input';
import { Text } from '@/components/helper/text';

export function CreateDeviceDetail() {
  const [deviceSlug, setDeviceSlug] = useState<string | undefined>(undefined);
  const nameValue = useWatch({ name: 'name' });
  const { register } = useFormContext();

  useEffect(() => {
    if (nameValue !== undefined) {
      setDeviceSlug(nameValue);
    }
  }, [nameValue]);

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center gap-8 rounded-md border border-teal-600 bg-teal-50 p-4 sm:p-8 md:flex-row'
      )}
    >
      <DeviceImage />

      <div className="flex w-full flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <InputForm
            name="id"
            label="Device ID (Optional)"
            placeholder="Input UUID v7 (Optional)"
          />
          <div className="grid grid-cols-1 gap-2">
            <InputForm
              isRequired
              name="name"
              label="Device Name"
              placeholder="Input your device name"
            />
            {deviceSlug && (
              <Text type="btn" className="text-teal-800">
                Slug: {createSlug(deviceSlug)}
              </Text>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <InputForm
            isRequired
            name="type"
            label="Device Type"
            placeholder="Input your device type"
          />
          <InputForm
            isRequired
            name="location"
            label="Device Location"
            placeholder="Input your device location"
          />
          <InputForm
            isRequired
            type="number"
            name="max_cameras"
            label="Max. Cameras"
            placeholder="ex. 1"
          />
          <div className="flex flex-col justify-center gap-2">
            <Text type="p" className="text-teal-800">
              Inference Active
            </Text>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_inference_active"
                className="h-4 w-4 cursor-pointer rounded border-gray-300 text-teal-600 focus:ring-teal-600"
                {...register('is_inference_active')}
              />
              <label
                htmlFor="is_inference_active"
                className="cursor-pointer font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Activate Inference
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeviceImage() {
  return (
    <div className="h-fit w-fit rounded-md border-2 border-teal-800 bg-white shadow-accent-foreground shadow-md">
      <HardDriveIcon className="size-48 stroke-3 p-4 text-teal-800" />
    </div>
  );
}
