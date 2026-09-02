import { useAuth } from "@/_core/hooks/useAuth";
import ThemeToggle from "@/components/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { countryOptions, profileForCountry, type CountryCode } from "@shared/locale";
import { Building2, ClipboardCheck, CreditCard, Globe, KeyRound, LayoutDashboard, LogOut, PanelLeft, ReceiptText, ShieldCheck } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

function CountryCurrencySwitcher() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const utils = trpc.useUtils();
  const businesses = trpc.businesses.list.useQuery(undefined, { retry: false });
  const business = businesses.data?.[0];

  const updateProfile = trpc.businesses.updateProfile.useMutation({
    onSuccess: (updated) => {
      toast.success(`Country updated to ${updated?.country} (${updated?.currency})`);
      utils.businesses.list.invalidate();
      utils.finance.latestSummary.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!business) return null;
  const currentProfile = profileForCountry(business.country);

  const handleCountryChange = (newCode: CountryCode) => {
    const p = profileForCountry(newCode);
    updateProfile.mutate({
      businessId: business.id,
      country: p.code,
      currency: p.currency,
      locale: p.locale,
      timezone: p.timezone,
      taxSystem: p.taxSystem,
    });
  };

  return (
    <div className="w-full">
      <div className={`flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-2 text-xs text-sidebar-foreground ${isCollapsed ? "justify-center" : ""}`}>
        <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
        {!isCollapsed && (
          <div className="flex flex-1 items-center justify-between min-w-0">
            <span className="truncate font-medium">
              {currentProfile.flag} {business.country} · {business.currency} ({currentProfile.symbol})
            </span>
            <select
              aria-label="Change workspace country and currency"
              value={business.country}
              disabled={updateProfile.isPending}
              onChange={(e) => handleCountryChange(e.target.value as CountryCode)}
              className="ml-1 bg-transparent text-[11px] font-semibold text-primary underline cursor-pointer outline-none max-w-[80px]"
            >
              {countryOptions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

const menuItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/dashboard" },
  { icon: ClipboardCheck, label: "Action center", path: "/tasks" },
  { icon: CreditCard, label: "Billing", path: "/billing" },
  { icon: Building2, label: "Business profile", path: "/onboarding" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
      return Number.isFinite(saved) && saved >= MIN_WIDTH && saved <= MAX_WIDTH ? saved : DEFAULT_WIDTH;
    } catch {
      return DEFAULT_WIDTH;
    }
  });
  const { loading, user, logout } = useAuth();

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
    } catch {
      // Preference storage is optional in private and embedded browser contexts.
    }
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => startLogin()}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent user={user} logout={logout} setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  user: { name?: string | null; email?: string | null; role?: "user" | "admin" };
  logout: () => Promise<void>;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  user,
  logout,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <a href="#workspace-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-[#163a34] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#f7f1e4]">Skip to workspace content</a>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold tracking-tight truncate text-sidebar-foreground">
                      Prava workspace
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      aria-current={isActive ? "page" : undefined}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {user?.role === "admin" ? <><SidebarMenuItem><SidebarMenuButton isActive={location === "/admin/billing"} onClick={() => setLocation("/admin/billing")} tooltip="Administration" aria-current={location === "/admin/billing" ? "page" : undefined} className="h-10 transition-all font-normal"><ShieldCheck className={`h-4 w-4 ${location === "/admin/billing" ? "text-primary" : ""}`} /><span>Administration</span></SidebarMenuButton></SidebarMenuItem><SidebarMenuItem><SidebarMenuButton isActive={location === "/admin/gst"} onClick={() => setLocation("/admin/gst")} tooltip="GST submissions" aria-current={location === "/admin/gst" ? "page" : undefined} className="h-10 transition-all font-normal"><ReceiptText className={`h-4 w-4 ${location === "/admin/gst" ? "text-primary" : ""}`} /><span>GST submissions</span></SidebarMenuButton></SidebarMenuItem><SidebarMenuItem><SidebarMenuButton isActive={location === "/admin/security"} onClick={() => setLocation("/admin/security")} tooltip="Access & audit" aria-current={location === "/admin/security" ? "page" : undefined} className="h-10 transition-all font-normal"><ShieldCheck className={`h-4 w-4 ${location === "/admin/security" ? "text-primary" : ""}`} /><span>Access & audit</span></SidebarMenuButton></SidebarMenuItem><SidebarMenuItem><SidebarMenuButton isActive={location === "/admin/integrations"} onClick={() => setLocation("/admin/integrations")} tooltip="Integration readiness" aria-current={location === "/admin/integrations" ? "page" : undefined} className="h-10 transition-all font-normal"><KeyRound className={`h-4 w-4 ${location === "/admin/integrations" ? "text-primary" : ""}`} /><span>Integration readiness</span></SidebarMenuButton></SidebarMenuItem></> : null}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 gap-2">
            <CountryCurrencySwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                    {user?.role === "admin" ? <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#cfe4ad]">Administrator</p> : null}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    void logout().then(() => toast.success("You have signed out safely.")).catch(() => toast.error("We could not complete sign-out. Please try again."));
                  }}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
          <div
            className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
            onMouseDown={() => {
              if (isCollapsed) return;
              setIsResizing(true);
            }}
            style={{ zIndex: 50 }}
          />
        </div>
        <SidebarInset>
          <div className="flex h-14 items-center justify-between border-b border-sidebar-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background border border-sidebar-border" />
              <span className="text-sm font-semibold tracking-tight text-foreground">
                {activeMenuItem?.label ?? "Workspace"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </div>
          <main id="workspace-content" className="flex-1 p-4" tabIndex={-1}>{children}</main>
        </SidebarInset>
      </>
    );
  }
