import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

import { api } from '@/lib/axios';
import { itemStorage } from '@/lib/storage';
import { handleApiResponseError } from '@/lib/utils';

import { Text } from '@/components/helper/text';
import { Button } from '@/components/ui/button';

import type { ILayoutPages } from '@/schemas/types';

export function PreferenceLayoutPanel() {
  const [layoutDetails, setLayoutDetails] = useState<ILayoutPages[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    const fetchLayout = async () => {
      try {
        setIsLoading(true);
        const result = await api.get<ILayoutPages[]>('/layout/dashboard', {
          params: { preference: 'user_preference' },
        });
        setLayoutDetails(result.data);
      } catch (error) {
        handleApiResponseError(error, { withToast: true });
        setLayoutDetails([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLayout();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl bg-white p-6 shadow-sm">
        <Text type="p" className="text-slate-500">
          Loading user preference layout...
        </Text>
      </div>
    );
  }

  if (layoutDetails.length === 0 || !layoutDetails[0].json) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl bg-white p-12 shadow-sm">
        <Text type="h5" className="font-semibold text-slate-800">
          No Custom Layout Found
        </Text>
        <Text type="p" className="text-slate-500">
          You haven't set up a user preference layout yet.
        </Text>
      </div>
    );
  }

  const isExplicitPaging = layoutDetails.length > 1 || layoutDetails[0].page === 1;
  const currentLayoutDetail = isExplicitPaging ? layoutDetails[pageIndex] : layoutDetails[0];

  const defaultDimension = itemStorage.local.get<number[]>('default_dimension') || [1, 1];
  const dimension = currentLayoutDetail?.json?.dimension || defaultDimension;
  const maxTrack = dimension[0] * dimension[1];

  const totalPages = isExplicitPaging
    ? layoutDetails.length
    : Math.ceil((currentLayoutDetail?.json?.cameras.length || 0) / maxTrack);

  const handleNext = () => setPageIndex((prev) => (prev + 1) % totalPages);
  const handlePrev = () => setPageIndex((prev) => (prev - 1 + totalPages) % totalPages);

  const localPageIndex = isExplicitPaging ? 0 : pageIndex;
  const startIndex = localPageIndex * maxTrack;
  const camerasToRender = [];

  for (let i = 0; i < maxTrack; i++) {
    camerasToRender.push(currentLayoutDetail?.json?.cameras[startIndex + i]);
  }

  return (
    <div className="flex min-h-[calc(100vh-180px)] flex-col gap-6 rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <Text type="h6" className="font-semibold text-moca-darker">
          User Preference Layout Preview
        </Text>
        {totalPages > 1 && (
          <div className="flex items-center gap-4">
            <Text type="p" className="font-medium text-slate-500">
              Page {pageIndex + 1} of {totalPages}
            </Text>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex h-full w-full justify-center rounded-xl border border-slate-200 bg-slate-100 p-8">
        <div
          className="grid aspect-video w-full max-w-xl gap-2"
          style={{
            gridTemplateColumns: `repeat(${dimension[1]}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${dimension[0]}, minmax(0, 1fr))`,
          }}
        >
          {camerasToRender.map((camera, i) => (
            <div
              key={i}
              className="relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-lg bg-black p-4 text-center text-white shadow-inner"
            >
              {camera ? (
                <Text type="p" className="z-10 w-full truncate font-bold">
                  {camera.name}
                </Text>
              ) : (
                <Text type="p" className="text-slate-600 italic">
                  Empty Slot
                </Text>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
