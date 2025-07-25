import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PrivacyPolicy = () => {
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
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground">
            <strong>Last Updated:</strong> July 25, 2025
          </p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-lg mb-6">
            SweetyOnCall respects your privacy. By using the Service, you consent to the practices below.
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-hotline-pink">1. Information We Collect</h2>
            <ul className="space-y-2 list-disc pl-6">
              <li><strong>Provided at Booking:</strong> Name, email, phone number, and optional preferences.</li>
              <li><strong>Usage Data:</strong> Call timestamps, metadata, and anonymized logs for quality and compliance.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-hotline-pink">2. Use of Information</h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>To schedule and conduct AI companion calls.</li>
              <li>To improve Service quality, train models, and maintain security.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-hotline-pink">3. Data Sharing & Disclosure</h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>We do <strong>not</strong> sell, rent, or share personal information outside our service providers (hosting, analytics) bound by confidentiality.</li>
              <li>We may disclose data to comply with legal obligations.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-hotline-pink">4. Retention & Security</h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>Personal data is retained only as long as necessary to provide the Service or as required by law.</li>
              <li>We implement industry-standard security measures (encryption, access controls) but disclaim all liability for data breaches.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-hotline-pink">5. No Liability for Accuracy</h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>AI-generated content may be inaccurate or incomplete.</li>
              <li>We disclaim liability for decisions made based on any conversation.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-hotline-pink">6. Your Choices</h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>You may contact us at <a href="mailto:support@sweetyoncall.com" className="text-hotline-pink hover:underline">support@sweetyoncall.com</a> to correct or delete your personal data.</li>
              <li>Disabling cookies or blocking analytics may limit functionality.</li>
            </ul>
          </section>

          <div className="mt-12 p-6 bg-secondary/30 rounded-lg border">
            <h3 className="text-lg font-semibold mb-2">Privacy Questions?</h3>
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

export default PrivacyPolicy;