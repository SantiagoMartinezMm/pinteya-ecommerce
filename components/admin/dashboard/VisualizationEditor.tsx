import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Visualization, VisualizationSchema } from '@/types/dashboard';
import { useDashboardStore } from '@/lib/stores/dashboardStore';
import { ColorPicker } from '@/components/ui/color-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface VisualizationEditorProps {
  visualization?: Visualization;
  onSave: (visualization: Visualization) => void;
}

export function VisualizationEditor({ visualization, onSave }: VisualizationEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm<Visualization>({
    resolver: zodResolver(VisualizationSchema),
    defaultValues: visualization || {
      type: 'funnel',
      title: '',
      dataKey: '',
      style: {
        colors: ['#8884d8'],
        animations: true,
      },
    },
  });

  const handleSubmit = (data: Visualization) => {
    onSave(data);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {visualization ? 'Editar Visualización' : 'Nueva Visualización'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {visualization ? 'Editar Visualización' : 'Nueva Visualización'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="funnel">Embudo</SelectItem>
                    <SelectItem value="heatmap">Mapa de Calor</SelectItem>
                    <SelectItem value="radar">Radar</SelectItem>
                    <SelectItem value="bubble">Burbuja</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título</FormLabel>
                <Input {...field} />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="style.animations"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <FormLabel>Animaciones</FormLabel>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormItem>
            )}
          />

          <Button type="submit">Guardar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}