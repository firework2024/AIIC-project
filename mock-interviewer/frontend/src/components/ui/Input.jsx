import React from "react";
import { cn } from "../../utils/cn";

export const Input = ({ className, label, error, ...props }) => {
    return (
        <div className="space-y-2">
            {label && (
                <label className="text-sm font-medium text-slate-300 ml-1">
                    {label}
                </label>
            )}
            <input
                className={cn(
                    "w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl",
                    "focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
                    "placeholder:text-slate-600 text-slate-200 transition-all outline-none",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    error && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20",
                    className
                )}
                {...props}
            />
            {error && (
                <p className="text-xs text-red-400 ml-1 animate-fade-up">
                    {error}
                </p>
            )}
        </div>
    );
};
