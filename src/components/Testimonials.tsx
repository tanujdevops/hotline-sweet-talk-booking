
import React, { memo } from 'react';
import { cn } from "@/lib/utils";
import { Star, Quote } from "@/components/ui/icons";

type TestimonialProps = {
  quote: string;
  name: string;
  position?: string;
  className?: string;
  rating?: number;
  avatar?: string;
};

const Testimonial = memo(({ quote, name, position, className, rating = 5, avatar }: TestimonialProps) => (
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
));

const Testimonials = () => {
  return (
    <section className="py-20 px-4 bg-gradient-to-b from-black/90 via-black/60 to-background relative overflow-hidden">
      <div className="absolute inset-0 bg-sensual-gradient opacity-40"></div>
      
      <div className="container mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">What Our <span className="text-hotline bg-gradient-to-r from-hotline to-hotline-pink bg-clip-text text-transparent">Clients</span> Say</h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Experience the satisfaction our AI companions deliver.
          </p>
          
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="text-hotline font-bold">4.9/5</span>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill={i < 5 ? "#9b87f5" : "none"} className="text-hotline" />
                ))}
              </div>
              <span className="text-gray-400 text-sm">10,000+ satisfied clients</span>
            </div>
          </div>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Testimonial 
            quote="The AI companion was incredibly engaging and made me feel genuinely heard. Perfect conversation quality!"
            name="Alex K."
            position="Regular Client"
            rating={5}
          />
          
          <Testimonial 
            quote="Amazing experience! The AI understood exactly what I needed. Those 4 minutes felt like pure connection."
            name="Jamie T."
            position="Premium Member"
            rating={5}
          />
          
          <Testimonial 
            quote="Best AI conversation service I've tried. Professional, responsive, and available whenever I need it."
            name="Morgan P."
            position="VIP Client"
            className="lg:translate-y-4"
            rating={5}
          />
        </div>
      </div>
    </section>
  );
};

export default memo(Testimonials);
