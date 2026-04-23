import Link from "next/link";
import { Shield, Network, Zap, Search, UploadCloud, Database, Activity, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="bg-[#0c0e12] min-h-screen font-['Inter'] text-[#e2e2e8]">
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden border-b border-[#222934]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500 rounded-full blur-[120px]"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full mb-8">
            <Shield size={14} className="text-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">v2.4.0 Now Stable</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 bg-gradient-to-b from-white to-[#8a919e] bg-clip-text text-transparent">
            Dependency Risk Analyzer
          </h1>
          <p className="text-xl md:text-2xl text-[#8a919e] max-w-2xl mx-auto mb-12 leading-relaxed">
            Visualize transitive vulnerabilities in your dependency graph. Secure your ecosystem with graph-native reasoning.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard" className="w-full sm:w-auto bg-[#a6c8ff] text-[#002a53] px-8 py-4 rounded-lg font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-blue-500/10">
              Go to Dashboard <ArrowRight size={18} />
            </Link>
            <Link href="/data-management" className="w-full sm:w-auto bg-[#1e2024] border border-[#404753] text-white px-8 py-4 rounded-lg font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:border-[#a6c8ff] transition-all">
              Upload Project
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 border-b border-[#222934]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-[11px] font-bold text-blue-500 uppercase tracking-[0.3em] mb-4">Core Capabilities</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-white">Built for Enterprise Security</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#15171C] border border-[#222934] p-8 rounded-xl hover:border-blue-500/50 transition-all group">
              <div className="bg-blue-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6 text-blue-500 group-hover:scale-110 transition-transform">
                <Network size={24} />
              </div>
              <h4 className="text-lg font-bold mb-3">Graph-based Analysis</h4>
              <p className="text-sm text-[#8a919e] leading-relaxed">
                Map complex transitive dependencies using Neo4j to find hidden exposure paths.
              </p>
            </div>

            <div className="bg-[#15171C] border border-[#222934] p-8 rounded-xl hover:border-error/50 transition-all group">
              <div className="bg-[#ffb4ab]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6 text-[#ffb4ab] group-hover:scale-110 transition-transform">
                <Search size={24} />
              </div>
              <h4 className="text-lg font-bold mb-3">OSV Vulnerability Detection</h4>
              <p className="text-sm text-[#8a919e] leading-relaxed">
                Real-time enrichment from the Open Source Vulnerability database for accurate risk assessment.
              </p>
            </div>

            <div className="bg-[#15171C] border border-[#222934] p-8 rounded-xl hover:border-purple-500/50 transition-all group">
              <div className="bg-purple-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6 text-purple-500 group-hover:scale-110 transition-transform">
                <Zap size={24} />
              </div>
              <h4 className="text-lg font-bold mb-3">Path Explainability</h4>
              <p className="text-sm text-[#8a919e] leading-relaxed">
                Not just what is broken, but exactly how a vulnerability reaches your core services.
              </p>
            </div>

            <div className="bg-[#15171C] border border-[#222934] p-8 rounded-xl hover:border-[#de7403]/50 transition-all group">
              <div className="bg-[#de7403]/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6 text-[#de7403] group-hover:scale-110 transition-transform">
                <Activity size={24} />
              </div>
              <h4 className="text-lg font-bold mb-3">Intelligent Risk Scoring</h4>
              <p className="text-sm text-[#8a919e] leading-relaxed">
                Prioritize remediation based on reachability, severity, and dependency depth.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-[#0c0e12]">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-[11px] font-bold text-blue-500 uppercase tracking-[0.3em] mb-4">Workflow</h2>
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-8">Four steps to absolute clarity.</h3>
              
              <div className="space-y-12">
                <div className="flex gap-6">
                  <div className="bg-[#1e2024] border border-[#404753] w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-blue-500">1</div>
                  <div>
                    <h4 className="text-lg font-bold mb-2">Upload Dependencies</h4>
                    <p className="text-sm text-[#8a919e]">Drop your <code className="font-mono text-blue-400">package-lock.json</code> or <code className="font-mono text-blue-400">npm ls --json</code> output.</p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="bg-[#1e2024] border border-[#404753] w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-blue-500">2</div>
                  <div>
                    <h4 className="text-lg font-bold mb-2">Build Dependency Graph</h4>
                    <p className="text-sm text-[#8a919e]">We recursively map every library and version into a high-performance Neo4j graph.</p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="bg-[#1e2024] border border-[#404753] w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-blue-500">3</div>
                  <div>
                    <h4 className="text-lg font-bold mb-2">Detect Vulnerabilities</h4>
                    <p className="text-sm text-[#8a919e]">Automated enrichment from OSV and NVD to identify known threats across the entire tree.</p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="bg-[#1e2024] border border-[#404753] w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-blue-500">4</div>
                  <div>
                    <h4 className="text-lg font-bold mb-2">Visualize & Remediate</h4>
                    <p className="text-sm text-[#8a919e]">Use the interactive workbench to explore paths and get clear remediation advice.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:w-1/2 w-full">
              <div className="relative aspect-square md:aspect-video bg-[#15171C] border border-[#222934] rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center group">
                <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>
                <Network size={120} className="text-blue-500/20 group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute bottom-8 left-8 right-8 bg-[#0c0e12]/80 backdrop-blur border border-[#404753] p-6 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Activity size={16} className="text-[#de7403]" />
                    <span className="text-xs font-bold uppercase tracking-widest">Real-time Analysis</span>
                  </div>
                  <div className="w-full bg-[#1e2024] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full w-[75%] animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer / CTA */}
      <section className="py-24 border-t border-[#222934]">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-3xl font-bold mb-8 text-white">Secure your supply chain today.</h3>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard" className="bg-[#a6c8ff] text-[#002a53] px-10 py-4 rounded-lg font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-all">
              Enter Workbench
            </Link>
          </div>
          <div className="mt-16 pt-8 border-t border-[#222934] text-[#8a919e] text-xs uppercase tracking-widest font-bold flex flex-wrap justify-center gap-12">
            <div className="flex items-center gap-2"><Database size={14} /> Neo4j Backend</div>
            <div className="flex items-center gap-2"><Zap size={14} /> OSV Integration</div>
            <div className="flex items-center gap-2"><Shield size={14} /> Enterprise Dark Theme</div>
          </div>
        </div>
      </section>
    </div>
  );
}
