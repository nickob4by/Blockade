'use client';

import React, { useState } from 'react';
import { X, Database, Copy, Check, ExternalLink } from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLocal: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onSwitchToLocal,
}) => {
  const [copiedEnv, setCopiedEnv] = useState(false);

  if (!isOpen) return null;

  const envSnippet = `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...`;

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envSnippet);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Supabase Setup for Online Play</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs sm:text-sm text-slate-300">
          <p className="text-slate-400">
            To enable real-time peer-to-peer multiplayer rooms, connect your free Supabase project:
          </p>

          <ol className="list-decimal list-inside space-y-2 text-slate-300">
            <li>
              Create a free project at{' '}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 underline inline-flex items-center gap-0.5 hover:text-emerald-300"
              >
                supabase.com <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>
              Go to <strong>Project Settings → API</strong> and copy your Project URL and Anon API key.
            </li>
            <li>
              Add them to your <code className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-amber-300">.env.local</code> file (or Vercel Environment Variables):
            </li>
          </ol>

          <div className="relative p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300">
            <pre className="overflow-x-auto">{envSnippet}</pre>
            <button
              type="button"
              onClick={handleCopyEnv}
              className="absolute top-2 right-2 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 text-[11px]"
            >
              {copiedEnv ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy
                </>
              )}
            </button>
          </div>

          <p className="text-slate-400 text-xs">
            In the meantime, you can play <strong>Local 2-Player</strong> on the same device or play against <strong>BlockBot AI</strong> right now!
          </p>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onSwitchToLocal();
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs sm:text-sm transition-colors"
          >
            Play Local Mode Instead
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
