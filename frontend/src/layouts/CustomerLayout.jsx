import { useState } from "react";
import { Outlet } from "react-router-dom";
import CustomerSidebar from "../components/CustomerSidebar";
import AppNavbar from "../components/AppNavbar";

export default function CustomerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-[#F0F2F8] overflow-hidden">

      <CustomerSidebar isOpen={sidebarOpen} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AppNavbar onMenuClick={() => setSidebarOpen(p => !p)} />
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>

    </div>
  );
}