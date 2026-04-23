"use client";

import React, { useEffect, useState, useRef } from "react";
import { useProject } from "@/lib/ProjectContext";
import { getRisk } from "@/lib/api";
import { GraphView, GraphViewRef } from "@/components/GraphView";
import { NodeDetailPanel } from "@/components/NodeDetailPanel";
import { Legend } from "@/components/Legend";
import { ZoomIn, ZoomOut, Maximize, Download, ShieldAlert, Info, Database, Locate } from "lucide-react";

export default function Workbench() {
  const { selectedProject, selectedVuln, setSelectedVuln, pathIndex, setPathIndex } = useProject();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const graphRef = useRef<GraphViewRef>(null);

  // Instant, synchronous derivation of the current risk path (STRING ARRAY ONLY)
  const selectedPath = React.useMemo(() => {
    if (!selectedVuln || !selectedVuln.paths) return null;
    const rawPath = selectedVuln.paths[pathIndex] || selectedVuln.paths[0] || null;
    if (!rawPath) return null;
    return rawPath.map((node: any) => typeof node === "object" ? node.id : node);
  }, [selectedVuln, pathIndex]);

  const prevDataRef = useRef<string | null>(null);

  // Diagnostic Logs for State Synchronization
  console.log("WORKBENCH_AUDIT: SELECTED VULN", selectedVuln?.id);
  console.log("WORKBENCH_AUDIT: PATH INDEX", pathIndex);
  console.log("WORKBENCH_AUDIT: SELECTED PATH", selectedPath);

  // Reset state on project change
  useEffect(() => {
    setSelectedNode(null);
    setSelectedVuln(null);
    setPathIndex(0);
    setData(null);
    prevDataRef.current = null;
  }, [selectedProject, setSelectedVuln, setPathIndex]);

  // Initialize or sync selection on data load/refresh
  useEffect(() => {
    if (!data?.vulnerabilities) return;

    if (!selectedVuln && data.vulnerabilities.length > 0) {
      // First load selection
      setSelectedVuln(data.vulnerabilities[0]);
      setPathIndex(0);
    } else if (selectedVuln) {
      // Sync with latest data from polling
      const latest = data.vulnerabilities.find((v: any) => v.id === selectedVuln.id);
      if (latest) {
        setSelectedVuln(latest);
        // Protect index: Reset if current path index is no longer valid
        if (pathIndex >= latest.paths.length) {
          setPathIndex(0);
        }
      }
    }
  }, [data, selectedVuln, setSelectedVuln, setPathIndex, pathIndex]);

  // Sync selection when a node is clicked
  useEffect(() => {
    if (selectedNode && data?.vulnerabilities) {
      const vuln = data.vulnerabilities.find((v: any) => v.id === selectedNode || v.library === selectedNode);
      if (vuln) {
        setSelectedVuln(vuln);
        setPathIndex(0);
      }
    }
  }, [selectedNode, data, setSelectedVuln, setPathIndex]);

  const fetchData = async (showLoading = false) => {
    if (!selectedProject) return;
    if (showLoading) setLoading(true);
    try {
      const riskData = await getRisk(selectedProject);
      const dataString = JSON.stringify(riskData);
      
      if (dataString !== prevDataRef.current) {
        setData(riskData);
        prevDataRef.current = dataString;
      }
    } catch (err) {
      console.error("Failed to fetch risk data", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 5000);
    return () => clearInterval(interval);
  }, [selectedProject]);

  const handleExport = () => {
    if (!data) return;
    const headers = ["ID", "Type", "Severity"];
    const rows = data.graph.nodes.map((n: any) => [n.id, n.type, n.severity || "N/A"]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedProject}_risk_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!selectedProject) {
    return <div className="p-6">Select a project to view the workbench.</div>;
  }

  if (!data) {
    return (
      <div className="p-6 h-[80vh] flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Intelligence...</span>
      </div>
    );
  }

  const criticalNodes = data.vulnerabilities.filter((v: any) => v.severity === 'CRITICAL').slice(0, 5);

  return (
    <div className="flex h-full min-h-[calc(100vh-3.5rem)]">
      {/* Left: Graph Canvas Area */}
      <div className="flex-1 relative bg-[#0c0e12] overflow-visible group/canvas">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
             style={{ backgroundImage: 'radial-gradient(#a6c8ff 1px, transparent 0)', backgroundSize: '24px 24px' }}>
        </div>

        <GraphView 
          ref={graphRef}
          nodes={data.graph.nodes} 
          edges={data.graph.edges} 
          onNodeClick={setSelectedNode}
          selectedPath={selectedPath}
        />
        
        {/* Floating Controls */}
        <div className="absolute top-6 right-6 flex flex-col gap-3 z-30">
          <div className="bg-[#1e2024]/90 backdrop-blur-md border border-[#404753] rounded-lg p-1 shadow-2xl flex flex-col">
            <button onClick={() => graphRef.current?.zoomIn()} className="p-2.5 hover:bg-[#282a2e] text-slate-300 rounded-md transition-colors" title="Zoom In">
              <ZoomIn size={20} />
            </button>
            <button onClick={() => graphRef.current?.zoomOut()} className="p-2.5 hover:bg-[#282a2e] text-slate-300 rounded-md transition-colors" title="Zoom Out">
              <ZoomOut size={20} />
            </button>
            <div className="h-px bg-[#404753] mx-2" />
            <button onClick={() => graphRef.current?.focusPath()} className="p-2.5 hover:bg-[#282a2e] text-blue-400 rounded-md transition-colors" title="Focus Path">
              <Locate size={20} />
            </button>
            <button onClick={() => graphRef.current?.reset()} className="p-2.5 hover:bg-[#282a2e] text-slate-300 rounded-md transition-colors" title="Fit to View">
              <Maximize size={20} />
            </button>
          </div>

          <button 
            onClick={handleExport}
            className="bg-[#3192fc] text-white p-3 rounded-lg shadow-2xl hover:opacity-90 active:scale-95 transition-all flex items-center justify-center"
            title="Export CSV"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Right Panel: Inspector Area */}
      <div className="w-[360px] border-l border-[#222934] shrink-0 bg-[#15171C] flex flex-col shadow-[-20px_0_40_px_-20px_rgba(0,0,0,0.8)] z-30 overflow-y-auto">
        <NodeDetailPanel 
          nodeId={selectedNode} 
          selectedVuln={selectedVuln}
          setSelectedVuln={setSelectedVuln}
          pathIndex={pathIndex}
          setPathIndex={setPathIndex}
          selectedPath={selectedPath}
          projectSummary={data.summary}
          criticalNodes={criticalNodes}
          vulnerabilities={data.vulnerabilities}
        />
      </div>
    </div>
  );
}
