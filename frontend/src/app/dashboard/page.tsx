"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useProject } from "@/lib/ProjectContext";
import { getRisk, getIngestions } from "@/lib/api";
import { TrendingDown, TrendingUp, Shield, RefreshCw, Download, CalendarDays, Search, ChevronRight, ChevronLeft, Terminal, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const { selectedProject, selectedVuln, setSelectedVuln, pathIndex, setPathIndex, hoveredLibrary, setHoveredLibrary } = useProject();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [ingestions, setIngestions] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [hoveredBlock, setHoveredBlock] = useState<any>(null);
  const prevDataRef = useRef<string | null>(null);

  const handleBlockClick = (block: any) => {
    if (!data?.vulnerabilities) return;
    const vuln = data.vulnerabilities.find((v: any) => v.library === block.library);
    if (vuln) {
      setSelectedVuln(vuln);
      setPathIndex(0);
      router.push("/workbench");
    }
  };

  const handleMouseEnter = (lib: string, block: any) => {
    setHoveredBlock(block);
    setHoveredLibrary(lib);
  };

  const handleMouseLeave = () => {
    setHoveredBlock(null);
    setHoveredLibrary(null);
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return '#ff4d4f'; // red
      case 'HIGH': return '#ff9f1c';     // orange
      case 'MEDIUM': return '#ffd60a';   // yellow
      case 'LOW': return '#3192fc';      // blue
      case 'SAFE': return '#2a2f3a';     // gray
      default: return '#2a2f3a';
    }
  };

  const fetchData = async (showLoading = false) => {
    if (!selectedProject) return;
    if (showLoading) setLoading(true);
    try {
      const riskData = await getRisk(selectedProject);
      const dataString = JSON.stringify(riskData);
      
      if (dataString !== prevDataRef.current) {
        console.log("RISK API", JSON.stringify(riskData, null, 2));
        setData(riskData);
        prevDataRef.current = dataString;
      }
      
      const logs = await getIngestions();
      setIngestions(Array.isArray(logs) ? logs.slice(0, 5) : []);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (data?.vulnerabilities) {
      console.log("HEATMAP INPUT", data.vulnerabilities);
    }
  }, [data]);

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 5000);
    return () => clearInterval(interval);
  }, [selectedProject]);

  const heatmapBlocks = useMemo(() => {
    if (!data?.graph?.nodes || !data?.vulnerabilities) return [];

    const allLibs = data.graph.nodes.filter((n: any) => n.type === "Library");
    const libraryRiskMap = new Map<string, any>();

    // 1. Aggregate risk metrics per library from all paths
    data.vulnerabilities.forEach((v: any) => {
      v.paths.forEach((path: any[]) => {
        path.forEach((nodeIdOrObj, idx) => {
          // Resolve node from graph data
          const id = typeof nodeIdOrObj === "string" ? nodeIdOrObj : nodeIdOrObj.id;
          const node = data.graph.nodes.find((n: any) => n.id === id);
          if (node?.type !== "Library") return;

          const libName = node.id;
          if (!libraryRiskMap.has(libName)) {
            libraryRiskMap.set(libName, { 
              severity: v.severity, 
              pathSet: new Set<string>(), 
              minDistance: Infinity,
              severityRank: 0 
            });
          }

          const stats = libraryRiskMap.get(libName);
          
          // Unique path counting for weight
          stats.pathSet.add(JSON.stringify(path));
          
          // Distance from vulnerability (tail of the path)
          const distance = path.length - idx - 1;
          stats.minDistance = Math.min(stats.minDistance, distance);
          
          // Severity escalation
          const ranks: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };
          if (ranks[v.severity] > stats.severityRank) {
            stats.severityRank = ranks[v.severity];
            stats.severity = v.severity;
          }
        });
      });
    });

    // Post-process weights
    libraryRiskMap.forEach(stats => {
      stats.weight = stats.pathSet.size;
    });

    // 2. Prepare raw blocks (including safe)
    const blocks = allLibs.map((lib: any) => {
      const stats = libraryRiskMap.get(lib.id);
      return {
        library: lib.id,
        affected: !!stats,
        severity: stats?.severity || "SAFE",
        weight: stats?.weight || 0,
        distance: stats?.minDistance ?? Infinity
      };
    });

    const maxWeight = Math.max(...blocks.map((b: any) => b.weight), 1);
    const affectedDistances = blocks.filter((b: any) => b.affected).map((b: any) => b.distance);
    const maxDistance = affectedDistances.length > 0 ? Math.max(...affectedDistances) : 1;

    // 3. Sort and Calculate Layout (Deterministic but Organic)
    return blocks.sort((a: any, b: any) => {
      if (a.affected !== b.affected) return a.affected ? -1 : 1;
      return b.weight - a.weight;
    }).map((b: any) => {
      const normWeight = maxWeight > 0 ? (b.weight / maxWeight) : 0;
      const size = 40 + (normWeight * 160);

      let opacity = 0.2;
      let color = '#2a2f3a'; // Gray for SAFE

      if (b.affected) {
        opacity = Math.max(0.3, 1 - (b.distance / (maxDistance + 1)));
        color = getSeverityColor(b.severity);
      }

      const seed = b.library.length;
      return {
        ...b,
        depth: b.distance,
        width: `${size * (0.8 + (seed % 5) * 0.1)}px`, 
        height: `${size * (0.5 + (seed % 4) * 0.1)}px`, 
        opacity,
        color,
        marginTop: 4
      };
    });
  }, [data]);

  // Derive metrics
  const { summary, vulnerabilities, graph } = data || { summary: {}, vulnerabilities: [], graph: { nodes: [] } };
  const totalLibraries = (graph?.nodes || []).filter((n: any) => n.type === "Library").length;
  const totalVulnerabilities = vulnerabilities?.length || 0;
  
  const criticalPathsCount = useMemo(() => {
    let count = 0;
    (vulnerabilities || []).forEach((v: any) => {
      (v.paths || []).forEach((p: any) => {
        if (p.length > 2) count++;
      });
    });
    return count;
  }, [vulnerabilities]);

  // Debug Audit Logs
  useEffect(() => {
    if (!data) return;
    console.log("DASHBOARD_AUDIT: VULNS", vulnerabilities);
    console.log("DASHBOARD_AUDIT: GRAPH_NODES", graph.nodes);
    console.log("DASHBOARD_AUDIT: HEATMAP_BLOCKS", heatmapBlocks);
    
    const lodash = heatmapBlocks.find((b: any) => b.library.toLowerCase().includes('lodash'));
    if (lodash) {
      console.log("DASHBOARD_AUDIT: LODASH_INTEGRITY", lodash);
    }
  }, [data, vulnerabilities, graph, heatmapBlocks]);

  const filteredVulnerabilities = (vulnerabilities || []).filter((v: any) => 
    (v.id || "").toLowerCase().includes((filter || "").toLowerCase()) || 
    (v.library || "").toLowerCase().includes((filter || "").toLowerCase())
  );

  const topRisky = [...heatmapBlocks]
    .filter(b => b.affected)
    .sort((a: any, b: any) => b.weight - a.weight)
    .slice(0, 5);

  const criticalPathsList = filteredVulnerabilities
    .filter((v: any) => v.severity === "CRITICAL" || v.severity === "HIGH")
    .slice(0, 5);

  // --- Early Returns (Must stay after all Hook calls) ---

  if (!selectedProject) {
    return <div className="p-6 text-slate-400">Select a project to view the dashboard intelligence.</div>;
  }

  if (loading || !data) {
    return (
      <div className="p-6 h-[80vh] flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Initializing Dashboard...</span>
      </div>
    );
  }



  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display-lg text-[30px] leading-[38px] font-semibold text-[#e2e2e8]">Risk Overview</h1>
          <p className="font-body-base text-sm text-[#8a919e] mt-1">Ecosystem-wide dependency security metrics and critical paths.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-[#282a2e] border border-[#404753] px-4 py-2 flex items-center gap-2 rounded hover:border-[#a6c8ff] transition-all">
            <CalendarDays size={18} />
            <span className="font-label-caps text-[11px] font-bold uppercase tracking-wider">Last 30 Days</span>
          </button>
          <button className="bg-[#a6c8ff] text-[#002a53] px-4 py-2 flex items-center gap-2 rounded font-label-caps text-[11px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity">
            <Download size={18} />
            Export Report
          </button>
        </div>
      </div>

      {/* Bento Grid Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1e2024] border border-[#404753] p-5 rounded-lg border-l-4 border-l-[#ffb4ab] flex flex-col justify-between">
          <div>
            <span className="font-label-caps text-[11px] font-bold text-[#ffb4ab] uppercase tracking-widest">Total Vulnerabilities</span>
            <div className="font-display-lg text-[32px] font-semibold text-[#e2e2e8] mt-2">
              {totalVulnerabilities}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <TrendingUp size={16} className="text-[#ffb4ab]" />
            <span className="text-[#ffb4ab] font-body-sm text-[12px]">Direct & Transitive</span>
          </div>
        </div>

        <div className="bg-[#1e2024] border border-[#404753] p-5 rounded-lg border-l-4 border-l-[#ffb782] flex flex-col justify-between">
          <div>
            <span className="font-label-caps text-[11px] font-bold text-[#ffb782] uppercase tracking-widest">Libraries Analyzed</span>
            <div className="font-display-lg text-[32px] font-semibold text-[#e2e2e8] mt-2">
              {totalLibraries}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Shield size={16} className="text-[#ffb782]" />
            <span className="text-[#ffb782] font-body-sm text-[12px]">In dependency graph</span>
          </div>
        </div>

        <div className="bg-[#1e2024] border border-[#404753] p-5 rounded-lg border-l-4 border-l-[#a6c8ff] flex flex-col justify-between">
          <div>
            <span className="font-label-caps text-[11px] font-bold text-[#a6c8ff] uppercase tracking-widest">Critical Paths</span>
            <div className="font-display-lg text-[32px] font-semibold text-[#e2e2e8] mt-2">
              {criticalPathsCount}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <TrendingUp size={16} className="text-[#a6c8ff]" />
            <span className="text-[#a6c8ff] font-body-sm text-[12px]">Hops from vuln node &gt; 1</span>
          </div>
        </div>

        <div className="bg-[#1e2024] border border-[#404753] p-5 rounded-lg flex flex-col justify-between">
          <div>
            <span className="font-label-caps text-[11px] font-bold text-[#8a919e] uppercase tracking-widest">Scanned Repos</span>
            <div className="font-display-lg text-[32px] font-semibold text-[#e2e2e8] mt-2">
              {Number(summary?.totalProjects || 0)}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <RefreshCw size={16} className="text-[#bdc7de]" />
            <span className="text-[#bdc7de] font-body-sm text-[12px]">
              Last sync: {new Date(summary?.lastIngestionTime).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Rectangles Heat Map & Top Risky Libraries */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-[#1e2024] border border-[#404753] rounded-lg overflow-hidden flex flex-col relative">
          <div className="p-4 border-b border-[#404753] flex items-center justify-between">
            <span className="font-label-caps text-[11px] font-bold text-[#e2e2e8] uppercase tracking-widest">Dependency Risk Exposure</span>
            <div className="flex items-center gap-6">
              {/* Legend */}
              <div className="flex items-center gap-4 border-r border-[#404753] pr-6">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-[#ff4d4f] rounded-sm"></div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Critical</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-[#ff9f1c] rounded-sm"></div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">High</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-[#ffd60a] rounded-sm"></div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Med</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-[#2a2f3a] rounded-sm"></div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Safe</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Size: Exposure</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Opacity: Proximity</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-8 flex-1 min-h-[440px] bg-[#0c0e12] relative group/canvas overflow-visible">
            {heatmapBlocks.length > 0 ? (
              <div className="flex flex-wrap gap-2 items-start content-start overflow-visible">
                {heatmapBlocks.map((item: any) => (
                  <div 
                    key={item.library}
                    className={`relative group transition-all duration-500 cursor-pointer border border-white/5 rounded-md overflow-hidden hover:scale-[1.02] hover:ring-2 hover:ring-white/20`}
                    style={{ 
                      width: item.width, 
                      height: item.height,
                      backgroundColor: item.color,
                      opacity: item.opacity,
                      marginTop: `${item.marginTop}px`,
                      flexShrink: 0
                    }}
                    onMouseEnter={() => handleMouseEnter(item.library, item)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleBlockClick(item)}
                  >
                    <span className={`text-[9px] font-black uppercase truncate px-2 ${item.affected ? 'text-black/80' : 'text-slate-500/50'}`}>
                      {item.library}
                    </span>
                    {/* Tooltip */}
                    {hoveredBlock === item && (
                      <div className="absolute bottom-[110%] left-1/2 -translate-x-1/2 w-56 bg-[#1e2024] border border-[#404753] p-4 rounded-lg shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-[999] pointer-events-none backdrop-blur-xl">
                        <div className="text-[10px] font-black text-blue-400 uppercase mb-2 tracking-[0.2em]">{item.library}</div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                          <span className="text-sm font-bold text-white">
                            {item.affected ? `${item.severity} SEVERITY` : "VERIFIED SECURE"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 border-t border-[#404753] pt-3 mt-1">
                          <div>
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Exposure</div>
                            <div className="text-xs font-bold text-white">{item.weight} Paths</div>
                          </div>
                          <div>
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Proximity</div>
                            <div className="text-xs font-bold text-white">{item.affected ? `${item.distance} Hops` : "N/A"}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                <Shield size={48} className="text-slate-700 mb-4" />
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">No dependencies found.</div>
              </div>
            )}

            {/* Grid Overlay for aesthetic */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.02]" 
                 style={{ backgroundImage: 'radial-gradient(#a6c8ff 1px, transparent 0)', backgroundSize: '32px 32px' }}>
            </div>
          </div>
        </div>

        <div className="bg-[#1e2024] border border-[#404753] rounded-lg flex flex-col">
          <div className="p-4 border-b border-[#404753]">
            <span className="font-label-caps text-[11px] font-bold text-[#e2e2e8] uppercase tracking-widest">Critical Libraries</span>
          </div>
          <div className="flex-1 divide-y divide-[#404753]/30 overflow-y-auto max-h-[440px]">
            {topRisky.map((lib: any) => (
              <div key={lib.library} className="p-4 hover:bg-[#282a2e] transition-colors group cursor-pointer" onClick={() => setFilter(lib.library)}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-code-md text-sm font-medium text-[#a6c8ff] truncate max-w-[180px]">{lib.library}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-[2px] font-bold ${
                    lib.severity === 'CRITICAL' ? 'bg-[#ffb4ab] text-[#690005]' :
                    lib.severity === 'HIGH' ? 'bg-[#de7403] text-white' :
                    lib.severity === 'MEDIUM' ? 'border border-[#ffb782] text-[#ffb782]' :
                    'bg-[#8a919e] text-white'
                  }`}>
                    {lib.severity}
                  </span>
                </div>
                <p className="font-body-sm text-xs text-[#8a919e] mb-3">Involved in <span className="text-white font-bold">{lib.weight}</span> unique reach paths.</p>
                <div className="w-full bg-[#0c0e12] h-1 rounded-full overflow-hidden">
                  <div className={`h-full ${lib.severity === 'CRITICAL' ? 'bg-red-400' : 'bg-orange-400'}`} style={{ width: (Math.min(100, (lib.weight || 0) * 15)) + '%' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-[#1e2024] border border-[#404753] rounded-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#404753] flex items-center justify-between">
            <span className="font-label-caps text-[11px] font-bold text-[#e2e2e8] uppercase tracking-widest">Critical Dependency Path Tracking</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a919e]" size={18} />
              <input 
                className="bg-[#1a1c20] border border-[#404753] pl-10 pr-4 py-1.5 rounded text-sm focus:outline-none focus:border-[#a6c8ff] w-64 text-[#e2e2e8]" 
                placeholder="Search paths..." 
                type="text" 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              {filter && <button onClick={() => setFilter("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs font-bold">CLEAR</button>}
            </div>
          </div>
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#282a2e]">
                  <th className="px-4 py-3 font-label-caps text-[11px] font-bold text-[#8a919e] uppercase border-b border-[#404753]">Severity</th>
                  <th className="px-4 py-3 font-label-caps text-[11px] font-bold text-[#8a919e] uppercase border-b border-[#404753]">Project Name</th>
                  <th className="px-4 py-3 font-label-caps text-[11px] font-bold text-[#8a919e] uppercase border-b border-[#404753]">Dependency Path</th>
                  <th className="px-4 py-3 font-label-caps text-[11px] font-bold text-[#8a919e] uppercase border-b border-[#404753]">Vulnerability</th>
                  <th className="px-4 py-3 font-label-caps text-[11px] font-bold text-[#8a919e] uppercase border-b border-[#404753]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#404753]/30">
                {criticalPathsList.map((vuln: any, idx: number) => {
                  const pathStr = vuln.paths && vuln.paths.length > 0 
                    ? vuln.paths[0].join(' > ')
                    : vuln.library;
                    
                  return (
                    <tr key={idx} className="hover:bg-[#282a2e] transition-colors">
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          vuln.severity === 'CRITICAL' ? 'bg-red-400 text-[#690005]' :
                          'bg-orange-400 text-white'
                        }`}>
                          {vuln.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-body-base text-[14px] text-[#e2e2e8] font-medium">{selectedProject}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 font-code-sm text-xs font-medium text-[#8a919e]">
                          <span className="text-[#a6c8ff] truncate max-w-[200px] block">{pathStr}</span>
                          <ChevronRight size={12} />
                          <span className="text-[#ffb4ab] font-bold">{vuln.library}@{vuln.version}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-body-sm text-[12px] text-[#e2e2e8]">{vuln.id}</td>
                      <td className="px-4 py-3">
                        <button className="text-[#a6c8ff] hover:underline font-label-caps text-[11px] font-bold uppercase tracking-widest">View Graph</button>
                      </td>
                    </tr>
                  );
                })}
                {criticalPathsList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[#8a919e] text-sm">No matching vulnerability paths found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#1e2024] border border-[#404753] rounded-lg flex flex-col">
          <div className="p-4 border-b border-[#404753] flex items-center justify-between">
            <span className="font-label-caps text-[11px] font-bold text-[#e2e2e8] uppercase tracking-widest flex items-center gap-2">
              <Terminal size={14} /> System Logs
            </span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[300px] p-2 space-y-2">
            {ingestions.map((log: any, idx: number) => (
              <div key={idx} className="p-3 bg-[#0c0e12] rounded border border-[#222934] flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white truncate max-w-[120px]">{log.project}</span>
                  {log.status === "SUCCESS" && <span className="text-[9px] font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded flex items-center gap-1"><CheckCircle2 size={10} /> SUCCESS</span>}
                  {log.status === "PARTIAL" && <span className="text-[9px] font-bold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded flex items-center gap-1"><AlertTriangle size={10} /> PARTIAL</span>}
                  {log.status === "FAILED" && <span className="text-[9px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded flex items-center gap-1"><XCircle size={10} /> FAILED</span>}
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>{typeof log.vulnerabilitiesFound === 'object' ? JSON.stringify(log.vulnerabilitiesFound) : (log.vulnerabilitiesFound || 0)} vulnerabilities</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
