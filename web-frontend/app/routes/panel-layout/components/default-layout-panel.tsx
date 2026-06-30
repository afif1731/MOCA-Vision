import { useState } from 'react';

import { itemStorage } from '@/lib/storage';

import { Text } from '@/components/helper/text';

export function DefaultLayoutPanel() {
  const [dimension, setDimension] = useState<number[]>(() => {
    return itemStorage.local.get<number[]>('default_dimension') || [1, 1];
  });

  const handleSelect = (rows: number, cols: number) => {
    const newDim = [rows, cols];
    setDimension(newDim);
    itemStorage.local.set('default_dimension', newDim);
  };

  return (
    <div className="flex w-full flex-col gap-8 rounded-xl bg-white p-4 shadow-sm">
      <Text type="h6" className="font-semibold text-moca-darker">
        Choose Grid Dimension
      </Text>

      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="height-select" className="font-medium text-slate-700 text-sm">
            Height (Rows)
          </label>
          <select
            id="height-select"
            value={dimension[0]}
            onChange={(e) => handleSelect(Number(e.target.value), dimension[1])}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <Text type="p" className="mt-6 font-bold text-slate-400">
          X
        </Text>

        <div className="flex flex-col gap-2">
          <label htmlFor="width-select" className="font-medium text-slate-700 text-sm">
            Width (Columns)
          </label>
          <select
            id="width-select"
            value={dimension[1]}
            onChange={(e) => handleSelect(dimension[0], Number(e.target.value))}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-slate-100 bg-slate-50 p-6">
        <Text type="p" className="mb-2 font-medium text-slate-500">
          Preview Layout: {dimension[0]} x {dimension[1]}
        </Text>

        <div
          className="grid aspect-video w-full max-w-[400px] gap-2"
          style={{
            gridTemplateColumns: `repeat(${dimension[1]}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${dimension[0]}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: dimension[0] * dimension[1] }).map((_, idx) => (
            <div key={idx} className="rounded-md bg-teal-600/80 shadow-sm" />
          ))}
        </div>
      </div>
    </div>
  );
}
