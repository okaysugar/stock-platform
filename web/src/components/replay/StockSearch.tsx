import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { StockOption } from "@/types";

type StockSearchProps = {
  stocks: StockOption[];
  value: string;
  onChange: (stock: StockOption) => void;
  searchValue: string;
  isSearching?: boolean;
  onSearchChange: (value: string) => void;
};

export function StockSearch({ stocks, value, onChange, searchValue, isSearching = false, onSearchChange }: StockSearchProps) {
  const [open, setOpen] = React.useState(false);
  const selectedStock = stocks.find((stock) => stock.code === value) ?? stocks[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 w-[260px] justify-between font-normal">
          <span className="truncate text-left">
            {selectedStock ? `${selectedStock.code} ${selectedStock.name}` : "选择股票"}
          </span>
          <ChevronsUpDown className="opacity-55" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px]">
        <Command shouldFilter={false}>
          <CommandInput placeholder="搜索股票名称或代码" value={searchValue} onValueChange={onSearchChange} />
          <CommandList>
            <CommandEmpty>{isSearching ? "正在搜索" : "未找到匹配股票"}</CommandEmpty>
            <CommandGroup heading="A 股">
              {stocks.map((stock) => (
                <CommandItem
                  key={stock.code}
                  value={`${stock.code} ${stock.name} ${stock.market}`}
                  onSelect={() => {
                    onChange(stock);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("size-4", value === stock.code ? "opacity-100" : "opacity-0")} />
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
                    <span className="font-medium text-slate-900">{stock.name}</span>
                    <span className="font-mono text-xs text-slate-500">
                      {stock.market}.{stock.code}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
