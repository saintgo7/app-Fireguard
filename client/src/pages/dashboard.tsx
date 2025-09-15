import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StatsCards from "@/components/dashboard/stats-cards";
import RecentInspections from "@/components/dashboard/recent-inspections";
import UpcomingTasks from "@/components/dashboard/upcoming-tasks";
import EquipmentStatus from "@/components/dashboard/equipment-status";
import InspectionScheduleTable from "@/components/dashboard/inspection-schedule-table";

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="대시보드" subtitle="소방 안전 점검 현황 및 관리" />
        <main className="flex-1 overflow-auto p-6">
          <StatsCards />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2">
              <RecentInspections />
            </div>
            <div className="space-y-8">
              <UpcomingTasks />
              <EquipmentStatus />
            </div>
          </div>
          <InspectionScheduleTable />
        </main>
      </div>
    </div>
  );
}
