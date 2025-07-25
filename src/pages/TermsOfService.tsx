import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TermsOfService = () => {
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
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground">
            <strong>Effective Date:</strong> July 25, 2025<br />
            <strong>Last Updated:</strong> July 25, 2025
          </p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-lg mb-6">
            By using SweetyOnCall's services (the "Service"), you agree to these Terms of Service. If you do not agree, do not access or use the Service.
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-hotline-pink">1. No Account or Login Required</h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>You may book and connect with AI companions without creating an account or logging in.</li>
              <li>We collect only the information you provide at booking (name, email, phone) to fulfill the call.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-hotline-pink">2. Content and Conduct</h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>The Service is provided "as‑is" and may include AI-generated conversation.</li>
              <li>Under no circumstances does SweetyOnCall or its affiliates endorse, facilitate, or condone explicit or erotic content.</li>
              <li>You must not record, redistribute, or misuse any conversation.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-hotline-pink">3. Sole Responsibility & Disclaimer</h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>You assume all risk in using the Service.</li>
              <li>SweetyOnCall, its officers, employees, agents, affiliates, and partners ("we") disclaim all warranties, express or implied, including fitness, merchantability, accuracy, or non‑infringement.</li>
              <li>We are not responsible or liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of, or inability to use, the Service for any reason.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-hotline-pink">4. Payments & Cancellations</h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>Fees are charged at booking via our payment partner.</li>
              <li>All charges are final: no refunds except as stated in our Refund Policy.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-hotline-pink">5. Modifications & Termination</h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>We may modify or discontinue the Service or these Terms at any time without notice.</li>
              <li>Continued use after changes constitutes acceptance.</li>
              <li>We reserve the right to refuse or cancel bookings at our discretion.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-hotline-pink">6. Governing Law</h2>
            <p>These Terms are governed by the laws of the jurisdiction where SweetyOnCall is registered.</p>
          </section>

          <div className="mt-12 p-6 bg-secondary/30 rounded-lg border">
            <h3 className="text-lg font-semibold mb-2">Questions about our Terms?</h3>
            <p className="text-muted-foreground">
              Contact us at{' '}
              <a href="mailto:support@sweetyoncall.com" className="text-hotline-pink hover:underline">
                support@sweetyoncall.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;