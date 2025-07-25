import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const RefundPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => window.history.back()}
            className="mb-4 text-hotline-pink hover:text-hotline-pink/80"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Refund Policy</h1>
          <p className="text-muted-foreground">
            <strong>Effective Date:</strong> July 25, 2025
          </p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-lg mb-6">
            All sales are final. SweetyOnCall does not offer refunds except as follows:
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-hotline-pink">1. Eligibility</h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>Refunds are only available if the Service fails to connect due to a technical error on our end.</li>
              <li>Must request a refund by emailing <a href="mailto:support@sweetyoncall.com" className="text-hotline-pink hover:underline">support@sweetyoncall.com</a> within <strong>24 hours</strong> of the scheduled call.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-hotline-pink">2. Non‑Refundable Situations</h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>No refunds for completed or partially completed calls.</li>
              <li>No refunds for dissatisfaction with conversation content.</li>
              <li>No refunds after 24 hours of call booking.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-hotline-pink">3. Processing</h2>
            <p>Approved refunds will be issued through the original payment method within 10 business days.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-hotline-pink">4. Disclaimer</h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>We reserve the sole discretion to approve or deny any refund request.</li>
              <li>We are not liable for any losses or damages arising from failure to grant a refund.</li>
            </ul>
          </section>

          <div className="mt-12 p-6 bg-secondary/30 rounded-lg border">
            <h3 className="text-lg font-semibold mb-2">Need a Refund?</h3>
            <p className="text-muted-foreground mb-2">
              If you believe you qualify for a refund under our policy, please contact us within 24 hours:
            </p>
            <p className="text-muted-foreground">
              Email:{' '}
              <a href="mailto:support@sweetyoncall.com" className="text-hotline-pink hover:underline">
                support@sweetyoncall.com
              </a>
            </p>
            <p className="text-sm text-muted-foreground mt-3">
              Please include your booking details and a description of the technical issue you experienced.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;