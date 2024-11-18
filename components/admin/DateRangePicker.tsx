"use client";

import { DateRangePicker as BaseDateRangePicker } from "@/components/ui/date-range-picker";
import { Card } from "@/components/ui/card";

interface AdminDateRangePickerProps {
  onChange: (dates: { from: Date; to: Date }) => void;
  defaultValue?: { from: Date; to: Date };
}

export function DateRangePicker({ onChange, defaultValue }: AdminDateRangePickerProps) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium mb-2">Rango de Fechas</h3>
      <BaseDateRangePicker
        date={defaultValue ? { from: defaultValue.from, to: defaultValue.to } : undefined}
        onChange={(range) => {
          if (range?.from && range?.to) {
            onChange({ from: range.from, to: range.to });
          }
        }}
      />
    </Card>
  );
}