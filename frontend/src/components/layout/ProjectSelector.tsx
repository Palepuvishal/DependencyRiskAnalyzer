"use client";

import React from "react";
import { useProject } from "@/lib/ProjectContext";

export function ProjectSelector() {
  const { projects, selectedProject, setSelectedProject } = useProject();

  if (projects.length === 0) {
    return <div className="text-slate-400 text-sm">No projects found</div>;
  }

  return (
    <select
      value={selectedProject}
      onChange={(e) => setSelectedProject(e.target.value)}
      className="bg-[#1F242D] text-slate-200 text-sm rounded border border-[#222934] px-3 py-1.5 focus:outline-none focus:border-blue-500"
    >
      {projects.map((p) => (
        <option key={p.name} value={p.name}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
