import * as React from "react";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatPrice } from "@/lib/format";
import type { TradeRecord } from "@/types";

type TradeHistoryTableProps = {
  trades: TradeRecord[];
};

export function TradeHistoryTable({ trades }: TradeHistoryTableProps) {
  const columns = React.useMemo<ColumnDef<TradeRecord>[]>(
    () => [
      {
        accessorKey: "date",
        header: "日期",
        cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.date}</span>,
      },
      {
        id: "stock",
        header: "股票",
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-foreground">{row.original.name}</div>
            <div className="font-mono text-xs text-muted-foreground">{row.original.code}</div>
          </div>
        ),
      },
      {
        accessorKey: "direction",
        header: "方向",
        cell: ({ row }) => (
          <Badge variant={row.original.direction === "BUY" ? "red" : "green"}>
            {row.original.direction === "BUY" ? "买入" : "卖出"}
          </Badge>
        ),
      },
      {
        accessorKey: "price",
        header: "成交价格",
        cell: ({ row }) => <span className="font-mono tabular-nums">{formatPrice(row.original.price)}</span>,
      },
      {
        accessorKey: "shares",
        header: "成交股数",
        cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.shares.toLocaleString("zh-CN")}</span>,
      },
      {
        accessorKey: "amount",
        header: "成交金额",
        cell: ({ row }) => <span className="font-mono tabular-nums">{formatCurrency(row.original.amount)}</span>,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: trades,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm transition-all duration-300">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <h2 className="text-sm font-bold text-foreground">交易记录</h2>
        <span className="text-xs text-muted-foreground">最新在上</span>
      </div>
      <div className="max-h-[260px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-card">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  暂无交易记录
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
