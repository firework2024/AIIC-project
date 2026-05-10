import React from "react";
import { cn } from "../../utils/cn";
import { ChevronDown } from "lucide-react";

export const Select = ({ label, options, value, onChange, className, ...props }) => {
    return (
        <div className="space-y-2">
            {label && (
                <label className="text-sm font-medium text-slate-300 ml-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <select
                    value={value}
                    onChange={onChange}
                    className={cn(
                        "w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl appearance-none",
                        "focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
                        "text-slate-200 transition-all outline-none cursor-pointer",
                        className
                    )}
                    {...props}
                >
                    <option value="" disabled className="bg-slate-900 text-slate-500">Select an option...</option>
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-200">
                            {opt.label}
                        </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
            </div>
        </div>
    );
};
