import { useState } from "react";
import { Outlet } from "react-router-dom";
import SuperAdminSidebar from "../components/SuperAdminSidebar";
import AppNavbar from "../components/AppNavbar";

export default function SuperAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-[#F0F2F8] overflow-hidden">

      <SuperAdminSidebar isOpen={sidebarOpen} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AppNavbar onMenuClick={() => setSidebarOpen(p => !p)} />
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>

    </div>
  );
}