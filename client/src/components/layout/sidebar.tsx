import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  Wrench, 
  Building, 
  ShieldCheck, 
  FileText, 
  FolderOpen, 
  Users,
  Flame,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const navigation = [
    { name: "대시보드", href: "/", icon: LayoutDashboard },
    { name: "점검 관리", href: "/inspections", icon: ClipboardCheck },
    { name: "장비 추적", href: "/equipment", icon: Wrench },
    { name: "건물 관리", href: "/buildings", icon: Building },
    { name: "규정 준수", href: "/compliance", icon: ShieldCheck },
    { name: "보고서", href: "/reports", icon: FileText },
    { name: "문서 관리", href: "/documents", icon: FolderOpen },
    { name: "점검원 관리", href: "/inspectors", icon: Users },
  ];

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-destructive rounded-lg flex items-center justify-center">
            <Flame className="w-6 h-6 text-destructive-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">소방점검관리</h1>
            <p className="text-sm text-muted-foreground">Fire Safety System</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.name} href={item.href}>
              <a 
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </a>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-primary-foreground">
              {user?.name?.charAt(0) || "U"}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{user?.name || "사용자"}</p>
            <p className="text-xs text-muted-foreground">{user?.role || "점검관리자"}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => logoutMutation.mutate()}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
