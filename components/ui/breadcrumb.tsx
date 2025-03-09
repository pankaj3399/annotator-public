// components/ui/breadcrumb.tsx
import * as React from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    aria-label="breadcrumb"
    className={cn("flex items-center text-sm", className)}
    {...props}
  />
));
Breadcrumb.displayName = "Breadcrumb";

const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  React.OlHTMLAttributes<HTMLOListElement>
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn("flex items-center gap-1.5", className)}
    {...props}
  />
));
BreadcrumbList.displayName = "BreadcrumbList";

const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.LiHTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn("flex items-center gap-1.5", className)}
    {...props}
  />
));
BreadcrumbItem.displayName = "BreadcrumbItem";

const BreadcrumbSeparator = ({
  className,
  children,
  ...props
}: React.ComponentProps<"li">) => (
  <li
    className={cn("text-muted-foreground", className)}
    aria-hidden="true"
    {...props}
  >
    {children || <ChevronRight className="h-4 w-4" />}
  </li>
);
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href?: string;
    asChild?: boolean;
  }
>(({ className, href, children, asChild = false, ...props }, ref) => {
  if (asChild) {
    return (
      <span
        ref={ref}
        className={cn("text-muted-foreground", className)}
        {...props}
      >
        {children}
      </span>
    );
  }

  if (!href) {
    return (
      <span
        ref={ref}
        className={cn("text-foreground font-medium", className)}
        {...props}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      ref={ref}
      className={cn(
        "text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
});
BreadcrumbLink.displayName = "BreadcrumbLink";

const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    aria-current="page"
    className={cn("text-foreground font-medium", className)}
    {...props}
  />
));
BreadcrumbPage.displayName = "BreadcrumbPage";

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbLink,
  BreadcrumbPage,
};