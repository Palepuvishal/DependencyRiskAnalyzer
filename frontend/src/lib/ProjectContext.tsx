"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getProjects } from "./api";

interface ProjectContextType {
  selectedProject: string;
  setSelectedProject: (project: string) => void;
  projects: { name: string }[];
  refreshProjects: () => Promise<void>;
  selectedVuln: any;
  setSelectedVuln: (vuln: any) => void;
  pathIndex: number;
  setPathIndex: (index: number | ((prev: number) => number)) => void;
  hoveredLibrary: string | null;
  setHoveredLibrary: (lib: string | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [selectedProject, setSelectedProject] = useState<string>("MyApp");
  const [projects, setProjects] = useState<{ name: string }[]>([]);
  const [selectedVuln, setSelectedVuln] = useState<any>(null);
  const [pathIndex, setPathIndex] = useState(0);
  const [hoveredLibrary, setHoveredLibrary] = useState<string | null>(null);

  const refreshProjects = async () => {
    try {
      const data: any = await getProjects();
      setProjects(data);
      if (data.length > 0 && !data.find((p: any) => p.name === selectedProject)) {
        setSelectedProject(data[0].name);
      }
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  return (
    <ProjectContext.Provider value={{ 
      selectedProject, 
      setSelectedProject, 
      projects, 
      refreshProjects,
      selectedVuln,
      setSelectedVuln,
      pathIndex,
      setPathIndex,
      hoveredLibrary,
      setHoveredLibrary
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
