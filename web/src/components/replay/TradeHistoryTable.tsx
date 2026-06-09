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
      { accessorKey: "date", header: "日期" },
      {
        id: "stock",
        header: "股票",
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-slate-900">{row.original.name}</div>
            <div className="font-mono text-xs text-slate-500">{row.original.code}</div>
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
        cell: ({ row }) => <span className="font-mono">{formatPrice(row.original.price)}</span>,
      },
      {
        accessorKey: "shares",
        header: "成交股数",
        cell: ({ row }) => <span className="font-mono">{row.original.shares.toLocaleString("zh-CN")}</span>,
      },
      {
        accessorKey: "amount",
        header: "成交金额",
        cell: ({ row }) => <span className="font-mono">{formatCurrency(row.original.amount)}</span>,
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
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">交易记录</h2>
        <span className="text-xs text-slate-500">最新在上</span>
      </div>
      <div className="max-h-[260px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-white">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-white">
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
                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">
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
