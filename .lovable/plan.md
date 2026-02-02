
# Voice Agent Call Center
## Enterprise-Grade AI-Powered Maintenance Request System

---

## Executive Overview

This feature transforms how residents and tenants report maintenance issues by implementing an **ElevenLabs Conversational AI Voice Agent** that:
- Answers phone calls 24/7
- Collects detailed maintenance request information through natural conversation
- Automatically creates tickets in the system
- Assigns tickets to maintenance supervisors
- Provides callers with a reference number
- Enables full lifecycle tracking with notes and resolution

---

## System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VOICE AGENT CALL CENTER                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INBOUND CALL                    VOICE AGENT                   SYSTEM      │
│  ┌──────────────┐     ┌────────────────────────────┐     ┌────────────────┐│
│  │  Caller      │────▶│  ElevenLabs Conversational │────▶│  maintenance_  ││
│  │  (Resident)  │◀────│  AI Agent                  │     │  requests      ││
│  └──────────────┘     │                            │     │  (new table)   ││
│                       │  - Knowledge Base          │     └────────────────┘│
│                       │  - Property Lookup         │            │          │
│                       │  - Issue Classification    │            ▼          │
│                       │  - Urgency Detection       │     ┌────────────────┐│
│                       │  - Ticket Creation         │     │  notifications ││
│                       └────────────────────────────┘     │  (supervisor)  ││
│                                                          └────────────────┘│
│                                                                             │
│  ADMIN DASHBOARD                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  Voice Agent Console                                                    ││
│  │  - Live call monitoring                                                 ││
│  │  - Call transcripts & recordings                                        ││
│  │  - Ticket queue management                                              ││
│  │  - Analytics & reporting                                                ││
│  │  - Knowledge base editor                                                ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  SUPERVISOR WORKFLOW                                                        │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│  │  New     │──▶│  Review  │──▶│  Assign  │──▶│  Work    │──▶│  Close   │ │
│  │  Ticket  │   │  Request │   │  Tech    │   │  Complete│   │  Ticket  │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘ │
│      ▲                                                            │        │
│      │                    OPTIONAL CALLBACK                       │        │
│      └────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### New Table: `maintenance_requests`

Central table for voice-initiated maintenance requests:

```sql
CREATE TABLE maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ticket Identification
  ticket_number SERIAL UNIQUE,  -- Auto-generated: MR-0001, MR-0002...
  
  -- Caller Information
  caller_name TEXT NOT NULL,
  caller_phone TEXT NOT NULL,
  caller_email TEXT,
  caller_unit_number TEXT,
  
  -- Property Mapping
  property_id UUID REFERENCES properties(id),
  unit_id UUID REFERENCES units(id),
  
  -- Issue Details (collected by voice agent)
  issue_category TEXT NOT NULL,  -- plumbing, electrical, hvac, appliance, etc.
  issue_subcategory TEXT,
  issue_description TEXT NOT NULL,
  issue_location TEXT,  -- kitchen, bathroom, bedroom, etc.
  
  -- Urgency & Priority
  urgency_level TEXT DEFAULT 'normal',  -- emergency, urgent, normal, low
  is_emergency BOOLEAN DEFAULT false,
  
  -- Availability
  preferred_contact_time TEXT,
  preferred_access_time TEXT,
  has_pets BOOLEAN DEFAULT false,
  special_access_instructions TEXT,
  
  -- Voice Agent Data
  call_id TEXT,  -- ElevenLabs conversation ID
  call_duration_seconds INTEGER,
  call_transcript TEXT,
  call_recording_url TEXT,
  call_started_at TIMESTAMPTZ,
  call_ended_at TIMESTAMPTZ,
  
  -- Workflow Status
  status TEXT DEFAULT 'new',
  -- new → reviewed → assigned → in_progress → completed → closed
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES auth.users(id),
  
  -- Resolution
  resolution_notes TEXT,
  resolution_photos TEXT[],
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  
  -- Work Order Link (optional)
  work_order_id UUID REFERENCES work_orders(id),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Policies (supervisors and admins can manage)
CREATE POLICY "Users can view requests for assigned properties"
ON maintenance_requests FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can create requests"
ON maintenance_requests FOR INSERT
WITH CHECK (true);  -- Edge function uses service role

CREATE POLICY "Assigned users and admins can update"
ON maintenance_requests FOR UPDATE
USING (
  auth.uid() = assigned_to OR
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'project_manager')
);
```

### New Table: `voice_agent_config`

Configuration for the voice agent:

```sql
CREATE TABLE voice_agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),  -- NULL = global default
  
  -- Agent Personality
  agent_name TEXT DEFAULT 'Alex',
  greeting_message TEXT,
  closing_message TEXT,
  
  -- Business Hours
  business_hours_start TIME DEFAULT '08:00',
  business_hours_end TIME DEFAULT '18:00',
  after_hours_message TEXT,
  
  -- Emergency Keywords
  emergency_keywords TEXT[] DEFAULT ARRAY['flood', 'fire', 'gas leak', 'no heat', 'no water', 'broken window', 'security'],
  
  -- Issue Categories
  issue_categories JSONB DEFAULT '[
    {"id": "plumbing", "label": "Plumbing", "subcategories": ["leak", "clog", "toilet", "faucet", "water heater"]},
    {"id": "electrical", "label": "Electrical", "subcategories": ["outlet", "light", "breaker", "switch"]},
    {"id": "hvac", "label": "Heating/Cooling", "subcategories": ["no heat", "no ac", "thermostat", "noise"]},
    {"id": "appliance", "label": "Appliances", "subcategories": ["refrigerator", "stove", "dishwasher", "washer", "dryer"]},
    {"id": "structural", "label": "Structural", "subcategories": ["door", "window", "lock", "floor", "ceiling"]},
    {"id": "pest", "label": "Pest Control", "subcategories": ["insects", "rodents", "wildlife"]},
    {"id": "other", "label": "Other", "subcategories": []}
  ]',
  
  -- Knowledge Base
  knowledge_base JSONB DEFAULT '[]',  -- FAQ entries
  
  -- Notification Settings
  supervisor_notification_emails TEXT[],
  emergency_notification_phone TEXT,
  
  -- Analytics
  calls_handled INTEGER DEFAULT 0,
  avg_call_duration_seconds INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(property_id)
);
```

### New Table: `maintenance_request_activity`

Activity log for request lifecycle:

```sql
CREATE TABLE maintenance_request_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE maintenance_request_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity"
ON maintenance_request_activity FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert activity"
ON maintenance_request_activity FOR INSERT
WITH CHECK (true);
```

---

## ElevenLabs Agent Configuration

### Agent Prompt (System Instructions)

```text
You are Alex, a friendly and professional maintenance request assistant for 
Glorieta Gardens property management. Your job is to help residents report 
maintenance issues quickly and accurately.

## Your Goals:
1. Greet the caller warmly
2. Collect their name and unit number
3. Understand the maintenance issue in detail
4. Assess urgency (emergency vs. routine)
5. Gather contact preferences
6. Provide a ticket number and expected response time

## Conversation Flow:

1. GREETING:
   "Thank you for calling Glorieta Gardens maintenance. This is Alex, your 
   virtual assistant. I can help you report a maintenance issue 24/7. 
   May I have your name please?"

2. UNIT VERIFICATION:
   "Thank you, [Name]. What unit number are you calling about?"

3. ISSUE COLLECTION:
   "What maintenance issue are you experiencing today?"
   
   Follow-up questions based on category:
   - "Where in the unit is this happening?"
   - "When did you first notice this issue?"
   - "Is water/gas/electricity involved?"
   - "Is this affecting other units?"

4. URGENCY ASSESSMENT:
   For emergencies (flooding, gas smell, fire, no heat in winter, security breach):
   "This sounds like an emergency. I'm flagging this as urgent and our 
   on-call technician will be notified immediately."
   
   For routine:
   "Thank you for the details. This will be reviewed by our maintenance 
   team within 24 hours."

5. CONTACT PREFERENCES:
   "What's the best phone number to reach you?"
   "What times work best for a technician to access your unit?"
   "Do you have any pets we should know about?"

6. CONFIRMATION:
   "I've created maintenance ticket [NUMBER] for your [ISSUE TYPE] issue 
   in unit [UNIT]. You'll receive a text confirmation shortly, and our 
   team will contact you within [TIMEFRAME]. Is there anything else I 
   can help you with?"

## Emergency Keywords:
ALWAYS flag as emergency if caller mentions:
- Flood, flooding, water everywhere
- Fire, smoke, burning smell
- Gas leak, gas smell
- No heat (in cold weather)
- No water
- Broken lock, security concern
- Broken window

## Personality:
- Professional but warm
- Patient and understanding
- Clear and concise
- Empathetic to frustration
- Always provide next steps
```

### Client Tools Configuration

The voice agent will have access to these tools to interact with our system:

```typescript
const agentTools = [
  {
    type: "function",
    name: "lookup_property",
    description: "Look up property information by name or address",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Property name or address" }
      },
      required: ["query"]
    }
  },
  {
    type: "function", 
    name: "verify_unit",
    description: "Verify if a unit exists at a property",
    parameters: {
      type: "object",
      properties: {
        property_id: { type: "string" },
        unit_number: { type: "string" }
      },
      required: ["property_id", "unit_number"]
    }
  },
  {
    type: "function",
    name: "create_maintenance_request",
    description: "Create a new maintenance request ticket",
    parameters: {
      type: "object",
      properties: {
        caller_name: { type: "string" },
        caller_phone: { type: "string" },
        unit_number: { type: "string" },
        property_id: { type: "string" },
        issue_category: { type: "string" },
        issue_description: { type: "string" },
        issue_location: { type: "string" },
        urgency_level: { type: "string", enum: ["emergency", "urgent", "normal", "low"] },
        preferred_contact_time: { type: "string" },
        has_pets: { type: "boolean" },
        special_instructions: { type: "string" }
      },
      required: ["caller_name", "caller_phone", "issue_category", "issue_description", "urgency_level"]
    }
  },
  {
    type: "function",
    name: "get_ticket_number",
    description: "Get the ticket number for the created request",
    parameters: {
      type: "object",
      properties: {
        request_id: { type: "string" }
      },
      required: ["request_id"]
    }
  }
];
```

---

## Edge Functions

### 1. `voice-agent-token` - Generate Conversation Token

Generates a WebRTC token for establishing voice connection:

```typescript
// supabase/functions/voice-agent-token/index.ts

// Returns a conversation token for the ElevenLabs agent
// Called when a user initiates a voice call from the web interface
```

### 2. `voice-agent-webhook` - Handle Agent Events

Receives webhooks from ElevenLabs when calls complete:

```typescript
// supabase/functions/voice-agent-webhook/index.ts

// Receives:
// - Call started/ended events
// - Transcripts
// - Tool call results (ticket creation)
// - Recording URLs

// Actions:
// - Updates maintenance_requests with call data
// - Sends notifications to supervisors
// - Logs activity
```

### 3. `voice-agent-tools` - Handle Tool Calls

Processes tool calls from the voice agent:

```typescript
// supabase/functions/voice-agent-tools/index.ts

// Handles:
// - lookup_property: Search properties by name/address
// - verify_unit: Check if unit exists
// - create_maintenance_request: Insert new request
// - get_ticket_number: Return formatted ticket number
```

---

## UI Components

### File Structure

```text
src/
├── pages/
│   └── voice-agent/
│       └── VoiceAgentDashboard.tsx    # Main console page
├── components/
│   └── voice-agent/
│       ├── VoiceAgentWidget.tsx       # Embeddable call widget
│       ├── CallInterface.tsx          # Active call UI
│       ├── RequestQueue.tsx           # Pending requests list
│       ├── RequestDetailSheet.tsx     # Full request details
│       ├── CallTranscript.tsx         # View transcript
│       ├── AgentConfigDialog.tsx      # Admin configuration
│       ├── KnowledgeBaseEditor.tsx    # FAQ management
│       ├── VoiceAgentStats.tsx        # Analytics cards
│       └── EmergencyAlertBanner.tsx   # Emergency request alert
├── hooks/
│   └── useMaintenanceRequests.ts      # CRUD operations
│   └── useVoiceAgentConfig.ts         # Config management
│   └── useVoiceAgent.ts               # ElevenLabs integration
```

---

## UI Design Specifications

### 1. Voice Agent Dashboard

Premium enterprise console for managing voice-initiated requests:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  🎧 Voice Agent Console                                    [Configure Agent]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌────────────┐│
│  │  📞 Total Calls │ │  🔴 Emergency   │ │  ⏳ Pending     │ │ ✅ Resolved││
│  │      247       │ │       3        │ │      12        │ │     156    ││
│  │  This Month    │ │  Need Action   │ │  Awaiting      │ │  This Week ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ └────────────┘│
│                                                                             │
│  🚨 EMERGENCY REQUESTS                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  MR-0247  Unit 412  Water leak flooding kitchen    [ASSIGN NOW]         ││
│  │  Caller: Maria Garcia • 5 min ago • No assignment yet                   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  Recent Requests                                          [View All] [Filter]│
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  MR-0246  Unit 205  HVAC not working         Normal   New       2h ago ││
│  │  MR-0245  Unit 118  Clogged sink             Normal   Assigned  4h ago ││
│  │  MR-0244  Unit 301  Light fixture broken     Low      Completed 1d ago ││
│  │  MR-0243  Unit 210  Dishwasher not draining  Normal   Closed    1d ago ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌────────────────────────────┐  ┌────────────────────────────────────────┐│
│  │  📊 Call Analytics         │  │  🎤 Test Voice Agent                   ││
│  │                            │  │                                        ││
│  │  [Chart: Calls by day]     │  │  ┌────────────────────────────────┐   ││
│  │                            │  │  │  🎧 Start Test Call           │   ││
│  │  Avg Duration: 3m 24s      │  │  │  Try the voice agent yourself │   ││
│  │  Resolution Rate: 94%      │  │  └────────────────────────────────┘   ││
│  └────────────────────────────┘  └────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Request Detail Sheet

Full lifecycle management for each request:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back                                                                     │
│                                                                             │
│  MR-0247                                              🔴 EMERGENCY          │
│  Water leak flooding kitchen                                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ STATUS: New → Reviewed → Assigned → In Progress → Completed → Closed   ││
│  │              ●                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌───────────────────────────────┐  ┌─────────────────────────────────────┐│
│  │  CALLER INFORMATION          │  │  ISSUE DETAILS                      ││
│  │  Name: Maria Garcia          │  │  Category: Plumbing                 ││
│  │  Phone: (555) 123-4567       │  │  Location: Kitchen                  ││
│  │  Unit: 412                   │  │  Description: Water is coming from  ││
│  │  Property: Glorieta Gardens  │  │  under the sink and flooding the    ││
│  │                              │  │  kitchen floor. Already turned off  ││
│  │  AVAILABILITY                │  │  the water valve under sink.        ││
│  │  Best time: Anytime (urgent) │  │                                     ││
│  │  Has pets: Yes (dog)         │  │  Urgency: Emergency                 ││
│  └───────────────────────────────┘  └─────────────────────────────────────┘│
│                                                                             │
│  CALL TRANSCRIPT                                          [Play Recording] │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  Alex: Thank you for calling Glorieta Gardens maintenance...           ││
│  │  Caller: Hi, I have water flooding my kitchen!                         ││
│  │  Alex: I understand this is urgent. Can you tell me...                 ││
│  │  [Full transcript...]                                                   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ASSIGNMENT                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  Assign to: [Select Technician ▼]                                       ││
│  │                                                                         ││
│  │  [Convert to Work Order]  [Add Notes]  [Mark Resolved]                  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ACTIVITY LOG                                                               │
│  • 5 min ago - Request created via voice agent                             │
│  • 5 min ago - Emergency flag triggered (keyword: flooding)                │
│  • 5 min ago - Supervisor notification sent                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3. Embeddable Call Widget

For resident portal or property website:

```text
┌────────────────────────────────────┐
│                                    │
│  🎧 Report Maintenance Issue       │
│                                    │
│  ┌────────────────────────────────┐│
│  │                                ││
│  │  ╭────────────────────────╮   ││
│  │  │   🎤 SPEAK NOW         │   ││
│  │  │                        │   ││
│  │  │   "Describe your       │   ││
│  │  │    maintenance issue"  │   ││
│  │  │                        │   ││
│  │  ╰────────────────────────╯   ││
│  │                                ││
│  │  [End Call]  ○○○ Active        ││
│  └────────────────────────────────┘│
│                                    │
│  Powered by Glorieta Gardens       │
└────────────────────────────────────┘
```

---

## Notification Flow

### Immediate Notifications

1. **Emergency Requests**:
   - Push notification to all supervisors
   - Email to emergency contact list
   - SMS to on-call technician (if configured)
   - Banner alert on dashboard

2. **Standard Requests**:
   - Email notification to designated supervisor
   - Dashboard queue update
   - Daily summary digest

### Caller Notifications

1. **Confirmation SMS** (via Resend or Twilio):
   ```
   Glorieta Gardens: Your maintenance request MR-0247 has been received.
   Issue: Water leak in kitchen
   Expected response: Within 24 hours for emergencies, 48 hours for routine.
   Questions? Call (555) 000-0000
   ```

2. **Status Updates**:
   - When technician assigned
   - When work completed
   - Request for confirmation of resolution

---

## Implementation Phases

### Phase 1: Database & Core Infrastructure
1. Create `maintenance_requests` table with RLS
2. Create `voice_agent_config` table
3. Create `maintenance_request_activity` table
4. Create hooks: `useMaintenanceRequests`, `useVoiceAgentConfig`

### Phase 2: ElevenLabs Agent Setup
1. Create `voice-agent-token` edge function
2. Create `voice-agent-tools` edge function for tool handling
3. Create `voice-agent-webhook` edge function for post-call processing
4. Configure agent in ElevenLabs dashboard with custom tools

### Phase 3: Admin UI
1. Create `VoiceAgentDashboard.tsx` page
2. Create `RequestQueue.tsx` component
3. Create `RequestDetailSheet.tsx` with lifecycle management
4. Create `VoiceAgentStats.tsx` analytics cards
5. Create `AgentConfigDialog.tsx` for settings

### Phase 4: Call Interface
1. Create `VoiceAgentWidget.tsx` using ElevenLabs React SDK
2. Create `CallInterface.tsx` for active call display
3. Create `CallTranscript.tsx` for viewing call history
4. Implement `useVoiceAgent.ts` hook

### Phase 5: Notifications & Integration
1. Implement supervisor notifications (email + in-app)
2. Add "Convert to Work Order" functionality
3. Add SMS confirmations for callers
4. Create emergency alert system

### Phase 6: Analytics & Reporting
1. Call volume analytics
2. Resolution time tracking
3. Issue category breakdown
4. Agent performance metrics

---

## Technical Requirements

### ElevenLabs Configuration

The project already has `ELEVENLABS_API_KEY` configured via connector. Additional setup needed:

1. **Create Agent in ElevenLabs Dashboard**:
   - Name: "Glorieta Gardens Maintenance"
   - Voice: Professional, friendly (e.g., "Sarah" or "Roger")
   - Model: Latest turbo model for low latency
   - Enable tool calling

2. **Configure Client Tools**:
   - Register the 4 tools defined above
   - Set up webhook URL for post-call events

3. **Store Agent ID**:
   - Add `ELEVENLABS_AGENT_ID` to secrets once agent is created

### Integration Points

| Existing System | Integration |
|-----------------|-------------|
| Properties | Lookup for unit verification |
| Units | Validate caller's unit |
| Work Orders | Convert request to work order |
| Notifications | Supervisor alerts |
| Activity Log | Audit trail for requests |
| Email (Resend) | Confirmation emails |

---

## Security Considerations

1. **Rate Limiting**: Prevent abuse of voice agent endpoint
2. **Caller Verification**: Basic unit/property verification
3. **PII Protection**: Encrypt phone numbers at rest
4. **Recording Consent**: Inform callers recordings are made
5. **RLS Policies**: Proper access control on request data
6. **Webhook Verification**: Validate ElevenLabs webhook signatures

---

## Files to Create

### New Files
1. `supabase/functions/voice-agent-token/index.ts`
2. `supabase/functions/voice-agent-tools/index.ts`
3. `supabase/functions/voice-agent-webhook/index.ts`
4. `src/hooks/useMaintenanceRequests.ts`
5. `src/hooks/useVoiceAgentConfig.ts`
6. `src/hooks/useVoiceAgent.ts`
7. `src/components/voice-agent/VoiceAgentWidget.tsx`
8. `src/components/voice-agent/CallInterface.tsx`
9. `src/components/voice-agent/RequestQueue.tsx`
10. `src/components/voice-agent/RequestDetailSheet.tsx`
11. `src/components/voice-agent/VoiceAgentStats.tsx`
12. `src/components/voice-agent/AgentConfigDialog.tsx`
13. `src/components/voice-agent/CallTranscript.tsx`
14. `src/components/voice-agent/EmergencyAlertBanner.tsx`
15. `src/pages/voice-agent/VoiceAgentDashboard.tsx`

### Modified Files
1. `src/App.tsx` - Add voice agent route
2. `src/components/layout/AppSidebar.tsx` - Add navigation item
3. `supabase/config.toml` - Register new edge functions

### Dependencies
1. `@elevenlabs/react` - ElevenLabs React SDK for voice agent

---

## Value Proposition

This Voice Agent Call Center delivers:

1. **24/7 Availability** - Residents can report issues anytime
2. **Consistent Experience** - Every caller gets the same professional service
3. **Instant Ticket Creation** - No manual data entry required
4. **Emergency Detection** - Critical issues flagged immediately
5. **Full Audit Trail** - Call recordings and transcripts preserved
6. **Scalable Architecture** - Works for one property or hundreds
7. **Cost Reduction** - Reduces need for live after-hours staff
8. **Improved Satisfaction** - Fast, professional, reliable service

---

## Summary

The Voice Agent Call Center transforms maintenance request handling from a manual, error-prone process into an AI-powered, automated system that:

1. **Answers calls** with a professional, consistent voice agent
2. **Collects information** through natural conversation
3. **Creates tickets** automatically with all relevant details
4. **Detects emergencies** and escalates immediately
5. **Notifies supervisors** for prompt action
6. **Tracks lifecycle** from request to resolution
7. **Provides analytics** for continuous improvement

This positions Glorieta Gardens as a leader in property management technology, offering a feature that can be licensed or deployed across multiple properties.
