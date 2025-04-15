
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneCall, Mail, Instagram, Twitter, Facebook } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border pt-16 pb-8 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold">
              <span className="text-hotline">Sweet</span>Talk
            </h3>
            <p className="text-muted-foreground">
              Premium hotline services for those seeking intimate conversations at affordable rates.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-hotline transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-muted-foreground hover:text-hotline transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-muted-foreground hover:text-hotline transition-colors">
                <Facebook size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-muted-foreground hover:text-hotline transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-muted-foreground hover:text-hotline transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#booking" className="text-muted-foreground hover:text-hotline transition-colors">
                  Book a Call
                </a>
              </li>
              <li>
                <a href="#faq" className="text-muted-foreground hover:text-hotline transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Contact Us</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <PhoneCall size={16} className="text-hotline" />
                <span className="text-muted-foreground">+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} className="text-hotline" />
                <a href="mailto:info@sweet-talk-hotline.com" className="text-muted-foreground hover:text-hotline transition-colors">
                  info@sweet-talk-hotline.com
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Subscribe</h4>
            <p className="text-muted-foreground mb-4">
              Get exclusive offers and updates directly to your inbox.
            </p>
            <div className="flex gap-2">
              <Input 
                placeholder="Your email" 
                className="bg-background border-muted"
              />
              <Button className="bg-hotline hover:bg-hotline-dark">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border pt-8 text-center">
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} Sweet Talk Hotline. All rights reserved.
          </p>
          <div className="flex justify-center gap-4 mt-2 text-sm">
            <a href="#" className="text-muted-foreground hover:text-hotline transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-muted-foreground hover:text-hotline transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-muted-foreground hover:text-hotline transition-colors">
              Refund Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
