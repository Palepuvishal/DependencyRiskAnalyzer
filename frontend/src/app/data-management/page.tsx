"use client";

import React, { useEffect, useState } from "react";
import { getIngestions, ingestFile } from "@/lib/api";
import { UploadCloud, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useProject } from "@/lib/ProjectContext";

export default function DataManagement() {
  const { refreshProjects } = useProject();
  const [ingestions, setIngestions] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchIngestions = async () => {
    try {
      const data = await getIngestions();
      setIngestions(data as unknown as any[]);
    } catch (err) {
      console.error("Failed to fetch ingestions", err);
    }
  };

  useEffect(() => {
    fetchIngestions();
    const interval = setInterval(fetchIngestions, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !projectName) return;
    
    setUploading(true);
    setSuccessMessage("");
    try {
      const res = await ingestFile(file, projectName);
      setSuccessMessage(`Graph updated successfully. Found ${res.vulnerabilitiesFound || 0} vulnerabilities.`);
      await fetchIngestions();
      await refreshProjects();
      setFile(null);
      setProjectName("");
    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload failed. See console.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display-lg text-3xl font-semibold text-white">Data Management</h1>
          <p className="text-slate-400 mt-1">Upload dependency trees and view ingestion history.</p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg flex items-center gap-3 text-green-400">
          <CheckCircle2 size={20} />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Panel */}
        <div className="bg-[#1e2024] border border-[#404753] rounded-lg p-6">
          <h2 className="font-bold text-[11px] text-[#e2e2e8] uppercase tracking-widest mb-4">New Ingestion</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Project Name</label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full bg-[#111317] border border-[#404753] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a6c8ff]"
                placeholder="e.g. Auth-Service"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Dependency File (npm ls --json)</label>
              <div className="border-2 border-dashed border-[#404753] rounded-lg p-6 text-center hover:border-[#a6c8ff] transition-colors cursor-pointer relative">
                <input
                  type="file"
                  required
                  accept=".json"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="mx-auto text-slate-500 mb-2" size={24} />
                <p className="text-sm text-slate-300">
                  {file ? file.name : "Click or drag file to upload"}
                </p>
              </div>
            </div>
            <button
              type="submit"
              disabled={uploading || !file || !projectName}
              className="w-full bg-[#a6c8ff] text-[#002a53] font-bold text-[11px] uppercase tracking-wider py-2.5 rounded disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {uploading ? "Ingesting..." : "Start Ingestion"}
            </button>
          </form>
        </div>

        {/* History Table */}
        <div className="lg:col-span-2 bg-[#1e2024] border border-[#404753] rounded-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#404753]">
            <h2 className="font-bold text-[11px] text-[#e2e2e8] uppercase tracking-widest">Ingestion History</h2>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#282a2e]">
                  <th className="px-4 py-3 font-bold text-[11px] text-[#8a919e] uppercase border-b border-[#404753]">Status</th>
                  <th className="px-4 py-3 font-bold text-[11px] text-[#8a919e] uppercase border-b border-[#404753]">Project</th>
                  <th className="px-4 py-3 font-bold text-[11px] text-[#8a919e] uppercase border-b border-[#404753]">Vulns Found</th>
                  <th className="px-4 py-3 font-bold text-[11px] text-[#8a919e] uppercase border-b border-[#404753]">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#404753]/50">
                {ingestions.map((ing, idx) => (
                  <tr key={idx} className="hover:bg-[#282a2e] transition-colors">
                    <td className="px-4 py-3">
                      {ing.status === "SUCCESS" && <span className="flex items-center gap-1.5 text-xs text-green-400 border border-green-400/30 bg-green-400/10 px-2 py-0.5 rounded-full w-fit"><CheckCircle2 size={12}/> SUCCESS</span>}
                      {ing.status === "PARTIAL" && <span className="flex items-center gap-1.5 text-xs text-yellow-400 border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 rounded-full w-fit"><AlertTriangle size={12}/> PARTIAL</span>}
                      {ing.status === "FAILED" && <span className="flex items-center gap-1.5 text-xs text-red-400 border border-red-400/30 bg-red-400/10 px-2 py-0.5 rounded-full w-fit"><XCircle size={12}/> FAILED</span>}
                    </td>
                    <td className="px-4 py-3 font-medium text-sm text-white">{ing.project}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {typeof ing.vulnerabilitiesFound === 'object' ? JSON.stringify(ing.vulnerabilitiesFound) : (ing.vulnerabilitiesFound || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{new Date(ing.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
                {ingestions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500 text-sm">No ingestion history found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
