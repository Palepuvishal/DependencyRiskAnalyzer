"use client";

import React from "react";
import { Bell, HelpCircle, UserCircle } from "lucide-react";
import { ProjectSelector } from "./ProjectSelector";

export function Topbar() {
  return (
    <header className="bg-[#15171C] border-b border-[#222934] flex items-center justify-between px-4 w-full sticky top-0 z-50 h-14">
      <div className="flex items-center gap-6">
        <div className="text-lg font-black tracking-tighter text-slate-100 uppercase">SecOps Sentinel</div>
        <div className="hidden md:flex items-center gap-4">
          <ProjectSelector />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative group cursor-pointer">
          <Bell className="text-slate-400 group-hover:text-blue-500 transition-colors" size={20} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full border border-[#15171C]"></span>
        </div>
        <HelpCircle className="text-slate-400 hover:text-blue-500 transition-colors cursor-pointer" size={20} />
        <UserCircle className="text-slate-400 hover:text-blue-500 transition-colors cursor-pointer" size={20} />
      </div>
    </header>
  );
}
