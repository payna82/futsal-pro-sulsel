import { useMemo, useState, type ReactNode } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

/** Tabel generik: presentasi murni, tanpa aturan bisnis. */
export function DataTable<T>({
  rows,
  columns,
  getRowId,
  searchable,
  searchPlaceholder = "Cari…",
  searchValue,
  toolbar,
  emptyMessage = "Belum ada data.",
  onRowClick,
}: {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: (row: T) => string;
  toolbar?: ReactNode;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!searchable || !query.trim() || !searchValue) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((row) => searchValue(row).toLowerCase().includes(q));
  }, [rows, query, searchable, searchValue]);

  return (
    <div className="space-y-3">
      {(searchable || toolbar) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {searchable ? (
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="sm:max-w-xs"
              aria-label={searchPlaceholder}
            />
          ) : (
            <span />
          )}
          {toolbar ? <div className="flex flex-wrap gap-2">{toolbar}</div> : null}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface hover:bg-surface">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "label-caps text-muted-foreground",
                    col.hideOnMobile && "hidden md:table-cell",
                    col.className,
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  <div className="px-4 py-8">
                    <EmptyState
                      title={emptyMessage}
                      description="Coba sesuaikan filter atau kembali lagi nanti untuk melihat data terbaru."
                      className="border-0 bg-transparent py-8"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow
                  key={getRowId(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        "text-sm",
                        col.hideOnMobile && "hidden md:table-cell",
                        col.className,
                      )}
                    >
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} baris ditampilkan</p>
    </div>
  );
}
