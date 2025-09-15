import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

export default function Equipment() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="장비 추적" subtitle="소방 장비 재고 및 상태 관리" />
        <main className="flex-1 overflow-auto p-6">
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold text-foreground mb-2">장비 추적</h3>
            <p className="text-muted-foreground">장비 추적 기능이 곧 추가됩니다.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
