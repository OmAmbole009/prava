import * as React from "react";
import { cn } from "@/lib/utils";

function Table({ className, ...props }) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0B0F19]">
      <table data-slot="table" className={cn("w-full caption-bottom text-xs", className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-[#0E1424]/90 backdrop-blur-md sticky top-0 z-10 [&_tr]:border-b [&_tr]:border-white/[0.08]", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0 divide-y divide-white/[0.04]", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("bg-[#0E1424] border-t border-white/[0.08] font-medium [&>tr]:last:border-b-0 text-slate-400", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }) {
  return (
    <tr
      data-slot="table-row"
      className={cn("hover:bg-white/[0.03] border-b border-white/[0.04] transition-colors duration-150 data-[state=selected]:bg-white/[0.04]", className)}
      {...props}
    />
  );
}

function TableHead({ className, ...props }) {
  return (
    <th
      data-slot="table-head"
      className={cn("text-slate-400 h-9 px-3.5 text-left align-middle font-medium text-[11px] uppercase tracking-wider whitespace-nowrap [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  );
}

function TableCell({ className, ...props }) {
  return (
    <td
      data-slot="table-cell"
      className={cn("p-3.5 align-middle text-white whitespace-nowrap [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-slate-400 my-3 text-xs", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
