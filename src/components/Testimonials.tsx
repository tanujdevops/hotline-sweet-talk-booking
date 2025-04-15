
import React from 'react';
import { cn } from "@/lib/utils";
import { Star, Quote } from "lucide-react";

type TestimonialProps = {
  quote: string;
  name: string;
  position?: string;
  className?: string;
  rating?: number;
  avatar?: string;
};

const Testimonial = ({ quote, name, position, className, rating = 5, avatar }: TestimonialProps) => (
  <div className={cn("bg-card p-6 rounded-xl border border-border card-hover glass-effect", className)}>
    <div className="flex items-start mb-4">
      <div className="mr-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-hotline to-hotline-pink flex items-center justify-center text-white text-lg font-semibold">
          {avatar ? (
            <img src={avatar} alt={name} className="w-full h-full object-cover" />
          ) : (
            name.charAt(0)
          )}
        </div>
      </div>
      
      <div>
        <div className="mb-1 flex">
          {[...Array(rating)].map((_, i) => (
            <Star key={i} size={16} fill="#9b87f5" className="text-hotline" />
          ))}
        </div>
        <p className="font-semibold">{name}</p>
        {position && <p className="text-sm text-muted-foreground">{position}</p>}
      </div>
    </div>
    
    <div className="relative">
      <Quote size={40} className="absolute -top-2 -left-2 text-hotline/10" />
      <p className="text-gray-300 mb-4 italic relative z-10 pl-4">{quote}</p>
    </div>
  </div>
);

const Testimonials = () => {
  return (
    <section className="py-20 px-4 bg-gradient-to-b from-background to-black/90 relative overflow-hidden">
      <div className="absolute inset-0 bg-sensual-gradient opacity-40"></div>
      
      <div className="container mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">What Our <span className="text-hotline bg-gradient-to-r from-hotline to-hotline-pink bg-clip-text text-transparent">Clients</span> Say</h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Don't just take our word for it. Hear what our satisfied clients have to say about their sweet talk experiences.
          </p>
          
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="text-hotline font-bold">4.9/5</span>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill={i < 5 ? "#9b87f5" : "none"} className="text-hotline" />
                ))}
              </div>
              <span className="text-gray-400 text-sm">based on 10,000+ calls</span>
            </div>
          </div>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Testimonial 
            quote="The quality of conversation was amazing. Such attention to detail and genuine interest in what I had to say. Will definitely call again!"
            name="Alex K."
            position="Repeat Customer"
            className="lg:translate-y-4"
            rating={5}
          />
          
          <Testimonial 
            quote="I was nervous at first, but the talker made me feel so comfortable. Those 4 minutes felt like a genuine connection. Worth every penny."
            name="Jamie T."
            position="New Client"
            rating={5}
          />
          
          <Testimonial 
            quote="The extended call option is definitely the way to go. Just when the conversation was getting good, I still had 2 minutes left. Perfect!"
            name="Morgan P."
            position="Weekly Caller"
            className="lg:translate-y-4"
            rating={5}
          />
          
          <Testimonial 
            quote="I've tried other services before, but the quality of talkers here is on another level. Professional, attentive, and worth coming back to."
            name="Taylor B."
            position="Monthly Subscriber"
            rating={4}
          />
          
          <Testimonial 
            quote="The scheduling system is so convenient. I can book late at night for the next day and always get my preferred time slot."
            name="Jordan M."
            position="Regular Client"
            className="lg:translate-y-4"
            rating={5}
          />
          
          <Testimonial 
            quote="I was skeptical about how much could be accomplished in just 2 minutes, but I was blown away. Can't wait for my next call!"
            name="Riley S."
            position="First-time Caller"
            rating={5}
          />
        </div>
        
        <div className="mt-12 text-center">
          <div className="inline-block overflow-hidden mx-auto whitespace-nowrap">
            <div className="inline-flex animate-testimonial">
              {["Sam", "Robin", "Casey", "Jordan", "Quinn", "Taylor", "Riley", "Alex", "Morgan"].map((name, i) => (
                <div key={i} className="px-4 py-2 mx-2 bg-black/30 backdrop-blur-sm rounded-full text-sm flex items-center">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  <span>{name} just booked a call</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
