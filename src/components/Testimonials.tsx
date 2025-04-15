
import React from 'react';
import { cn } from "@/lib/utils";

type TestimonialProps = {
  quote: string;
  name: string;
  position?: string;
  className?: string;
};

const Testimonial = ({ quote, name, position, className }: TestimonialProps) => (
  <div className={cn("bg-card p-6 rounded-xl border border-border card-hover", className)}>
    <div className="mb-4">
      {[...Array(5)].map((_, i) => (
        <svg key={i} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#9b87f5" className="inline-block mr-1">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
    <p className="text-gray-300 mb-4 italic">"{quote}"</p>
    <div>
      <p className="font-semibold">{name}</p>
      {position && <p className="text-sm text-muted-foreground">{position}</p>}
    </div>
  </div>
);

const Testimonials = () => {
  return (
    <section className="py-20 px-4 bg-gradient-to-b from-background to-black/90">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">What Our <span className="text-hotline">Clients</span> Say</h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Don't just take our word for it. Hear what our satisfied clients have to say about their sweet talk experiences.
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Testimonial 
            quote="The quality of conversation was amazing. Such attention to detail and genuine interest in what I had to say. Will definitely call again!"
            name="Alex K."
            position="Repeat Customer"
            className="lg:translate-y-4"
          />
          
          <Testimonial 
            quote="I was nervous at first, but the talker made me feel so comfortable. Those 4 minutes felt like a genuine connection. Worth every penny."
            name="Jamie T."
            position="New Client"
          />
          
          <Testimonial 
            quote="The extended call option is definitely the way to go. Just when the conversation was getting good, I still had 2 minutes left. Perfect!"
            name="Morgan P."
            position="Weekly Caller"
            className="lg:translate-y-4"
          />
          
          <Testimonial 
            quote="I've tried other services before, but the quality of talkers here is on another level. Professional, attentive, and worth coming back to."
            name="Taylor B."
            position="Monthly Subscriber"
          />
          
          <Testimonial 
            quote="The scheduling system is so convenient. I can book late at night for the next day and always get my preferred time slot."
            name="Jordan M."
            position="Regular Client"
            className="lg:translate-y-4"
          />
          
          <Testimonial 
            quote="I was skeptical about how much could be accomplished in just 2 minutes, but I was blown away. Can't wait for my next call!"
            name="Riley S."
            position="First-time Caller"
          />
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
