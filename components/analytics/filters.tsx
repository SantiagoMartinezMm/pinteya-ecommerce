'use client'

import { DateRange } from '@/app/(dashboard)/analytics/page'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { CalendarIcon } from 'lucide-react'
import { addDays, format } from 'date-fns'
import { es } from 'date-fns/locale'

interface AnalyticsFiltersProps {
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
}

export function AnalyticsFilters({
  dateRange,
  onDateRangeChange,
}: AnalyticsFiltersProps) {
  const presets = [
    {
      label: 'Últimos 7 días',
      value: {
        from: addDays(new Date(), -7),
        to: new Date(),
      },
    },
    {
      label: 'Últimos 30 días',
      value: {
        from: addDays(new Date(), -30),
        to: new Date(),
      },
    },
    {
      label: 'Últimos 90 días',
      value: {
        from: addDays(new Date(), -90),
        to: new Date(),
      },
    },
  ]

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal',
              !dateRange && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, 'P', { locale: es })} -{' '}
                  {format(dateRange.to, 'P', { locale: es })}
                </>
              ) : (
                format(dateRange.from, 'P', { locale: es })
              )
            ) : (
              <span>Seleccionar fechas</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={{
              from: dateRange?.from,
              to: dateRange?.to,
            }}
            onSelect={(range: any) => {
              if (range?.from && range?.to) {
                onDateRangeChange(range)
              }
            }}
            numberOfMonths={2}
          />
          <div className="border-t p-3">
            <div className="flex flex-col gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  className="justify-start font-normal"
                  onClick={() => onDateRangeChange(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
