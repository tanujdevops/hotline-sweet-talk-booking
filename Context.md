# SweetyOnCall - Comprehensive Technical Documentation

## Overview
SweetyOnCall is a production-ready AI-powered phone call booking system that connects users with AI companions for intimate conversations. The system provides a seamless experience from booking to call completion, with a focus on privacy, personalization, and 24/7 availability. The application is built to handle high traffic volumes with robust error handling, security measures, and scalable architecture.

## System Architecture

### Frontend (React + TypeScript + Vite)
The frontend is a modern single-page application built with React 18, TypeScript, and Vite for optimal performance and developer experience.

#### Core Technologies
- **React 18**: Component-based UI with hooks and modern patterns
- **TypeScript**: Type safety and enhanced developer experience
- **Vite**: Fast build tool and development server
- **React Query (@tanstack/react-query)**: Server state management and caching
- **React Router DOM**: Client-side routing and navigation
- **React Hook Form**: Form handling with validation
- **Zod**: Runtime type validation and schema validation
- **Sonner**: Toast notifications and user feedback

#### Pages and Routing
- **Home Page (`/`)**: Single-page application with sections:
  - Hero section with AI companion introduction
  - Pricing plans display
  - Booking form with real-time validation
  - Customer testimonials
  - FAQ section with accordion layout
- **Waiting Page (`/waiting`)**: Real-time booking status with live updates
- **Booking Confirmation (`/booking-confirmation`)**: Success page after booking
- **404 Page**: Custom not found page with navigation

#### Key Components
- **BookingForm**: Core booking interface with comprehensive form validation, phone input, email validation, and pricing tier selection
- **PricingCards**: Interactive display of AI companion packages with hover effects
- **Testimonials**: Customer testimonials with ratings and reviews
- **FAQ**: Accordion-style frequently asked questions
- **Hero**: Main landing section with call-to-action buttons
- **Navbar**: Responsive navigation with smooth scrolling
- **Footer**: Site footer with links and contact information
- **Loading**: Loading spinner with branded styling
- **SEO**: SEO optimization component with meta tags
- **JsonLd**: Structured data for search engines

#### UI Framework and Design
- **shadcn/ui**: Modern component library with Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **Custom Theme**: Dark mode support with hotline brand colors
- **Responsive Design**: Mobile-first approach with breakpoints
- **Custom Fonts**:
  - Playfair Display (headings)
  - Montserrat (body text)
  - Cormorant Garamond (decorative)
- **Animations**: CSS animations, hover states, and micro-interactions
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support

### Backend (Supabase)
The backend is powered by Supabase, providing PostgreSQL database, real-time subscriptions, edge functions, and authentication.

#### Database Schema

**Core Tables:**

1. **users**
   - `id` (uuid, primary key): Unique user identifier
   - `name` (text): User's full name with validation
   - `phone` (text, unique): Phone number in E.164 format
   - `email` (text, nullable): Email address with format validation
   - `created_at` (timestamptz): Account creation timestamp
   - `last_free_trial` (timestamptz): Last free trial usage for eligibility

2. **plans**
   - `id` (integer, primary key): Plan identifier
   - `key` (plan_key enum): Plan type (free_trial, standard, extended, premium)
   - `price_cents` (integer): Price in cents for payment processing
   - `duration_seconds` (integer): Call duration in seconds
   - `vapi_assistant_id` (uuid): Associated VAPI assistant for AI calls

3. **bookings**
   - `id` (uuid, primary key): Unique booking identifier
   - `user_id` (uuid, foreign key): Reference to users table
   - `plan_id` (integer, foreign key): Reference to plans table
   - `status` (booking_status enum): Current booking state
   - `payment_status` (text): Payment processing status
   - `payment_intent_id` (text): Stripe payment intent reference
   - `payment_amount` (integer): Amount paid in cents
   - `call_duration` (integer): Actual call duration
   - `vapi_call_id` (uuid): VAPI call identifier
   - `message` (text): User's special requests
   - `error_message` (text): Error details for failed bookings
   - `created_at` (timestamptz): Booking creation time

4. **active_calls**
   - `booking_id` (uuid, primary key): Reference to bookings
   - `started_at` (timestamptz): Call start time
   - `vapi_call_id` (uuid): VAPI call identifier
   - `vapi_agent_id` (uuid): Assigned VAPI agent
   - `vapi_account_id` (uuid): VAPI account handling the call

5. **call_queue**
   - `id` (uuid, primary key): Queue item identifier
   - `booking_id` (uuid, foreign key): Reference to bookings
   - `plan_type` (text): Plan type for agent assignment
   - `priority` (integer): Queue priority (1 = highest)
   - `status` (text): Queue status (queued, processing, assigned, failed)
   - `assigned_agent_id` (uuid): Assigned agent for processing
   - `assigned_account_id` (uuid): Assigned account for processing
   - `retry_count` (integer): Number of retry attempts
   - `max_retries` (integer): Maximum retry attempts allowed
   - `scheduled_for` (timestamptz): Scheduled processing time
   - `created_at` / `updated_at` (timestamptz): Timestamps

6. **call_events** (Partitioned by month)
   - `id` (bigint, primary key): Event identifier
   - `booking_id` (uuid, foreign key): Reference to bookings
   - `event_time` (timestamptz): Event timestamp
   - `event_type` (text): Type of event (call_initiated, status_update, etc.)
   - `details` (jsonb): Event details and metadata
   - `events` (jsonb): Array of related events

7. **payments**
   - `id` (integer, primary key): Payment identifier
   - `booking_id` (uuid, foreign key): Reference to bookings
   - `amount_cents` (integer): Payment amount in cents
   - `currency` (text): Payment currency
   - `status` (text): Payment status
   - `cryptomus_invoice_id` (text): Cryptomus payment reference
   - `created_at` (timestamptz): Payment creation time

8. **vapi_accounts**
   - `id` (uuid, primary key): Account identifier
   - `name` (text): Account name for identification
   - `api_key` (text): VAPI API key (encrypted via Supabase Vault)
   - `vault_secret_name` (text): Reference to encrypted API key
   - `phone_number_id` (uuid): VAPI phone number for calls
   - `max_concurrent_calls` (integer): Maximum concurrent calls allowed
   - `current_active_calls` (integer): Current active call count
   - `is_active` (boolean): Account availability status

9. **vapi_agents**
   - `id` (uuid, primary key): Agent identifier
   - `vapi_account_id` (uuid, foreign key): Reference to vapi_accounts
   - `agent_id` (uuid): VAPI agent identifier
   - `agent_type` (text): Agent type (free_trial, standard, extended, premium)
   - `max_concurrent_calls` (integer): Agent call capacity
   - `current_active_calls` (integer): Current active calls
   - `is_active` (boolean): Agent availability
   - `priority` (integer): Agent priority for assignment

**Enums:**
- `booking_status`: pending, confirmed, completed, cancelled, failed, pending_payment, payment_failed, queued, initiating, calling
- `plan_key`: free_trial, standard, extended, premium

#### Edge Functions

1. **check-vapi-concurrency**
   - **Purpose**: Validates VAPI account capacity before call initiation
   - **Input**: Optional plan type and booking ID
   - **Output**: Availability status and queue position
   - **Logic**: Checks current active calls against maximum capacity

2. **initiate-vapi-call**
   - **Purpose**: Initiates AI calls through VAPI API
   - **Input**: Booking ID, phone number, customer name
   - **Process**: 
     - Validates free trial eligibility for free_trial bookings
     - Checks account concurrency limits
     - Increments call counters
     - Makes VAPI API request
     - Records active call in database
     - Updates booking status to 'calling'
   - **Error Handling**: Comprehensive cleanup on failures

3. **process-call-queue**
   - **Purpose**: Processes queued calls when capacity becomes available
   - **Trigger**: Cron job every minute + manual invocation
   - **Process**:
     - Fetches queued calls by priority
     - Validates booking status
     - Assigns available agents
     - Initiates VAPI calls
     - Handles retry logic with exponential backoff
   - **Concurrency**: Processes up to 50 calls per execution

4. **handle-vapi-webhook**
   - **Purpose**: Processes VAPI webhook events for call status updates
   - **Security**: Webhook signature validation with HMAC-SHA256
   - **Rate Limiting**: 100 requests per minute per client
   - **Events Handled**:
     - Call status updates
     - Call end events with cleanup
     - Error events with logging
   - **Actions**: Updates booking status, records events, triggers queue processing

5. **create-stripe-checkout**
   - **Purpose**: Creates Stripe checkout sessions for payment processing
   - **Input**: Booking ID
   - **Process**:
     - Validates user email requirement
     - Creates or finds Stripe customer
     - Generates checkout session with metadata
     - Updates booking with payment intent ID
   - **Security**: CORS restrictions and input validation

6. **stripe-webhook**
   - **Purpose**: Handles Stripe payment webhook events
   - **Security**: Stripe signature validation
   - **Events**:
     - `checkout.session.completed`: Marks payment complete, queues booking
     - `payment_intent.succeeded`: Updates payment status
     - `payment_intent.payment_failed`: Marks payment failed
   - **Actions**: Automatically initiates calls after successful payment

7. **check-payment-status**
   - **Purpose**: Verifies payment status with Stripe API
   - **Input**: Booking ID
   - **Output**: Current payment status and amount
   - **Use Case**: Manual payment verification and status synchronization

8. **check-call-durations**
   - **Purpose**: Monitors and completes calls that exceed duration limits
   - **Trigger**: Cron job for automated cleanup
   - **Process**: Identifies long-running calls and marks them complete

#### RPC Functions (Database Functions)

1. **upsert_user**
   - **Purpose**: Atomically creates or updates user records
   - **Parameters**: name, email, phone
   - **Returns**: User ID
   - **Logic**: Prevents race conditions in user creation

2. **check_free_trial_eligibility**
   - **Purpose**: Validates free trial usage within 24-hour window
   - **Parameters**: user_id
   - **Returns**: Boolean eligibility status
   - **Logic**: Checks last_free_trial timestamp

3. **update_last_free_trial**
   - **Purpose**: Updates user's last free trial timestamp
   - **Parameters**: user_id
   - **Effect**: Sets last_free_trial to current timestamp

4. **increment_call_count** / **safe_decrement_call_count**
   - **Purpose**: Thread-safe call counter management
   - **Parameters**: agent_uuid, account_uuid
   - **Logic**: Atomic increment/decrement with bounds checking

5. **get_available_agent**
   - **Purpose**: Finds available agents for specific plan types
   - **Parameters**: plan_type_param
   - **Returns**: Agent details with API keys and phone numbers
   - **Logic**: Checks capacity and returns highest priority available agent

6. **handle_call_end**
   - **Purpose**: Comprehensive call cleanup in single transaction
   - **Parameters**: booking_id, call_id, agent_id, account_id, ended_reason
   - **Actions**: Updates booking status, removes active call, decrements counters

7. **cleanup_inactive_call**
   - **Purpose**: Cleans up failed or stale calls
   - **Parameters**: booking_id, status, error_message
   - **Actions**: Updates booking, removes active call, decrements counters

#### Real-time Features
- **Supabase Realtime**: Live booking status updates on waiting page
- **WebSocket Subscriptions**: Real-time database change notifications
- **Polling Fallback**: 5-second intervals for status updates

#### Cron Jobs (pg_cron)
- **Queue Processing**: Every minute via `process_queue_cron()`
- **Cleanup Tasks**: Hourly via `cleanup_stale_queue()`
- **Call Duration Monitoring**: Automated call completion checking

### External Service Integrations

#### VAPI (Voice AI Platform)
- **Purpose**: AI-powered voice calls with natural conversation
- **Integration**: RESTful API with webhook callbacks
- **Features**:
  - Multiple agent types for different plan tiers
  - Concurrent call management with capacity limits
  - Real-time call status updates via webhooks
  - Assistant assignment based on plan selection
- **Security**: API key encryption via Supabase Vault
- **Scalability**: Single account with 9 concurrent call limit

#### Stripe (Payment Processing)
- **Purpose**: Secure payment processing for paid plans
- **Integration**: Checkout sessions and webhook events
- **Features**:
  - Customer management with email-based identification
  - Payment intent tracking with metadata
  - Automatic call initiation after successful payment
  - Comprehensive error handling for failed payments
- **Security**: Webhook signature validation and HTTPS enforcement

#### Supabase Vault
- **Purpose**: Secure storage of sensitive API keys
- **Usage**: VAPI API keys encrypted at rest
- **Access**: Service role functions for key retrieval
- **Security**: Encryption with automatic key rotation support

## Key Features

### Booking Flow
1. **User Selection**: Choose from free trial, essential, or deluxe packages
2. **Form Submission**: Name, email, phone, and special requests with validation
3. **Payment Processing**: Stripe checkout for paid plans, immediate processing for free trials
4. **Free Trial Validation**: 24-hour cooldown period enforcement
5. **Queue Management**: Automatic queuing when agents are at capacity
6. **Call Initiation**: Immediate connection when agents are available
7. **Status Tracking**: Real-time updates throughout the process

### Payment Processing
- **Stripe Integration**: Secure checkout sessions with customer management
- **Multiple Currencies**: USD support with cent-based pricing
- **Payment Status Tracking**: Real-time status updates and webhook processing
- **Error Handling**: Comprehensive error recovery and user notification
- **Automatic Call Initiation**: Seamless transition from payment to call

### Call Management
- **Real-time Status Updates**: Live booking status via Supabase Realtime
- **Queue Management**: Priority-based queue with retry mechanisms
- **Agent Assignment**: Intelligent agent selection based on availability and plan type
- **Call Event Logging**: Comprehensive event tracking for debugging and analytics
- **Retry Mechanisms**: Exponential backoff for failed call attempts
- **Capacity Management**: Thread-safe concurrent call counting

### AI Integration
- **VAPI Integration**: Advanced AI voice assistants for natural conversations
- **Multiple Agent Types**: Specialized agents for different plan tiers
- **Concurrent Call Handling**: Up to 9 simultaneous calls per account
- **Call Quality Monitoring**: Real-time status updates and error tracking
- **Agent Availability Tracking**: Dynamic capacity management

## Technical Stack

### Frontend
- **React 18**: Modern component-based UI framework
- **TypeScript**: Type safety and enhanced developer experience
- **Vite**: Fast build tool and development server
- **React Query**: Server state management and caching
- **React Router**: Client-side routing and navigation
- **React Hook Form**: Form handling with validation
- **Zod**: Runtime type validation
- **shadcn/ui**: Modern component library
- **Tailwind CSS**: Utility-first CSS framework
- **Sonner**: Toast notifications

### Backend
- **Supabase**: Backend-as-a-Service platform
- **PostgreSQL**: Relational database with advanced features
- **Edge Functions**: Serverless functions for business logic
- **Real-time Subscriptions**: Live data updates
- **JWT Authentication**: Secure user authentication
- **pg_cron**: Automated task scheduling

### External Services
- **VAPI**: AI voice conversation platform
- **Stripe**: Payment processing and customer management
- **Vercel**: Frontend hosting and deployment
- **Supabase Vault**: Secure API key storage

## Security Features

### Authentication & Authorization
- **JWT Authentication**: Secure token-based authentication
- **Service Role Access**: Elevated permissions for backend operations
- **API Key Management**: Encrypted storage via Supabase Vault

### Payment Security
- **Stripe Integration**: PCI-compliant payment processing
- **Webhook Signature Validation**: HMAC-SHA256 verification
- **HTTPS Enforcement**: All communications encrypted in transit

### API Security
- **CORS Protection**: Restricted cross-origin requests
- **Rate Limiting**: 100 requests per minute for webhooks
- **Input Validation**: Comprehensive data validation and sanitization
- **Environment Variable Protection**: Sensitive data in environment variables

### Data Protection
- **Encrypted API Keys**: Supabase Vault for sensitive credentials
- **Secure Headers**: CSP, HSTS, and other security headers
- **No Sensitive Logging**: PII and credentials excluded from logs

## Performance Optimizations

### Frontend Performance
- **Lazy Loading**: Code splitting for components and routes
- **React Query Caching**: Intelligent server state caching
- **Image Optimization**: Optimized loading and formats
- **Font Optimization**: Preloaded web fonts
- **Bundle Splitting**: Separate chunks for better caching

### Backend Performance
- **Optimized Database Queries**: Efficient indexing and query patterns
- **Connection Pooling**: Database connection management
- **Real-time Updates**: WebSocket connections for live data
- **Caching Strategies**: Query result caching where appropriate

### Database Optimizations
- **Proper Indexing**: Strategic indexes for query performance
- **Partitioned Tables**: Monthly partitioning for call_events
- **Atomic Operations**: RPC functions for thread-safe operations
- **Connection Pooling**: Efficient database connection management

## Monitoring and Logging

### Application Monitoring
- **Call Event Tracking**: Comprehensive event logging for all call activities
- **Payment Status Monitoring**: Real-time payment processing tracking
- **Error Logging**: Structured error logging with context
- **Performance Metrics**: Response times and success rates

### System Health
- **Database Health**: Connection and query performance monitoring
- **External Service Status**: VAPI and Stripe integration monitoring
- **Queue Processing**: Queue length and processing time tracking
- **Capacity Monitoring**: Real-time call capacity and utilization

### Analytics
- **User Journey Tracking**: Booking flow completion rates
- **Conversion Metrics**: Payment success and call completion rates
- **Error Analysis**: Failed booking and call analysis
- **Performance Insights**: System bottleneck identification

## Scalability Considerations

### Current Limitations
- **Single VAPI Account**: 9 concurrent call limit
- **Queue-based Scaling**: Automatic queuing when at capacity
- **Manual Scaling**: Additional VAPI accounts require manual setup

### Future Scalability
- **Multi-Account Support**: Infrastructure ready for multiple VAPI accounts
- **Load Balancing**: Agent assignment across multiple accounts
- **Horizontal Scaling**: Edge functions scale automatically
- **Database Scaling**: PostgreSQL with read replicas support

### Performance Targets
- **Payment Success Rate**: >99%
- **Call Connection Rate**: >95%
- **Average Queue Wait**: <5 minutes
- **System Uptime**: >99.9%

## Development and Deployment

### Development Environment
- **Local Development**: Vite dev server with hot reload
- **Type Safety**: Full TypeScript coverage
- **Code Quality**: ESLint and Prettier configuration
- **Testing**: Component and integration testing setup

### Production Deployment
- **Frontend**: Vercel with automatic deployments
- **Backend**: Supabase managed infrastructure
- **Environment Variables**: Secure configuration management
- **Database Migrations**: Version-controlled schema changes

### CI/CD Pipeline
- **Automated Testing**: Pre-deployment validation
- **Database Migrations**: Automatic schema updates
- **Environment Promotion**: Staging to production workflow
- **Rollback Procedures**: Quick rollback capabilities

This comprehensive technical documentation provides a complete overview of the SweetyOnCall application architecture, implementation details, and operational considerations. The system is designed for reliability, security, and scalability while maintaining excellent user experience and performance.