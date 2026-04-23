"use client";

import React, { useEffect, useState } from "react";
import { getNode } from "@/lib/api";
import { ShieldAlert, Info, Database, Circle, ChevronRight, Activity, Zap } from "lucide-react";
import { useProject } from "@/lib/ProjectContext";

interface NodeDetailPanelProps {
  nodeId: string | null;
  selectedVuln: any | null;
  setSelectedVuln: (v: any) => void;
  pathIndex: number;
  setPathIndex: React.Dispatch<React.SetStateAction<number>>;
  selectedPath: any[] | null;
  projectSummary?: any;
  criticalNodes?: any[];
  vulnerabilities?: any[];
}

export function NodeDetailPanel({ 
  nodeId, 
  selectedVuln,
  setSelectedVuln,
  pathIndex,
  setPathIndex,
  selectedPath,
  projectSummary, 
  criticalNodes, 
  vulnerabilities = [] 
}: NodeDetailPanelProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [autoMode, setAutoMode] = useState(false);

  const paths = selectedVuln?.paths || [];
 
   // Reset auto-mode on vulnerability change to prevent polling race conditions
   useEffect(() => {
     setAutoMode(false);
   }, [selectedVuln]);

   // Safe Rendering Helper
   function renderSafe(value: any) {
     if (value === null || value === undefined) return "";
     if (typeof value === "object") return value.id || value.name || "INVALID_OBJECT";
     return String(value);
   }

  // Auto-Remediation (Path Cycling)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoMode && paths.length > 1) {
      interval = setInterval(() => {
        setPathIndex((prev: number) => (prev + 1) % paths.length);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [autoMode, paths.length, setPathIndex]);

  useEffect(() => {
    const activeId = nodeId || selectedVuln?.id;
    if (!activeId) return;
    
    const fetchNode = async () => {
      setLoading(true);
      try {
        const nodeData = await getNode(activeId);
        setData(nodeData);
      } catch (err) {
        console.error("Failed to fetch node details", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNode();
  }, [nodeId, selectedVuln?.id]);

  const handlePrevPath = () => {
    setAutoMode(false);
    if (paths.length > 0) {
      setPathIndex((prev: number) => (prev - 1 + paths.length) % paths.length);
    }
  };

  const handleNextPath = () => {
    setAutoMode(false);
    if (paths.length > 0) {
      setPathIndex((prev: number) => (prev + 1) % paths.length);
    }
  };

  useEffect(() => {
    console.log("PANEL_FLOW_AUDIT: ALL_PATHS", paths);
    console.log("PANEL_FLOW_AUDIT: SELECTED_PATH", selectedPath);
  }, [paths, selectedPath]);

  return (
    <div className="flex flex-col h-full">
      {/* 1. Risk Panel (Project Metrics) */}
      <div className="p-6 border-b border-[#222934] bg-[#1e2024]/30">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Risk Panel</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0c0e12] border border-[#222934] p-3 rounded-lg">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Libs</div>
            <div className="text-xl font-bold text-white">{renderSafe(projectSummary?.totalLibraries || 0)}</div>
          </div>
          <div className="bg-[#0c0e12] border border-[#222934] p-3 rounded-lg border-l-2 border-l-[#ffb4ab]">
            <div className="text-[10px] font-bold text-[#ffb4ab] uppercase tracking-widest mb-1">Critical</div>
            <div className="text-xl font-bold text-white">{renderSafe(projectSummary?.critical || 0)}</div>
          </div>
        </div>
      </div>

      {/* 2. Critical Nodes List (Only if no vulnerability selected) */}
      {!selectedVuln && criticalNodes && criticalNodes.length > 0 && (
        <div className="p-6 border-b border-[#222934]">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Critical Nodes</div>
          <div className="space-y-3">
            {criticalNodes.map((node, idx) => (
              <div 
                key={idx} 
                onClick={() => setSelectedVuln(node)}
                className="bg-[#1e2024] border border-[#222934] p-3 rounded-lg hover:border-blue-500/50 transition-colors cursor-pointer group"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-['Space_Grotesk'] text-sm text-[#a6c8ff] font-medium truncate w-[70%]">{renderSafe(node.library)}</span>
                  <span className="bg-[#ffb4ab] text-[#690005] text-[9px] font-black px-1.5 py-0.5 rounded-sm">VULN</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span className="font-mono">v{renderSafe(node.version)}</span>
                  <span>{renderSafe(node.id)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Node Detail or Path Explanation */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : selectedVuln ? (
          <>
            {/* Inspector Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] bg-[#333539] border border-[#404753] px-1.5 py-0.5 rounded-sm font-black uppercase tracking-widest text-slate-400">
                  Vulnerability
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-black uppercase tracking-widest ${
                  selectedVuln.severity === 'CRITICAL' ? 'bg-[#ffb4ab] text-[#690005]' : 'bg-[#de7403] text-white'
                }`}>
                  {renderSafe(selectedVuln.severity)}
                </span>
              </div>
              <h2 className="text-xl font-['Space_Grotesk'] text-white font-bold break-all leading-tight">
                {renderSafe(selectedVuln.library)}
              </h2>
              <div className="text-xs text-slate-500 mt-1 font-mono">{renderSafe(selectedVuln.id)}</div>
            </div>

            {/* NEW: Path Metadata Summary */}
            <div className="bg-[#0c0e12]/50 border border-[#222934] rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Reachable Risk</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Depth: {selectedPath?.length ? selectedPath.length - 1 : 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-black uppercase tracking-widest ${
                  selectedVuln.severity === 'CRITICAL' ? 'bg-[#ffb4ab]/10 text-[#ffb4ab]' : 'bg-[#de7403]/10 text-[#de7403]'
                }`}>
                  {renderSafe(selectedVuln.severity)} THREAT
                </span>
                <div className="h-px flex-1 bg-[#222934]"></div>
                <span className="text-[10px] font-bold text-white">Path {pathIndex + 1} of {paths.length}</span>
              </div>
            </div>

            {/* Path Explanation (Vertical Timeline) */}
            {selectedPath && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Path Exposure</h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handlePrevPath} 
                      disabled={paths.length <= 1}
                      className="p-1 hover:bg-[#282a2e] disabled:opacity-30 disabled:cursor-not-allowed rounded text-slate-400 transition-colors"
                    >
                      <ChevronRight size={14} className="rotate-180" />
                    </button>
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                      Path {paths.length > 0 ? pathIndex + 1 : 0} / {paths.length}
                    </span>
                    <button 
                      onClick={handleNextPath} 
                      disabled={paths.length <= 1}
                      className="p-1 hover:bg-[#282a2e] disabled:opacity-30 disabled:cursor-not-allowed rounded text-slate-400 transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="relative pl-6 space-y-8">
                  <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gradient-to-b from-blue-500 via-[#404753] to-[#ffb4ab]"></div>
                  
                  {selectedPath.map((nodeId: string, idx: number) => {
                     const isEntry = idx === 0;
                     const isVuln = idx === selectedPath.length - 1;
                     
                     // Simple identification logic for rendering
                     const stepType = isEntry ? "Project" : 
                                    isVuln ? "Vulnerability" : "Library";
                     
                     return (
                       <div key={`${nodeId}-${idx}`} className="relative flex flex-col gap-1 pl-2">
                         <div className={`absolute -left-[31px] bg-[#15171C] p-2 rounded-full border-2 ${
                           isEntry ? 'border-[#3192fc] shadow-[0_0_12px_rgba(49,146,252,0.4)]' : 
                           isVuln ? 'border-[#f87171] shadow-[0_0_15px_rgba(248,113,113,0.4)]' : 
                           'border-[#404753]'
                         } z-10`}>
                           {isEntry ? <Database size={10} className="text-[#3192fc]" /> : 
                            isVuln ? <ShieldAlert size={10} className="text-[#f87171]" /> : 
                            <Circle size={8} className="fill-[#404753] text-[#404753]" />}
                         </div>
                         
                         <div className="flex items-center gap-2">
                           <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${
                             isEntry ? 'bg-[#3192fc]/10 text-[#3192fc]' : 
                             isVuln ? 'bg-[#f87171]/10 text-[#f87171]' : 
                             'text-slate-500'
                           }`}>
                             {isEntry ? 'Entry' : isVuln ? 'Vulnerable Node' : stepType.toLowerCase()}
                           </span>
                         </div>
                         
                         <span className={`text-sm font-bold font-['Space_Grotesk'] leading-tight ${
                           isEntry ? 'text-white' : isVuln ? 'text-[#f87171]' : 'text-slate-300'
                         }`}>
                           {renderSafe(nodeId)}
                         </span>
                       </div>
                     );
                   })}
                </div>
              </div>
            )}

            {/* Details & Metadata */}
            <div className="space-y-4">
              <div className="bg-[#0c0e12] border border-[#222934] p-4 rounded-xl">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Info size={12} /> Vulnerability Intelligence
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed italic">
                  Exposure detected across {paths.length} distinct dependency paths. {selectedVuln.severity === 'CRITICAL' ? 'This node presents a critical security risk and requires immediate patching.' : 'This node should be monitored for security updates.'}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-12">
            <Activity size={48} className="text-[#222934] mb-4" />
            <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Inspector Idle</div>
            <p className="text-xs text-slate-600 mt-2 max-w-[200px]">Select a vulnerability from the list or canvas to analyze security intelligence.</p>
          </div>
        )}
      </div>

      {/* 4. Action Button Footer */}
      {selectedVuln && (
        <div className="p-6 bg-[#1e2024]/50 border-t border-[#222934]">
          <button 
            onClick={() => setAutoMode(!autoMode)}
            className={`w-full ${autoMode ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-[#3192fc] text-white'} py-4 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl group`}
          >
            <Zap size={16} className={`${autoMode ? 'animate-pulse fill-orange-400' : 'fill-white'}`} />
            {autoMode ? 'Auto mode ON' : 'Auto-Remediate Path'}
          </button>
          <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-50">
            <ChevronRight size={12} /> Powered by SecOps AI
          </div>
        </div>
      )}
    </div>
  );
}
