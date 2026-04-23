"use client";

import React from "react";

export const Legend = () => {
  return (
    <div className="absolute bottom-4 left-4 z-50 bg-[#1e2024] border border-[#404753] rounded-lg p-3 shadow-lg pointer-events-none flex flex-col gap-3 min-w-[140px]">
      <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Architecture Key</div>
      
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-[#3192fc] border border-blue-400/30"></div>
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Project</span>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 bg-[#404753] border border-slate-400/30"></div>
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Library</span>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="w-3 h-2 rounded-sm bg-[#282a2e] border border-slate-600/30"></div>
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Version</span>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rotate-45 bg-[#ff4d4f] border border-red-400/30"></div>
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Vulnerability</span>
      </div>
    </div>
  );
};
