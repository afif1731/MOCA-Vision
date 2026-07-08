import { useFormContext } from 'react-hook-form';

import InputForm from '@/components/form/input';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';

import type { IEditWhatsappReceiver } from '@/schemas/models';

export function EditWaDetail() {
  const { control } = useFormContext<IEditWhatsappReceiver>();

  return (
    <div className="flex w-full flex-col gap-4 rounded-xl bg-white px-6 py-6 drop-shadow-black/50 drop-shadow-xl lg:px-8">
      <InputForm isRequired name="name" label="Receiver Name" placeholder="e.g. Admin Group" />

      <InputForm
        isRequired
        name="wa_chat_id"
        label="WhatsApp Chat ID"
        placeholder="e.g. 6281234567890 or group invite link / ID"
      />

      <div className="mt-2 flex flex-row items-center justify-start gap-12">
        <FormField
          control={control}
          name="is_group"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-4 space-y-0">
              <FormLabel className="cursor-pointer">Is Group Chat?</FormLabel>
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
