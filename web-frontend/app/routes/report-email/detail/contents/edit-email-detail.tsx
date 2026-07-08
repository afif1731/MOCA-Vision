import { useFormContext } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import type { IEditEmailReceiver } from '@/schemas/models';

export function EditEmailDetail() {
  const { control } = useFormContext<IEditEmailReceiver>();

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
    </div>
  );
}
