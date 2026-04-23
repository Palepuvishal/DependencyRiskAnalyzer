"use client";

import React, { useEffect, useState } from "react";
import { useProject } from "@/lib/ProjectContext";
import { getRisk } from "@/lib/api";
import { VulnerabilityTable } from "@/components/VulnerabilityTable";

export default function Vulnerabilities() {
  const { selectedProject } = useProject();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const riskData = await getRisk(selectedProject);
        setData(riskData);
      } catch (err) {
        console.error("Failed to fetch risk data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedProject]);

  if (!selectedProject) {
    return <div className="p-6">Select a project to view vulnerabilities.</div>;
  }

  if (loading || !data) {
    return <div className="p-6">Loading vulnerabilities...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display-lg text-3xl font-semibold text-white">Vulnerabilities</h1>
          <p className="text-slate-400 mt-1">Detailed list of all detected vulnerabilities and exposures.</p>
        </div>
      </div>
      
      <VulnerabilityTable vulnerabilities={data.vulnerabilities} />
    </div>
  );
}
