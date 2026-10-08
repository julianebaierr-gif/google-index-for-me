'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Settings,
  HelpCircle,
  Download,
  Copy,
  Trash2,
  Loader2,
  RefreshCw,
  Globe,
  Layers,
  FileText,
  Key,
  ShieldCheck,
  Github,
  Zap,
} from 'lucide-react';
import { IndexCheckResult, IndexStatus } from '@/lib/types';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [singleUrl, setSingleUrl] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<IndexCheckResult[]>([]);
  const [filter, setFilter] = useState<'all' | 'indexed' | 'not_indexed' | 'issues'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [serperApiKey, setSerperApiKey] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [googleCx, setGoogleCx] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  // Load API keys from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSerper = localStorage.getItem('gic_serper_key') || '';
      const savedGoogleKey = localStorage.getItem('gic_google_key') || '';
      const savedGoogleCx = localStorage.getItem('gic_google_cx') || '';
      setSerperApiKey(savedSerper);
      setGoogleApiKey(savedGoogleKey);
      setGoogleCx(savedGoogleCx);
    }
  }, []);

  const saveSettings = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gic_serper_key', serperApiKey.trim());
      localStorage.setItem('gic_google_key', googleApiKey.trim());
      localStorage.setItem('gic_google_cx', googleCx.trim());
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    }
  };

  const testApiKey = async () => {
    if (!serperApiKey && !googleApiKey) {
      setTestStatus('Please enter an API key to test.');
      return;
    }
    setTestStatus('Testing API Key with test query...');
    try {
      const res = await fetch('/api/check-index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-serper-key': serperApiKey.trim(),
          'x-google-key': googleApiKey.trim(),
          'x-google-cx': googleCx.trim(),
        },
        body: JSON.stringify({ urls: ['https://google.com'] }),
      });
      const data = await res.json();
      if (res.ok && data.results && data.results.length > 0) {
        const item = data.results[0];
        if (item.status === 'indexed') {
          setTestStatus(`✅ Success! Engine: ${item.method.toUpperCase()} connected successfully.`);
        } else if (item.status === 'captcha_blocked') {
          setTestStatus('⚠️ Direct scraping was blocked. Please verify your API key is correct.');
        } else {
          setTestStatus(`Connected (Result: ${item.status})`);
        }
      } else {
        setTestStatus(`❌ Error: ${data.error || 'Failed to connect'}`);
      }
    } catch (err: any) {
      setTestStatus(`❌ Error: ${err.message}`);
    }
  };

  // Perform Index Check
  const handleCheck = async (urlsToCheck: string[]) => {
    if (urlsToCheck.length === 0) return;

    setIsLoading(true);

    try {
      const res = await fetch('/api/check-index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-serper-key': serperApiKey.trim(),
          'x-google-key': googleApiKey.trim(),
          'x-google-cx': googleCx.trim(),
        },
        body: JSON.stringify({ urls: urlsToCheck }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to check index status.');
        return;
      }

      if (data.results) {
        // Prepend new results, avoiding exact duplicates
        setResults((prev) => {
          const newIds = new Set(data.results.map((r: IndexCheckResult) => r.cleanUrl));
          const filteredPrev = prev.filter((r) => !newIds.has(r.cleanUrl));
          return [...data.results, ...filteredPrev];
        });
      }
    } catch (err: any) {
      alert(`Error during check: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleUrl.trim()) return;
    handleCheck([singleUrl.trim()]);
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkUrls
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return;
    handleCheck(lines);
  };

  // Stats Calculations
  const totalCount = results.length;
  const indexedCount = results.filter((r) => r.status === 'indexed').length;
  const notIndexedCount = results.filter((r) => r.status === 'not_indexed').length;
  const issuesCount = results.filter(
    (r) => r.status === 'captcha_blocked' || r.status === 'error'
  ).length;
  const indexRate = totalCount > 0 ? Math.round((indexedCount / totalCount) * 100) : 0;

  // Filtered Results
  const filteredResults = results.filter((r) => {
    if (filter === 'indexed' && r.status !== 'indexed') return false;
    if (filter === 'not_indexed' && r.status !== 'not_indexed') return false;
    if (
      filter === 'issues' &&
      r.status !== 'captcha_blocked' &&
      r.status !== 'error'
    )
      return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchUrl = r.url.toLowerCase().includes(q);
      const matchTitle = (r.title || '').toLowerCase().includes(q);
      return matchUrl || matchTitle;
    }
    return true;
  });

  // Export to CSV
  const exportCsv = () => {
    if (results.length === 0) return;
    const headers = ['URL', 'Status', 'Is Indexed', 'Method', 'Google Title', 'Checked At'];
    const rows = results.map((r) => [
      `"${r.cleanUrl}"`,
      `"${r.status}"`,
      r.isIndexed ? 'TRUE' : 'FALSE',
      `"${r.method}"`,
      `"${(r.title || '').replace(/"/g, '""')}"`,
      `"${r.checkedAt}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `google_index_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Indexed URLs
  const copyIndexedUrls = () => {
    const urls = results
      .filter((r) => r.status === 'indexed')
      .map((r) => r.cleanUrl)
      .join('\n');
    if (!urls) {
      alert('No indexed URLs to copy.');
      return;
    }
    navigator.clipboard.writeText(urls);
    alert('Indexed URLs copied to clipboard!');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-100 font-black text-xl">
              G
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-tight flex items-center gap-2">
                Google Index Checker
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  PRO
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Automated <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-semibold">site:</code> Search & Status Verifier
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Active Engine Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border bg-slate-50 border-slate-200 text-slate-600">
              <span className={`w-2 h-2 rounded-full ${serperApiKey ? 'bg-emerald-500 animate-pulse' : googleApiKey ? 'bg-blue-500' : 'bg-amber-500'}`}></span>
              <span>
                Engine:{' '}
                <strong>
                  {serperApiKey
                    ? 'Serper.dev (No CAPTCHA)'
                    : googleApiKey
                    ? 'Google Official CSE'
                    : 'Direct Scraper'}
                </strong>
              </span>
            </div>

            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition-colors border border-slate-200"
              title="Configure API Keys (Bypass CAPTCHA)"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            <button
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition-colors border border-slate-200"
              title="Vercel & GitHub Guide"
            >
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Guide</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Hero Banner */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Zap className="w-3.5 h-3.5" />
            100% Vercel & GitHub Ready
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Check If Your Links Are <span className="text-indigo-600">Indexed On Google</span>
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Just paste your URL. The tool automatically executes{' '}
            <code className="bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-medium">site:yoururl.com</code> on Google and checks whether it appears in search results or not.
          </p>
        </div>

        {/* Input Card with Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-3xl mx-auto">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50/50">
            <button
              onClick={() => setActiveTab('single')}
              className={`flex-1 py-3.5 px-4 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
                activeTab === 'single'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Search className="w-4 h-4" />
              Single URL Check
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`flex-1 py-3.5 px-4 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
                activeTab === 'bulk'
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              Bulk URLs Check (List / CSV)
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'single' ? (
              <form onSubmit={handleSingleSubmit} className="space-y-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Enter Web Page URL:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={singleUrl}
                      onChange={(e) => setSingleUrl(e.target.value)}
                      placeholder="https://example.com/blog/my-article-slug"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400 text-sm"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !singleUrl.trim()}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        Check Index
                      </>
                    )}
                  </button>
                </div>

                {/* Example Quick Links */}
                <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                  <span>Try test URLs:</span>
                  <button
                    type="button"
                    onClick={() => setSingleUrl('https://google.com')}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    google.com (Indexed)
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSingleUrl(`https://example.com/unindexed-${Date.now()}`)
                    }
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    non-existent URL (Not Indexed)
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleBulkSubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Paste Multiple URLs (One per line):
                  </label>
                  <span className="text-xs text-slate-500">
                    {bulkUrls
                      .split('\n')
                      .filter((l) => l.trim().length > 0).length}{' '}
                    URLs detected (Max 100)
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  placeholder={`https://mysite.com/post-1\nhttps://mysite.com/post-2\nhttps://mysite.com/post-3`}
                  className="w-full p-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400 font-mono text-xs sm:text-sm"
                />

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() =>
                        setBulkUrls(
                          `https://google.com\nhttps://github.com\nhttps://wikipedia.org\nhttps://example.com/fake-url-test-999`
                        )
                      }
                      className="text-xs text-indigo-600 hover:underline font-medium"
                    >
                      Fill Example Batch
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setBulkUrls('')}
                      className="text-xs text-slate-500 hover:text-red-600"
                    >
                      Clear
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !bulkUrls.trim()}
                    className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Checking Batch...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        Check All URLs
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Stats Row */}
        {results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Checked
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {totalCount}
              </div>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-sm">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Indexed
              </span>
              <div className="text-2xl font-bold text-emerald-800 mt-1 flex items-baseline gap-2">
                {indexedCount}
                <span className="text-xs font-medium text-emerald-600">
                  ({indexRate}%)
                </span>
              </div>
            </div>

            <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200 shadow-sm">
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                Not Indexed
              </span>
              <div className="text-2xl font-bold text-rose-800 mt-1">
                {notIndexedCount}
              </div>
            </div>

            <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 shadow-sm">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                CAPTCHA / Issues
              </span>
              <div className="text-2xl font-bold text-amber-800 mt-1">
                {issuesCount}
              </div>
            </div>
          </div>
        )}

        {/* CAPTCHA / Datacenter Notice Banner if Issues Exist */}
        {issuesCount > 0 && (
          <div className="max-w-4xl mx-auto bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <p className="font-semibold">
                  Google Datacenter CAPTCHA detected for some URLs!
                </p>
                <p className="text-amber-800 text-xs mt-0.5">
                  When deployed on Vercel or cloud servers, Google blocks automated queries.
                  Add a free <strong>Serper.dev API Key</strong> (2,500 free queries, zero CAPTCHA) in Settings, or use the <strong>&quot;Verify on Google ↗&quot;</strong> button.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold whitespace-nowrap shadow-sm transition-colors"
            >
              Open Settings
            </button>
          </div>
        )}

        {/* Results List / Table */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-5xl mx-auto">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    filter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  All ({totalCount})
                </button>
                <button
                  onClick={() => setFilter('indexed')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                    filter === 'indexed'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Indexed ({indexedCount})
                </button>
                <button
                  onClick={() => setFilter('not_indexed')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                    filter === 'not_indexed'
                      ? 'bg-rose-600 text-white'
                      : 'bg-white text-rose-700 hover:bg-rose-50 border border-slate-200'
                  }`}
                >
                  <XCircle className="w-3 h-3" />
                  Not Indexed ({notIndexedCount})
                </button>
                {issuesCount > 0 && (
                  <button
                    onClick={() => setFilter('issues')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                      filter === 'issues'
                        ? 'bg-amber-600 text-white'
                        : 'bg-white text-amber-700 hover:bg-amber-50 border border-slate-200'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Issues ({issuesCount})
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search results..."
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36 sm:w-44"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                <button
                  onClick={exportCsv}
                  title="Export to CSV"
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg border border-slate-200"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={copyIndexedUrls}
                  title="Copy All Indexed URLs"
                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg border border-slate-200"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setResults([])}
                  title="Clear All Results"
                  className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Results Table */}
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {filteredResults.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No matching results found for this filter.
                </div>
              ) : (
                filteredResults.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    {/* Left: Status & URL Info */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.status === 'indexed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            INDEXED ✅
                          </span>
                        )}
                        {item.status === 'not_indexed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            NOT INDEXED ❌
                          </span>
                        )}
                        {item.status === 'captcha_blocked' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            CAPTCHA BLOCKED ⚠️
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
                            ERROR
                          </span>
                        )}

                        <span className="text-[11px] font-mono text-slate-400 uppercase">
                          via {item.method}
                        </span>
                      </div>

                      {/* URL */}
                      <p className="font-mono text-xs sm:text-sm text-slate-900 truncate font-semibold">
                        {item.cleanUrl}
                      </p>

                      {/* Google Title & Snippet Preview if Indexed */}
                      {item.title && (
                        <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 space-y-0.5">
                          <p className="font-semibold text-blue-700 truncate">
                            {item.title}
                          </p>
                          {item.snippet && (
                            <p className="text-slate-600 line-clamp-2">
                              {item.snippet}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Error Message if Any */}
                      {item.error && (
                        <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                          {item.error}
                        </p>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 pt-2 md:pt-0">
                      <a
                        href={item.googleSearchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
                      >
                        Verify on Google ↗
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Google Index Checker Pro • Built for GitHub &amp; Vercel Deployment
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowGuide(true)}
              className="hover:text-indigo-600 font-medium"
            >
              Deployment Instructions
            </button>
            <span>•</span>
            <button
              onClick={() => setShowSettings(true)}
              className="hover:text-indigo-600 font-medium"
            >
              API Key Setup
            </button>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-lg">
                  API &amp; Anti-CAPTCHA Settings
                </h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2 bg-indigo-50/60 border border-indigo-200 p-3.5 rounded-xl">
              <p className="font-bold text-indigo-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Why provide an API Key?
              </p>
              <p>
                When running on <strong>Vercel (AWS cloud servers)</strong>, Google blocks scrapers with CAPTCHAs.
                To get <strong>100% automated, uninterrupted index checking</strong>, use a free API key.
              </p>
            </div>

            <div className="space-y-4">
              {/* Serper.dev API Key */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    1. Serper.dev API Key (Recommended):
                  </label>
                  <a
                    href="https://serper.dev"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-indigo-600 hover:underline font-semibold flex items-center gap-0.5"
                  >
                    Get 2,500 Free Searches ↗
                  </a>
                </div>
                <input
                  type="password"
                  value={serperApiKey}
                  onChange={(e) => setSerperApiKey(e.target.value)}
                  placeholder="Paste Serper API Key..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Takes 10 seconds to sign up with Google at serper.dev (No credit card needed).
                </p>
              </div>

              {/* Google Custom Search Engine */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    2. Google Custom Search (Alternative):
                  </label>
                  <span className="text-[11px] text-slate-500">
                    100 Free / Day
                  </span>
                </div>
                <input
                  type="password"
                  value={googleApiKey}
                  onChange={(e) => setGoogleApiKey(e.target.value)}
                  placeholder="Google Cloud API Key..."
                  className="w-full p-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={googleCx}
                  onChange={(e) => setGoogleCx(e.target.value)}
                  placeholder="Search Engine ID (CX)..."
                  className="w-full p-2 rounded-lg border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {testStatus && (
              <div className="text-xs p-2.5 rounded-lg bg-slate-100 text-slate-800 font-medium">
                {testStatus}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={testApiKey}
                className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Test Connection
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveSettings}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors"
                >
                  {settingsSaved ? 'Saved! ✓' : 'Save Keys'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guide & Vercel Deployment Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-lg">
                  Deploy to GitHub &amp; Vercel Guide
                </h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Github className="w-4 h-4" />
                  Step 1: Push to GitHub
                </h4>
                <p>Terminal me ye commands chalayein:</p>
                <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-xs overflow-x-auto">
{`git init
git add .
git commit -m "Initial commit: Google Index Checker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/google-index-checker.git
git push -u origin main`}
                </pre>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-indigo-600" />
                  Step 2: Deploy on Vercel
                </h4>
                <ol className="list-decimal pl-5 space-y-1">
                  <li><a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline">Vercel.com</a> par login karein.</li>
                  <li><strong>Add New &gt; Project</strong> par click karein aur apna GitHub repo select karein.</li>
                  <li>
                    <strong>Environment Variables</strong> me ye add karein (Optional but recommended):
                    <div className="mt-1 font-mono text-xs bg-slate-200 p-1.5 rounded">
                      SERPER_API_KEY = your_key_here
                    </div>
                  </li>
                  <li><strong>Deploy</strong> button click karein. 1 minute me aapka live tool tayar ho jayega!</li>
                </ol>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                <h4 className="font-bold text-slate-900">
                  Google CAPTCHA ka Masla Kaise Hal Hua?
                </h4>
                <p>
                  Vercel par direct Google scraping ko Google data center IP ki wajah se CAPTCHA dikha deta hai.
                  Is tool me humne:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Serper.dev integration</strong> shamil ki hai jo bina CAPTCHA 2,500 real searches deti hai.</li>
                  <li><strong>Google Official CSE API</strong> option diya hai (100 free searches daily).</li>
                  <li><strong>Fallback direct scraper</strong> rakha hai with auto-detection.</li>
                  <li>Her result ke sath direct <strong>&quot;Verify on Google ↗&quot;</strong> button diya hai jo user ke browser me 1-click se live Google check karta hai.</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowGuide(false)}
                className="px-5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
