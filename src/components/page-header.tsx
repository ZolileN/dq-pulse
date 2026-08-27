import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
};

export function PageHeader({
  title,
  description,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="space-y-1">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-primary md:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
