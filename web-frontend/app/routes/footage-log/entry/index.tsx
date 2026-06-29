// biome-ignore-all lint/suspicious/noExplicitAny: any required for now
import { useEffect, useState } from 'react';

import { useIsMobile } from '@/hooks/use-mobile';
import { api } from '@/lib/axios';
import { cn, generateMeta, handleApiResponseError } from '@/lib/utils';

import { Text } from '@/components/helper/text';
import TitleSection from '@/components/sections/title';

import type { IDetectedAnomaly } from '@/schemas/models';

import type { Route } from './+types';
import { FootageList } from './components';

export function meta({}: Route.MetaArgs) {
  return generateMeta('Footage Log', 'View recorded anomaly footages');
}

export default function FootageLogPage() {
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [footages, setFootages] = useState<IDetectedAnomaly[]>([]);

  useEffect(() => {
    const fetchFootages = async () => {
      try {
        setIsLoading(true);
        setIsError(false);
        const response = await api.get<IDetectedAnomaly[]>('/violence-detection/');

        // Use response.data if it's the array, or response.data.data if paginated
        const listData = Array.isArray(response.data)
          ? response.data
          : (response.data as any).data || [];
        setFootages(listData);
      } catch (error) {
        handleApiResponseError(error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFootages();
  }, []);

  return (
    <div
      className={cn(
        'block w-full bg-slate-100 px-8 py-8',
        isMobile ? 'min-h-lvh' : 'h-screen max-h-screen overflow-y-auto'
      )}
    >
      <TitleSection title="Footage Logs" />

      {isLoading ? (
        <div className="flex w-full items-center justify-center p-8">
          <Text type="h6" className="text-slate-500">
            Loading footages...
          </Text>
        </div>
      ) : isError ? (
        <div className="flex w-full items-center justify-center p-8">
          <Text type="h6" className="text-red-500">
            Failed to load footages.
          </Text>
        </div>
      ) : footages.length === 0 ? (
        <div className="flex w-full items-center justify-center p-8">
          <Text type="h6" className="text-slate-500">
            No footage recorded yet.
          </Text>
        </div>
      ) : (
        <FootageList footages={footages} />
      )}
    </div>
  );
}
