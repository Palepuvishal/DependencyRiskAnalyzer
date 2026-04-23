"use client";
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import cytoscape from "cytoscape";
import { useProject } from "@/lib/ProjectContext";
import { Legend } from "./Legend";

interface GraphViewProps {
  nodes: any[];
  edges: any[];
  onNodeClick: (nodeId: string) => void;
  selectedPath: string[] | null;
}

export interface GraphViewRef {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  focusPath: () => void;
}

export const GraphView = forwardRef<GraphViewRef, GraphViewProps>(({ nodes, edges, onNodeClick, selectedPath }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const layoutInitialized = useRef(false);
  const { hoveredLibrary } = useProject();

  useImperativeHandle(ref, () => ({
    zoomIn: () => cyRef.current?.zoom((cyRef.current?.zoom() || 1) * 1.2),
    zoomOut: () => cyRef.current?.zoom((cyRef.current?.zoom() || 1) * 0.8),
    reset: () => {
      cyRef.current?.fit();
      cyRef.current?.center();
    },
    focusPath: () => {
      const pathNodes = cyRef.current?.elements('node[?inPath]');
      if (pathNodes && pathNodes.length > 0) {
        cyRef.current?.animate({
          fit: { eles: pathNodes, padding: 100 },
          duration: 500
        });
      }
    }
  }));

  // Standardized Security Palette
  const colors = {
    CRITICAL: '#ff4d4f',
    HIGH: '#fa8c16',
    MEDIUM: '#fadb14',
    LOW: '#40a9ff',
    SAFE: '#3a3f4b',
    NONE: '#3a3f4b'
  };

  const getStyle = (isPath: boolean, severity: string = 'NONE', isHovered: boolean = false, type: string = 'Library') => {
    const severityColor = colors[severity as keyof typeof colors] || colors.NONE;
    
    let backgroundColor = colors.SAFE;
    let shape: any = 'round-rectangle';
    let baseWidth = 35;
    let baseHeight = 28;

    switch (type) {
      case 'Project':
        backgroundColor = '#3192fc'; // Fixed Blue
        shape = 'ellipse';
        baseWidth = 50;
        baseHeight = 50;
        break;
      case 'Library':
        backgroundColor = severityColor;
        shape = 'rectangle';
        baseWidth = 45;
        baseHeight = 35;
        break;
      case 'Version':
        backgroundColor = severityColor;
        shape = 'round-rectangle';
        baseWidth = 40;
        baseHeight = 20;
        // Dimmed version logic
        break;
      case 'Vulnerability':
        backgroundColor = severityColor;
        shape = 'diamond';
        baseWidth = 50;
        baseHeight = 50;
        break;
    }

    const scale = isPath || isHovered ? 1.2 : 1.0;
    let fontSize = 9;
    if (type === 'Project') fontSize = 11;

    return {
      'shape': shape,
      'label': 'data(label)',
      'color': '#ffffff',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': fontSize * scale,
      'font-weight': 'bold',
      'background-color': backgroundColor,
      'background-opacity': type === 'Version' ? 0.4 : 1.0, // Dimmed versions
      'border-color': isPath || isHovered ? severityColor : '#404753',
      'border-width': isPath || isHovered ? 3 : 2,
      'width': baseWidth * scale,
      'height': baseHeight * scale,
      'z-index': isPath || isHovered ? 100 : 1,
      'underlay-padding': isPath || isHovered ? '4px' : '0px',
      'underlay-color': severityColor,
      'underlay-opacity': isPath || isHovered ? 0.2 : 0,
      'opacity': isPath || isHovered || !selectedPath ? 1 : 0.3
    };
  };

  // Sync highlighting based on hoveredLibrary
  useEffect(() => {
    if (!cyRef.current) return;
    
    cyRef.current.batch(() => {
      cyRef.current?.nodes().forEach(node => {
        const nodeId = node.id();
        const inPath = node.data('inPath');
        const severity = node.data('severity');
        const type = node.data('type');
        const isHovered = nodeId === hoveredLibrary;
        
        node.style(getStyle(inPath, severity, isHovered, type));
      });
    });
  }, [hoveredLibrary, selectedPath]);

  // 1. Initialize Cytoscape once
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'color': '#ffffff',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '9px',
            'font-family': 'Space Grotesk',
            'font-weight': 'bold',
            'background-color': '#333539',
            'shape': 'round-rectangle',
            'width': '35px',
            'height': '28px',
            'border-width': 2,
            'border-color': '#404753',
            'opacity': 1,
            'transition-property': 'border-color, border-width, background-color, opacity, font-size',
            'transition-duration': 300
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#222934',
            'target-arrow-color': '#222934',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'opacity': 0.3,
            'transition-property': 'line-color, opacity, width',
            'transition-duration': 300
          }
        }
      ],
      minZoom: 0.5,
      maxZoom: 2.0,
    });

    cy.on('tap', 'node', (evt) => {
      onNodeClick(evt.target.id());
    });

    cyRef.current = cy;
    layoutInitialized.current = false;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [onNodeClick]);

  // 2. Structural Sync (Nodes & Edges) - Run Layout ONLY Once
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || nodes.length === 0) return;

    cy.batch(() => {
      const currentIds = new Set(cy.elements().map(el => el.id()));
      
      // Add new nodes
      nodes.forEach(n => {
        if (!currentIds.has(n.id)) {
          cy.add({ 
            group: 'nodes', 
            data: { ...n },
            style: getStyle(false, n.severity || 'NONE', false, n.type)
          });
        }
      });

      // Add new edges
      edges.forEach(e => {
        const edgeId = `${e.source}-${e.target}-${e.type}`;
        if (!currentIds.has(edgeId)) {
          cy.add({ group: 'edges', data: { ...e, id: edgeId } });
        }
      });

      // Remove stale elements
      const newNodeIds = new Set(nodes.map(n => n.id));
      const newEdgeIds = new Set(edges.map(e => `${e.source}-${e.target}-${e.type}`));
      cy.elements().forEach(el => {
        if (el.isNode() && !newNodeIds.has(el.id())) el.remove();
        if (el.isEdge() && !newEdgeIds.has(el.id())) el.remove();
      });
    });

    // Run layout exactly once when nodes appear
    if (!layoutInitialized.current && nodes.length > 0) {
      const layoutConfig = { 
        name: 'cose', 
        animate: true,
        fit: true,
        padding: 50,
        nodeRepulsion: 400000,
        idealEdgeLength: 100,
        edgeElasticity: 100,
        gravity: 80
      };
      
      console.log("LAYOUT_AUDIT: TYPE", layoutConfig);
      console.log("LAYOUT_AUDIT: NODES_BEFORE_RENDER", nodes);
      console.log("LAYOUT_AUDIT: EDGES_BEFORE_RENDER", edges);

      cy.layout(layoutConfig).run();
      layoutInitialized.current = true;
    }
  }, [nodes, edges]);

  // 3. Reactive Style Sync (Path Selection & Hover)
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    console.log("GRAPH_FLOW_AUDIT: SELECTED_PATH", selectedPath);
    
    // Validation: Ensure all path nodes exist in graph
    if (selectedPath) {
      const graphIds = new Set(cy.nodes().map(n => n.id()));
      selectedPath.forEach(id => {
        if (!graphIds.has(id)) {
          console.error("GRAPH_VALIDATION_ERROR: ID in path NOT FOUND in graph:", id);
        }
      });
    }

    const pathSet = new Set(selectedPath || []);
    
    // Determine the severity of the path for highlighting
    // We assume the path takes the severity of the terminal node (the vulnerability)
    const pathSeverity = selectedPath && selectedPath.length > 0 
      ? nodes.find(n => n.id === selectedPath[selectedPath.length - 1])?.severity || 'MEDIUM'
      : 'NONE';

    const highlightColor = colors[pathSeverity as keyof typeof colors] || colors.NONE;

    cy.batch(() => {
      // 1. Strict Node Highlighting
      cy.nodes().forEach(node => {
        const nodeId = node.id();
        const inPath = pathSet.has(nodeId);
        const isHovered = nodeId === hoveredLibrary;
        const severity = node.data('severity') || (inPath ? pathSeverity : 'NONE');
        const type = node.data('type');
        
        const nodeStyle = getStyle(inPath, severity, isHovered, type);
        
        // Override for maximum contrast
        node.style({
          ...nodeStyle,
          'opacity': inPath || !selectedPath ? 1 : 0.2,
          'border-color': inPath ? highlightColor : '#404753',
          'border-width': inPath ? 3 : 2
        });
      });

      // 2. Strict Edge Highlighting (Must be adjacent in the selectedPath sequence)
      cy.edges().forEach(edge => {
        const sourceId = edge.data('source');
        const targetId = edge.data('target');
        
        const isPath = selectedPath ? selectedPath.some((_, i) => {
          return selectedPath[i] === sourceId && selectedPath[i + 1] === targetId;
        }) : false;
        
        edge.style({
          'line-color': isPath ? highlightColor : '#555',
          'target-arrow-color': isPath ? highlightColor : '#555',
          'opacity': isPath ? 1 : 0.1,
          'width': 2,
          'z-index': isPath ? 50 : 1
        });
      });
    });
  }, [selectedPath, hoveredLibrary]);

  return (
    <div className="relative w-full h-full overflow-visible">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
});


