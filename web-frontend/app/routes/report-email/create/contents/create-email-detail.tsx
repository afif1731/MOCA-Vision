import { useFormContext } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import type { ICreateEmailReceiver } from '@/schemas/models';

export function CreateEmailDetail() {
  const { control } = useFormContext<ICreateEmailReceiver>();

  return (
    <div className="flex w-full flex-col gap-4 rounded-xl bg-white px-6 py-6 drop-shadow-black/50 drop-shadow-xl lg:px-8">
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem className="flex w-full flex-col">
            <FormLabel>Receiver Name *</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Admin Report" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="email"
        render={({ field }) => (
          <FormItem className="flex w-full flex-col">
            <FormLabel>Email Address *</FormLabel>
            <FormControl>
              <Input placeholder="e.g. admin@example.com" type="email" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
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
                  className="size-5 cursor-pointer accent-teal-600"
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
