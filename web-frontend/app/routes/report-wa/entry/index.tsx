import { PlusIcon, PowerIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigation } from 'react-router';

import { useIsMobile } from '@/hooks/use-mobile';
import { api } from '@/lib/axios';
import { cn, generateMeta, handleApiResponseError } from '@/lib/utils';

import { Text } from '@/components/helper/text';
import TitleSection from '@/components/sections/title';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

import type { IWhatsappReceiverItem } from '@/schemas/models';

import type { Route } from './+types';
import { WaListComponent } from './components/wa-list';

export function meta({}: Route.MetaArgs) {
  return generateMeta('WhatsApp Receivers', 'WhatsApp Report Receivers');
}

export async function clientLoader() {
  try {
    const [receiversRes, settingsRes] = await Promise.all([
      api.get<IWhatsappReceiverItem[]>('/report/wa'),
      api.get<{ report_auto_send_wa: boolean }>('/system/settings'),
    ]);
    return {
      receivers: receiversRes.data,
      globalWaActive: settingsRes.data.report_auto_send_wa,
      isError: false,
    };
  } catch (error) {
    handleApiResponseError(error, { withToast: false });
    return { receivers: [], globalWaActive: false, isError: true };
  }
}

export default function ReportWaPage({ loaderData }: Route.ComponentProps) {
  const isMobile = useIsMobile();
  const navigation = useNavigation();
  const { receivers, globalWaActive: initialGlobalWaActive, isError } = loaderData;

  const [globalWaActive, setGlobalWaActive] = useState<boolean>(initialGlobalWaActive);
  const [isUpdatingGlobal, setIsUpdatingGlobal] = useState<boolean>(false);

  useEffect(() => {
    setGlobalWaActive(initialGlobalWaActive);
  }, [initialGlobalWaActive]);

  const handleToggleGlobal = async () => {
    try {
      setIsUpdatingGlobal(true);
      const nextStatus = !globalWaActive;
      await api.patch('/system/settings', { report_auto_send_wa: String(nextStatus) });
      setGlobalWaActive(nextStatus);
      toast.success(`WA Report has been ${nextStatus ? 'enabled' : 'disabled'}`);
    } catch (error) {
      handleApiResponseError(error);
    } finally {
      setIsUpdatingGlobal(false);
    }
  };

  const isLoading = navigation.state === 'loading';

  return (
    <div
      className={cn(
        'block w-full bg-slate-100 px-8 py-8',
        isMobile ? 'min-h-lvh' : 'h-screen max-h-screen overflow-y-auto'
      )}
    >
      <TitleSection title="WhatsApp Receivers" />

      <div className="flex w-full flex-row items-center justify-end gap-4 pb-4">
        <Button
          variant="outline"
          size="lg"
          colors={globalWaActive ? 'teal-800' : 'destructive'}
          leftIcon={<PowerIcon />}
          onClick={handleToggleGlobal}
          disabled={isUpdatingGlobal || isLoading}
        >
          {globalWaActive ? 'Disable WA Report' : 'Enable WA Report'}
        </Button>
        <Button asChild variant="default" size="lg" leftIcon={<PlusIcon />}>
          <Link to="/report-wa/create">Create</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex w-full items-center justify-center p-8">
          <Text type="h6" className="text-slate-500">
            Loading WhatsApp receivers...
          </Text>
        </div>
      ) : isError ? (
        <div className="flex w-full items-center justify-center p-8">
          <Text type="h6" className="text-red-500">
            Failed to load WhatsApp receivers.
          </Text>
        </div>
      ) : (
        <WaListComponent receivers={receivers} />
      )}
    </div>
  );
}
