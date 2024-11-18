import { toast } from '@/components/ui/use-toast';

export class DashboardError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'warning' | 'error' | 'critical'
  ) {
    super(message);
    this.name = 'DashboardError';
  }
}

export const errorHandler = {
  handle: (error: unknown) => {
    if (error instanceof DashboardError) {
      toast({
        title: `Error ${error.code}`,
        description: error.message,
        variant: error.severity === 'critical' ? 'destructive' : 'default',
      });
      
      // Log error to service
      console.error(`[${error.code}] ${error.message}`);
    } else {
      toast({
        title: 'Error Inesperado',
        description: 'Ha ocurrido un error inesperado',
        variant: 'destructive',
      });
      
      console.error(error);
    }
  }
};