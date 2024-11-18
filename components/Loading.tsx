import { Loader2 } from "lucide-react";

interface LoadingProps {
  text?: string;
}

export function Loading({ text = "Cargando..." }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}