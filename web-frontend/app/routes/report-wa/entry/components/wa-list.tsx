import { UserIcon, UsersIcon } from 'lucide-react';
import { Link, useRevalidator } from 'react-router';

import { api } from '@/lib/axios';
import { cn, handleApiResponseError } from '@/lib/utils';

import { Text } from '@/components/helper/text';
import { toast } from '@/components/ui/toast';

import type { IWhatsappReceiverItem } from '@/schemas/models';

export function WaListComponent({ receivers }: { receivers: IWhatsappReceiverItem[] }) {
  if (!receivers || receivers.length === 0)
    return (
      <div className="flex w-full flex-row items-center justify-start pt-5">
        <Text type="h5" className="font-semibold text-red-500">
          No WhatsApp receivers found...
        </Text>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      {receivers.map((receiver) => (
        <WaItem key={receiver.id} receiver={receiver} />
      ))}
    </div>
  );
}

function WaItem({ receiver }: { receiver: IWhatsappReceiverItem }) {
  const revalidator = useRevalidator();

  const handleToggle = async (checked: boolean) => {
    try {
      await api.patch(`/report/wa/${receiver.id}`, { is_activated: checked });
      toast.success(`WhatsApp receiver ${checked ? 'enabled' : 'disabled'}`);
      revalidator.revalidate();
    } catch (error) {
      handleApiResponseError(error);
    }
  };

  return (
    <div className="flex h-fit w-full flex-row items-center justify-between gap-6 rounded-xl bg-white px-6 py-4 drop-shadow-black/50 drop-shadow-xl">
      <div className="flex items-center gap-6">
        {receiver.is_group ? (
          <UsersIcon
            className={cn(
              'size-9 stroke-3',
              receiver.is_activated ? 'text-black' : 'text-slate-500'
            )}
          />
        ) : (
          <UserIcon
            className={cn(
              'size-9 stroke-3',
              receiver.is_activated ? 'text-black' : 'text-slate-500'
            )}
          />
        )}
        <div className="flex flex-col items-start justify-start gap-2">
          <Link to={`/report-wa/${receiver.id}`}>
            <Text
              type="t"
              className={cn(
                'font-semibold hover:underline',
                receiver.is_activated
                  ? 'text-red-500 hover:text-red-600'
                  : 'text-red-300 hover:text-red-400'
              )}
            >
              {receiver.name}
            </Text>
          </Link>
          <Text type="p" className="text-slate-500">
            {receiver.wa_chat_id}
          </Text>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Text type="btn" className="font-semibold text-slate-500">
          {receiver.is_activated ? 'Enabled' : 'Disabled'}
        </Text>
        <input
          type="checkbox"
          className="size-5 cursor-pointer bg-slate-50 accent-teal-600"
          checked={receiver.is_activated}
          onChange={(e) => handleToggle(e.target.checked)}
        />
      </div>
    </div>
  );
}
