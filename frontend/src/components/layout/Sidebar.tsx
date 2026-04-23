"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Network, ShieldAlert, Database, Terminal, Settings } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Workbench", href: "/workbench", icon: Network },
    { name: "Vulnerabilities", href: "/vulnerabilities", icon: ShieldAlert },
    { name: "Data Management", href: "/data-management", icon: Database },
  ];

  return (
    <aside className="bg-[#15171C] border-r border-[#222934] flex flex-col h-screen fixed left-0 top-14 w-[280px] overflow-y-auto hidden lg:flex z-40">
      <div className="p-6">
        <div className="text-blue-500 font-mono font-bold text-sm tracking-widest">CYBER_SHELL</div>
        <div className="text-slate-500 text-[10px] font-medium tracking-tighter">v2.4.0-stable</div>
      </div>
      <nav className="flex-1 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={`px-4 py-3 flex items-center gap-3 transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-500/10 text-blue-500 border-r-2 border-blue-500"
                    : "text-slate-500 hover:text-slate-300 hover:bg-[#1F242D]"
                }`}
              >
                <Icon size={18} />
                <span className="font-['Inter'] uppercase text-[11px] font-bold tracking-widest">
                  {item.name}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-[#222934] space-y-1">
        <div className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:text-slate-300 hover:bg-[#1F242D] transition-all cursor-pointer">
          <Terminal size={16} />
          <span className="font-['Inter'] uppercase text-[11px] font-bold tracking-widest">System Logs</span>
        </div>
        <div className="text-slate-500 px-4 py-3 flex items-center gap-3 hover:text-slate-300 hover:bg-[#1F242D] transition-all cursor-pointer">
          <Settings size={16} />
          <span className="font-['Inter'] uppercase text-[11px] font-bold tracking-widest">Settings</span>
        </div>
      </div>
    </aside>
  );
}
