import { useState } from 'react';
import { 
  startOfDay, 
  endOfDay, 
  subDays, 
  subMonths, 
  subYears,
  format 
} from 'date-fns';

type DateRange = 'today' | '7days' | '30days' | '12months' | 'custom';

export function useDateFilter() {
  const [dateRange, setDateRange] = useState<DateRange>('7days');
  const [customRange, setCustomRange] = useState({
    start: new Date(),
    end: new Date()
  });

  const getDateRange = () => {
    const end = endOfDay(new Date());
    let start;

    switch (dateRange) {
      case 'today':
        start = startOfDay(new Date());
        break;
      case '7days':
        start = subDays(end, 7);
        break;
      case '30days':
        start = subDays(end, 30);
        break;
      case '12months':
        start = subMonths(end, 12);
        break;
      case 'custom':
        return {
          start: startOfDay(customRange.start),
          end: endOfDay(customRange.end)
        };
    }

    return { start, end };
  };

  return {
    dateRange,
    setDateRange,
    customRange,
    setCustomRange,
    getDateRange
  };
}