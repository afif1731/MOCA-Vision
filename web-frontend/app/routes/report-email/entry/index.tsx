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

import type { IEmailReceiverItem } from '@/schemas/models';

import type { Route } from './+types';
import { EmailListComponent } from './components/email-list';

export function meta({}: Route.MetaArgs) {
  return generateMeta('Email Receivers', 'Email Report Receivers');
}

export async function clientLoader() {
  try {
    const [receiversRes, settingsRes] = await Promise.all([
      api.get<IEmailReceiverItem[]>('/report/email'),
      api.get<{ report_auto_send_email: boolean }>('/system/settings'),
    ]);
    return {
      receivers: receiversRes.data,
      globalEmailActive: settingsRes.data.report_auto_send_email,
      isError: false,
    };
  } catch (error) {
    handleApiResponseError(error, { withToast: false });
    return { receivers: [], globalEmailActive: false, isError: true };
  }
}

export default function ReportEmailPage({ loaderData }: Route.ComponentProps) {
  const isMobile = useIsMobile();
  const navigation = useNavigation();
  const { receivers, globalEmailActive: initialGlobalEmailActive, isError } = loaderData;

  const [globalEmailActive, setGlobalEmailActive] = useState<boolean>(initialGlobalEmailActive);
  const [isUpdatingGlobal, setIsUpdatingGlobal] = useState<boolean>(false);

  useEffect(() => {
    setGlobalEmailActive(initialGlobalEmailActive);
  }, [initialGlobalEmailActive]);

  const handleToggleGlobal = async () => {
    try {
      setIsUpdatingGlobal(true);
      const nextStatus = !globalEmailActive;
      await api.patch('/system/settings', { report_auto_send_email: String(nextStatus) });
      setGlobalEmailActive(nextStatus);
      toast.success(`Email Report has been ${nextStatus ? 'enabled' : 'disabled'}`);
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
      <TitleSection title="Email Receivers" />

      <div className="flex w-full flex-row items-center justify-end gap-4 pb-4">
        <Button
          variant="outline"
          size="lg"
          colors={globalEmailActive ? 'teal-800' : 'destructive'}
          leftIcon={<PowerIcon />}
          onClick={handleToggleGlobal}
          disabled={isUpdatingGlobal || isLoading}
        >
          {globalEmailActive ? 'Disable Email Report' : 'Enable Email Report'}
        </Button>
        <Button asChild variant="default" size="lg" leftIcon={<PlusIcon />}>
          <Link to="/report-email/create">Create</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex w-full items-center justify-center p-8">
          <Text type="h6" className="text-slate-500">
            Loading Email receivers...
          </Text>
        </div>
      ) : isError ? (
        <div className="flex w-full items-center justify-center p-8">
          <Text type="h6" className="text-red-500">
            Failed to load Email receivers.
          </Text>
        </div>
      ) : (
        <EmailListComponent receivers={receivers} />
      )}
    </div>
  );
}
