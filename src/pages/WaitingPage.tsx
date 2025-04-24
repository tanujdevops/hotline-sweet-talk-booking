
import { useLocation, Navigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { format } from 'date-fns';
import { PRICING_DETAILS } from '@/lib/pricing';

export default function WaitingPage() {
  const location = useLocation();
  const { bookingId, planKey, scheduledAt } = location.state || {};

  // Redirect if no booking data
  if (!bookingId) {
    return <Navigate to="/" replace />;
  }

  const planDetails = PRICING_DETAILS[planKey];
  const formattedDate = scheduledAt ? format(new Date(scheduledAt), 'PPpp') : 'Not scheduled';

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Booking Confirmed!</CardTitle>
            <CardDescription>Your booking details are below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Booking ID</p>
              <p className="font-mono font-medium">{bookingId}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Selected Plan</p>
              <p className="font-medium">{planDetails.label}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Scheduled For</p>
              <p className="font-medium">{formattedDate}</p>
            </div>
            {planDetails.price > 0 && (
              <div className="rounded-lg bg-secondary p-4 mt-6">
                <p className="text-sm font-medium">Payment Required</p>
                <p className="text-sm text-muted-foreground">
                  Please complete the payment to confirm your booking.
                  Payment processing will be implemented soon.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
