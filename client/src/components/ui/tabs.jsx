import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

function Tabs({ className, ...props }) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-3", className)}
      {...props}
    />
  );
}

function TabsList({ className, ...props }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-[#0B0F19] border border-white/[0.08] text-slate-400 inline-flex h-9 w-fit items-center justify-center rounded-full p-1 gap-1",
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-7 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium whitespace-nowrap outline-none",
        "text-slate-400 transition-colors duration-180 ease-out hover:text-white",
        "data-[state=active]:bg-sky-500/15 data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-sky-500/30 data-[state=active]:shadow-[0_0_10px_rgba(56,189,248,0.15)]",
        "focus-visible:ring-1 focus-visible:ring-sky-400 disabled:pointer-events-none disabled:opacity-40",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "flex-1 outline-none transition-all duration-200",
        "data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-1",
        className
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
