
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumbs = ({ items, className }: BreadcrumbsProps) => {
  return (
    <nav aria-label="Breadcrumb" className={cn('py-2 px-4', className)}>
      <ol className="flex flex-wrap items-center text-sm">
        <li className="flex items-center">
          <Link 
            to="/" 
            className="text-muted-foreground hover:text-hotline-pink transition-colors flex items-center"
            aria-label="Home"
          >
            <Home size={14} />
          </Link>
        </li>
        
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            <ChevronRight size={14} className="mx-2 text-muted-foreground" />
            {index === items.length - 1 ? (
              <span className="text-foreground font-medium" aria-current="page">{item.label}</span>
            ) : (
              <Link 
                to={item.href} 
                className="text-muted-foreground hover:text-hotline-pink transition-colors"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
