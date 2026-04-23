/**
 * System Logs - Server error log viewer
 */
import React, { useState, useEffect, useCallback } from 'react';
import { portalApi } from '../../api/portalApi';

const SystemLogs: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState(100);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await portalApi.getSystemLogs(lines);
      if (data?.logs) setLogs(data.logs);
    } catch { /* ignore */ }
    setLoading(false);
  }, [lines]);

  useEffect(() => { load(); }, [load]);

  const levelColor = (line: string) => {
    if (line.includes('ERROR') || line.includes('error') || line.includes('Traceback')) return 'text-red-600';
    if (line.includes('WARNING') || line.includes('WARN')) return 'text-amber-500';
    if (line.includes('INFO')) return 'text-blue-400';
    if (line.includes('DEBUG')) return 'text-slate-400';
    return 'text-slate-500';
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <select value={lines} onChange={(e) => setLines(Number(e.target.value))}
          className="bg-white shadow-sm border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
          aria-label="Number of lines">
          <option value={50}>Last 50 lines</option>
          <option value={100}>Last 100 lines</option>
          <option value={200}>Last 200 lines</option>
          <option value={500}>Last 500 lines</option>
        </select>
        <button onClick={load} className="ml-auto px-3 py-2.5 bg-slate-100/60 rounded-xl text-slate-500 hover:text-slate-900 text-xs border border-gray-700/50 transition">
          ↻ Refresh
        </button>
      </div>

      <div className="bg-[#0a0e1a] border border-slate-200 rounded-2xl p-4 h-[600px] overflow-y-auto font-mono text-base space-y-0.5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-slate-400 text-center py-8 text-sm">No server logs found</p>
        ) : (
          logs.map((line, i) => (
            <div key={i} className={`${levelColor(line)} leading-relaxed px-2 py-0.5 rounded hover:bg-slate-50 transition`}>
              <span className="text-gray-700 select-none mr-3">{String(i + 1).padStart(3, ' ')}</span>
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SystemLogs;
