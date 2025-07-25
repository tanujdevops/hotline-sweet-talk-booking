
import React from 'react';
import { Mail, Instagram, Twitter, Facebook } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border pt-16 pb-8 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-12">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold">
              <span className="text-hotline-pink">Sweety</span>OnCall
            </h3>
            <p className="text-muted-foreground">
              Premium hotline services for those seeking intimate conversations at affordable rates.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-hotline-pink transition-colors" aria-label="Follow us on Instagram">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-muted-foreground hover:text-hotline-pink transition-colors" aria-label="Follow us on Twitter">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-muted-foreground hover:text-hotline-pink transition-colors" aria-label="Follow us on Facebook">
                <Facebook size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-muted-foreground hover:text-hotline-pink transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-muted-foreground hover:text-hotline-pink transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#booking" className="text-muted-foreground hover:text-hotline-pink transition-colors">
                  Book a Call
                </a>
              </li>
              <li>
                <a href="#faq" className="text-muted-foreground hover:text-hotline-pink transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Contact Us</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Mail size={16} className="text-hotline-pink" />
                <a href="mailto:support@sweetyoncall.com" className="text-muted-foreground hover:text-hotline-pink transition-colors">
                  support@sweetyoncall.com
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border pt-8 text-center">
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} SweetyOnCall. All rights reserved.
          </p>
          <div className="flex justify-center gap-4 mt-2 text-sm">
            <a href="/privacy" className="text-muted-foreground hover:text-hotline-pink transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="text-muted-foreground hover:text-hotline-pink transition-colors">
              Terms of Service
            </a>
            <a href="/refund" className="text-muted-foreground hover:text-hotline-pink transition-colors">
              Refund Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
