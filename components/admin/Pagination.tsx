import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  baseUrl: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  baseUrl,
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between px-2">
      <p className="text-sm text-muted-foreground">
        Mostrando {startItem} a {endItem} de {totalItems} resultados
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          asChild
          disabled={currentPage === 1}
        >
          <Link
            href={`${baseUrl}?page=${currentPage - 1}`}
            scroll={false}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>

        {pages.map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link
              href={`${baseUrl}?page=${page}`}
              scroll={false}
            >
              {page}
            </Link>
          </Button>
        ))}

        <Button
          variant="outline"
          size="icon"
          asChild
          disabled={currentPage === totalPages}
        >
          <Link
            href={`${baseUrl}?page=${currentPage + 1}`}
            scroll={false}
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}