# SweetyOnCall Booking System

## Overview
SweetyOnCall is an AI-powered phone call booking system that connects users with AI companions for intimate conversations. The system provides a seamless experience from booking to call completion, with a focus on privacy, personalization, and 24/7 availability.

## System Architecture

### Frontend
The frontend is built with React, TypeScript, and Vite, featuring a modern, responsive design with the following key components:

#### Pages
- **Home Page (`/`)**: Single-page application with sections for:
  - Hero section with AI companion introduction
  - Pricing plans
  - Booking form
  - Testimonials
  - FAQ
- **Waiting Page (`/waiting`)**: Real-time status page while waiting for call
- **Booking Confirmation (`/booking-confirmation`)**: Success page after booking
- **404 Page**: Custom not found page

#### Key Components
- `BookingForm`: Core booking interface with form validation
- `PricingCards`: Display of available AI companion packages
- `Testimonials`: User testimonials and reviews
- `FAQ`: Frequently asked questions with accordion layout
- `Hero`: Main landing section with AI companion introduction
- `Navbar`: Navigation with links to main sections
- `Footer`: Site footer with additional links
- `Loading`: Loading spinner component
- `SEO`: SEO optimization component
- `JsonLd`: Structured data for search engines

### UI Framework
- Built with shadcn/ui components
- Custom theme with dark mode support
- Responsive design using Tailwind CSS
- Custom fonts:
  - Playfair Display
  - Montserrat
  - Cormorant Garamond

### Backend (Supabase)
The backend is powered by Supabase, providing both database and serverless functions.

#### Database Schema

1. **Users**
   - Basic user information (name, phone)
   - Authentication and identification

2. **Bookings**
   - Core booking information
   - Links to users and plans
   - Payment and status tracking
   - Status enum: pending, confirmed, completed, cancelled, failed, pending_payment, payment_failed, queued, initiating, calling

3. **Plans**
   - Different call packages
   - Pricing and duration information
   - Integration with payment systems
   - Plan types: free_trial, standard, extended, premium

4. **Active Calls**
   - Currently ongoing calls
   - Links to bookings and VAPI agents
   - Call status tracking

5. **Call Events**
   - Logging of call-related events
   - Tracking call progress
   - Event details in JSON format

6. **Call Queue**
   - Management of pending calls
   - Priority and scheduling
   - Retry mechanism
   - Agent assignment

7. **Payments**
   - Payment processing records
   - Integration with Cryptomus
   - Payment status tracking
   - Currency support

8. **VAPI Integration**
   - `vapi_accounts`: VAPI service accounts with API keys
   - `vapi_agents`: AI agents configuration
   - Concurrent call handling
   - Agent availability tracking

#### Edge Functions
1. `check-vapi-concurrency`: Verifies call capacity and agent availability
2. `initiate-vapi-call`: Starts new calls with VAPI
3. `process-call-queue`: Manages call queue and scheduling
4. `handle-vapi-webhook`: Processes VAPI events and updates call status
5. `create-stripe-checkout`: Handles payment processing
6. `check-payment-status`: Verifies payment status

## Key Features

### Booking Flow
1. User selects an AI companion package
2. Enters personal information
3. Processes payment through Cryptomus
4. Receives confirmation
5. Waits for scheduled call
6. Connects with AI companion

### Payment Processing
- Integration with Cryptomus
- Multiple plan options
- Secure payment handling
- Payment status tracking
- Support for multiple currencies

### Call Management
- Real-time call status
- Queue management with priority
- Agent assignment based on availability
- Call event logging
- Retry mechanism for failed calls

### AI Integration
- VAPI integration for AI calls
- Multiple agent types
- Concurrent call handling
- Call quality monitoring
- Agent availability tracking

## Technical Stack

### Frontend
- React 18
- TypeScript
- Vite
- React Query for data fetching
- React Router for navigation
- shadcn/ui components
- Tailwind CSS
- React Hook Form
- Zod for validation
- Sonner for toast notifications

### Backend
- Supabase
- PostgreSQL
- Edge Functions
- Real-time subscriptions
- JWT authentication

### External Services
- VAPI (Voice AI)
- Cryptomus (Payments)
- Stripe (Payment processing)

## Security Features
- JWT authentication
- Secure payment processing
- API key management
- Rate limiting
- CORS protection
- Environment variable protection

## Performance Optimizations
- Lazy loading of components
- Code splitting
- React Query caching
- Optimized database queries
- Real-time updates
- Image optimization
- Font optimization

## Monitoring and Logging
- Call event tracking
- Payment status monitoring
- Error logging
- Performance metrics
- Web Vitals monitoring

## Future Considerations
- Scalability improvements
- Additional payment methods
- Enhanced AI capabilities
- Extended analytics
- Mobile application
- Multi-language support
- Enhanced user profiles
- Call recording and playback
- Advanced scheduling options 