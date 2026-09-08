'use client';

import React from 'react';
import { Flag, X } from 'lucide-react';

interface ResignConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ResignConfirmModal: React.FC<ResignConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl text-center space-y-4">
        {/* Close button at top right */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Flag Icon Badge */}
        <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-lg">
          <Flag className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Resign Match?</h3>
          <p className="text-sm text-slate-600 dark:text-zinc-400 mt-2 leading-relaxed">
            Are you sure you want to forfeit? Your opponent will be awarded the victory, and you will be able to request a rematch.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-semibold text-sm transition-transform active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/20 transition-transform active:scale-95"
          >
            <Flag className="w-4 h-4" />
            Resign
          </button>
        </div>
      </div>
    </div>
  );
};
