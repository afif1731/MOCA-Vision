import { PlusIcon, PowerIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

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

export default function ReportEmailPage() {
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [receivers, setReceivers] = useState<IEmailReceiverItem[]>([]);
  const [globalEmailActive, setGlobalEmailActive] = useState<boolean>(false);
  const [isUpdatingGlobal, setIsUpdatingGlobal] = useState<boolean>(false);

  useEffect(() => {
    const fetchReceivers = async () => {
      try {
        setIsLoading(true);
        setIsError(false);
        const [receiversRes, settingsRes] = await Promise.all([
          api.get<IEmailReceiverItem[]>('/report/email'),
          api.get<{ report_auto_send_email: boolean }>('/system/settings'),
        ]);
        setReceivers(receiversRes.data);
        setGlobalEmailActive(settingsRes.data.report_auto_send_email);
      } catch (error) {
        handleApiResponseError(error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReceivers();
  }, []);

  const handleToggleGlobal = async () => {
    try {
      setIsUpdatingGlobal(true);
      const nextStatus = !globalEmailActive;
      await api.patch('/system/settings', { report_auto_send_email: String(nextStatus) });
      setGlobalEmailActive(nextStatus);
      toast.success(`Global Email Report has been ${nextStatus ? 'enabled' : 'disabled'}`);
    } catch (error) {
      handleApiResponseError(error);
    } finally {
      setIsUpdatingGlobal(false);
    }
  };

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
          {globalEmailActive ? 'Disable Global Email Report' : 'Enable Global Email Report'}
        </Button>
        <Button asChild variant="default" size="lg" leftIcon={<PlusIcon />}>
          <Link to="/report-email/create">Create Receiver</Link>
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
