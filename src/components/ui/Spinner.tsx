import React from 'react';
import { cn } from '@/lib/utils';

export const Spinner = ({ className }: { className?: string }) => {
    return (
        <div className={cn("animate-spin rounded-full h-6 w-6 border-2 border-brand-primary border-t-transparent shadow-[0_0_15px_rgba(99,102,241,0.3)]", className)} />
    );
};
