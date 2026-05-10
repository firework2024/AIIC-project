import React from "react";
import { cn } from "../../utils/cn"; // We will create this utility
import { motion } from "framer-motion";

export const Button = ({ 
  children, 
  variant = "primary", 
  className, 
  icon: Icon,
  ...props 
}) => {
  const baseStyles = "relative inline-flex items-center justify-center px-6 py-3 overflow-hidden font-medium transition-all duration-300 rounded-xl group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900";
  
  const variants = {
    primary: "bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/25 ring-primary",
    secondary: "bg-secondary hover:bg-secondary-hover text-white shadow-lg shadow-secondary/25 ring-secondary",
    outline: "border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white bg-transparent",
    ghost: "text-slate-400 hover:text-white hover:bg-white/5",
    glow: "bg-primary text-white shadow-[0_0_20px_rgba(109,40,217,0.5)] hover:shadow-[0_0_30px_rgba(109,40,217,0.7)] transition-shadow duration-500"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    >
      {Icon && <Icon className="w-5 h-5 mr-2" />}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};
