import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

export default function Compliance() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="규정 준수" subtitle="소방 규정 준수 현황 및 관리" />
        <main className="flex-1 overflow-auto p-6">
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold text-foreground mb-2">규정 준수</h3>
            <p className="text-muted-foreground">규정 준수 기능이 곧 추가됩니다.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
