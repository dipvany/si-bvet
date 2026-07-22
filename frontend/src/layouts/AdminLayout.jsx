import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import AppNavbar from "../components/AppNavbar";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024,
  );
  const location = useLocation();

  useEffect(() => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let wasDesktop = window.innerWidth >= 1024;
    const onResize = () => {
      const isDesktop = window.innerWidth >= 1024;
      if (isDesktop !== wasDesktop) {
        setSidebarOpen(isDesktop);
        wasDesktop = isDesktop;
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="flex h-screen bg-[#F0F2F8] overflow-hidden">

      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AppNavbar onMenuClick={() => setSidebarOpen(p => !p)} />
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>

    </div>
  );
}