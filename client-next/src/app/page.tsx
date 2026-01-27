'use client';

import { useState, useEffect, useMemo, useRef } from 'react';

interface Job {
  id: string;
  area: string;
  category: string;
  subject: string;
  writer: string;
  date: string;
  link: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedArea, setSelectedArea] = useState('All');

  const [excludedKeywords, setExcludedKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');

  const [pageLimit, setPageLimit] = useState(1);
  const [currentProgress, setCurrentProgress] = useState(0);
  
  // Refs to handle race conditions and cancellations
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchCounterRef = useRef(0);

  const fetchJobs = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentFetchId = ++fetchCounterRef.current;
    
    setLoading(true);
    setJobs([]); 
    setCurrentProgress(0);
    
    let allJobs: Job[] = [];
    const seen = new Set();

    try {
      for (let p = 1; p <= pageLimit; p++) {
        if (currentFetchId !== fetchCounterRef.current || controller.signal.aborted) break;
        setCurrentProgress(p);

        const res = await fetch(`http://localhost:5000/api/jobs?page=${p}`, {
          signal: controller.signal
        });
        const newBatch: Job[] = await res.json();
        
        if (currentFetchId !== fetchCounterRef.current) break;

        const uniqueBatch = newBatch.filter(job => {
          const key = `${job.subject.normalize('NFC')}|${job.writer.normalize('NFC')}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        allJobs = [...allJobs, ...uniqueBatch];
        setJobs([...allJobs]);

        // Polite delay to prevent rapid-fire requests
        if (p < pageLimit) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('Fetch error:', err);
    } finally {
      if (currentFetchId === fetchCounterRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchJobs();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const categories = useMemo(() => ['All', ...new Set(jobs.map(j => j.category).filter(Boolean))], [jobs]);
  const areas = useMemo(() => ['All', ...new Set(jobs.map(j => j.area).filter(Boolean))], [jobs]);

  const addKeyword = () => {
    let clean = keywordInput.trim().toLowerCase();
    clean = clean.replace(/^['"]+|['"]+$/g, '');
    
    if (clean && !excludedKeywords.includes(clean)) {
      setExcludedKeywords([...excludedKeywords, clean.normalize('NFC')]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (kw: string) => {
    setExcludedKeywords(excludedKeywords.filter(k => k !== kw));
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const subjectLower = job.subject.normalize('NFC').toLowerCase();
      const writerLower = job.writer.normalize('NFC').toLowerCase();
      const searchLower = search.normalize('NFC').toLowerCase();
      
      const matchesSearch = subjectLower.includes(searchLower) || writerLower.includes(searchLower);
      const matchesCategory = selectedCategory === 'All' || job.category === selectedCategory;
      const matchesArea = selectedArea === 'All' || job.area === selectedArea;
      
      const isExcluded = excludedKeywords.some(kw => subjectLower.includes(kw.normalize('NFC')));

      return matchesSearch && matchesCategory && matchesArea && !isExcluded;
    });
  }, [jobs, search, selectedCategory, selectedArea, excludedKeywords]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar - Keyword Filter */}
      <aside className="w-80 border-r border-border p-6 hidden lg:flex flex-col gap-6 sticky top-0 h-screen overflow-y-auto shrink-0">
        <div className="space-y-2">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Negative Filter
          </h2>
          <p className="text-xs text-muted-foreground">
            Exclude jobs containing these keywords in the title.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 'unpaid', 'remote'"
              className="flex-1 bg-muted border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
            />
            <button 
              onClick={addKeyword}
              className="bg-primary/20 text-primary hover:bg-primary hover:text-white px-3 py-2 rounded-lg transition-colors text-sm font-bold"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {excludedKeywords.map(kw => (
              <span key={kw} className="bg-muted border border-border text-xs px-3 py-1.5 rounded-full flex items-center gap-2 group hover:border-red-500/50 transition-colors">
                {kw}
                <button onClick={() => removeKeyword(kw)} className="text-muted-foreground hover:text-red-500">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            {excludedKeywords.length === 0 && (
              <p className="text-xs italic text-muted-foreground/50">No keywords excluded yet.</p>
            )}
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-border">
          <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
            <p className="text-[10px] uppercase font-bold tracking-widest text-primary mb-1">Stats</p>
            <p className="text-sm font-medium">Showing {filteredJobs.length} of {jobs.length} jobs</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-5xl mx-auto space-y-10 overflow-x-hidden">
        {/* Header Section */}
        <section className="text-center space-y-3">
          <h1 className="text-5xl font-extrabold tracking-tight">
            <span className="gradient-text">RadioKorea</span> Job Board
          </h1>
          <p className="text-muted-foreground text-lg">
            Real-time insights from deep scraping.
          </p>
        </section>

        {/* Filter Section */}
        <section className="glass p-4 rounded-2xl sticky top-4 z-50 flex flex-col md:flex-row gap-3 items-center shadow-xl">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search roles or companies..."
              className="w-full bg-muted border border-border rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              className="bg-muted border border-border rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer text-sm"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select 
              className="bg-muted border border-border rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer text-sm"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
            >
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            <div className="flex items-center bg-muted border border-border rounded-xl px-3 gap-2">
              <span className="text-xs text-muted-foreground font-bold uppercase whitespace-nowrap">Pages</span>
              <input 
                type="number"
                min={1}
                max={100}
                className="w-16 bg-transparent py-2 focus:outline-none text-sm font-bold text-primary text-center"
                value={pageLimit}
                onChange={(e) => setPageLimit(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              />
            </div>

            <button 
              onClick={fetchJobs}
              disabled={loading}
              className={`bg-primary text-white rounded-xl p-2 transition-all ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
              title="Refresh"
            >
               {loading ? (
                 <div className="flex items-center px-2 gap-2">
                   <div className="h-4 w-4 animate-spin border-2 border-white/30 border-t-white rounded-full" />
                   <span className="text-[10px] font-bold">{currentProgress}/{pageLimit}</span>
                 </div>
               ) : (
                 <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                 </svg>
               )}
            </button>
          </div>
        </section>

        {/* List Section */}
        <section>
          {loading && jobs.length === 0 ? (
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job, idx) => (
                  <a 
                    key={`${job.id}-${idx}`} 
                    href={job.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="job-card bg-card border border-border p-4 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    <div className="w-8 shrink-0 text-muted-foreground/30 font-mono text-xs font-bold text-center">
                      {(idx + 1).toString().padStart(2, '0')}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                          {job.category}
                        </span>
                        <h3 className="text-base font-bold truncate hover:text-primary transition-colors">
                          {job.subject}
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5 shrink-0">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-7h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span className="font-semibold text-foreground truncate max-w-[120px]">{job.writer}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {job.area}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <span className="text-xs font-medium text-muted-foreground/80">{job.date}</span>
                    </div>
                  </a>
                ))
              ) : (
                <div className="col-span-full text-center py-20 space-y-4">
                  <div className="text-6xl">🔍</div>
                  <h3 className="text-2xl font-bold">No jobs found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="text-center text-muted-foreground pt-20 pb-10 border-t border-border">
          <p>© 2026 RadioKorea Scraper. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
