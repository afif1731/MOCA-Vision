import { useFormContext } from 'react-hook-form';

import InputForm from '@/components/form/input';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';

import type { ICreateEmailReceiver } from '@/schemas/models';

export function CreateEmailDetail() {
  const { control } = useFormContext<ICreateEmailReceiver>();

  return (
    <div className="flex w-full flex-col gap-4 rounded-xl bg-white px-6 py-6 drop-shadow-black/50 drop-shadow-xl lg:px-8">
      <InputForm isRequired name="name" label="Receiver Name" placeholder="e.g. Admin Report" />

      <InputForm
        isRequired
        name="email"
        label="Email Address"
        placeholder="e.g. admin@example.com"
        inputProps={{ type: 'email' }}
      />

      <div className="mt-2 flex flex-row items-center justify-start gap-12">
        <FormField
          control={control}
          name="is_activated"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-4 space-y-0">
              <FormLabel className="cursor-pointer">Active</FormLabel>
              <FormControl>
                <input
                  type="checkbox"
                  className="size-5 cursor-pointer bg-slate-50 accent-teal-600"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
