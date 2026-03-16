import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export function PortfolioChartSkeleton() {
  return (
    <Card className="mb-8">
      <div className="flex justify-between mb-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </Card>
  );
}
