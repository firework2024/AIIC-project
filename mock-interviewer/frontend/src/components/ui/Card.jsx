import React from "react";
import { cn } from "../../utils/cn";
import { motion } from "framer-motion";

export const Card = ({ children, className, hover = false, ...props }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={cn(
                "glass-card rounded-2xl p-6 relative overflow-hidden",
                hover && "hover:border-primary/30 transition-colors duration-300 group",
                className
            )}
            {...props}
        >
            {hover && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            )}
            <div className="relative z-10">{children}</div>
        </motion.div>
    );
};
