**Last Updated:** December 29, 2025

## IMPORTANT INFORMATION

**Qurse is a personal open-source software project provided "as-is" without any formal registration, trademark, or legal entity.**

By using Qurse, you acknowledge and agree that:
- **Qurse is not a registered business, corporation, or legal entity**
- **Qurse is a personal OSS project for educational purposes**
- **No formal legal entity, trademark registration, or business license exists**
- **You use the Service entirely at your own risk**
- **The operators of Qurse are personal individual(s), not a company**

## 1. Introduction

**Welcome to Qurse.** Qurse ("we," "our," or "us") provides an AI-powered chatbot platform that enables users to interact with various AI models. By accessing or using Qurse (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service.

**Important:** We do not sell your personal data or information to third parties.

## 2. Acceptance of Terms

By accessing or using Qurse, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, you must not use the Service.

We reserve the right to modify these Terms at any time, effective upon posting the updated Terms on the Service. Your continued use of the Service after such modifications constitutes your acceptance of the updated Terms.

## 3. Age Requirements

**You must be at least 13 years old** to use Qurse. By using the Service, you represent and warrant that:
- You are at least 13 years of age
- You have the legal capacity to agree to these Terms
- If you are under 18, you have obtained parental or guardian consent to use the Service

We do not knowingly collect personal information from children under 13. If we discover that we have collected such information, we will delete it immediately.

## 4. Account Registration

### 4.1 Account Creation
To access certain features of Qurse, you may be required to create an account. You agree to:
- Provide accurate, current, and complete information during registration
- Maintain and update your account information to keep it accurate, current, and complete
- Accept responsibility for all activities that occur under your account
- **Maintain the security of your authentication session**

**Authentication Method:**
- Qurse uses **OAuth authentication only** (no password system)
- We support authentication via:
  - Google
  - GitHub
  - X (Twitter)
- Authentication is securely managed by Supabase Auth
- **No passwords are stored or managed by Qurse**
- We rely entirely on your OAuth providers for account security

**Account Deletion:**
- You may delete your account at any time
- Account deletion permanently removes all your data from our systems (except as required by law)
- See Section 8 for details on data deletion and retention

## 5. Service Description and Features

### 5.1 AI Chatbot Services
Qurse provides access to multiple AI models through a chat interface. The Service includes:

**Free Features:**
- Access to free AI models
- Limited daily message quota
- Basic conversation history
- Guest access without account creation

**Pro Features (Subscription Required):**
- Access to premium AI models
- Unlimited message quota
- Advanced conversation features
- Priority processing

### 5.2 Rate Limiting
**Current Rate Limits (as of December 2025):**
- **Guest Users:** Fair usage quota (up to 10 messages per 24-hour period)
- **Free Authenticated Users:** Fair usage quota (up to 20 messages per 24-hour period)
- **Pro Users:** Unlimited messages

**Guest Rate Limiting (Important):**
Guest rate limits are enforced based on **IP address and session**. This means:
- Multiple users on the same IP share the guest quota
- We cannot guarantee each guest user receives exactly 10 messages
- Rate limits are enforced on a best-effort basis using IP-based tracking
- **For guaranteed quota, create a free account**

**We reserve the right to modify rate limits at any time** without prior notice. Continued use of the Service after such changes constitutes acceptance of the new limits.

Rate limits are enforced per:
- Guest users: per IP address/session (shared by all users on same IP)
- Authenticated users: per user account (guaranteed quota)

**Note:** Exact rate limit numbers may vary. We communicate approximate limits to set expectations, but actual limits may change based on system load, abuse prevention, or operational needs.

### 5.3 Model Access
Different AI models have different access requirements:

**Free Models (Available to All Users):**
- No authentication required for some models
- No rate limits beyond daily quota
- Available to guest and authenticated users

**Pro-Only Models (Require Active Subscription):**
- Require authenticated account
- Require active Pro subscription
- May have additional usage limits

**Auth-Required Models:**
- Require authenticated account (guest access not available)
- No Pro subscription required
- Subject to daily rate limits

### 5.4 Message and Data Storage
**Guest Users:**
- Conversations are stored temporarily
- Automatic deletion occurs periodically via automated cleanup job
- No guarantee of data persistence
- Session-based access only
- Data may be deleted at any time without notice

**Authenticated Users:**
- Conversations are stored in our database
- Data persists until account deletion
- Accessible across sessions and devices
- Subject to our data retention policies

**Note:** Guest data cleanup is an automated process that runs periodically. We do not guarantee exact deletion times.

### 5.5 File Attachments

**Qurse supports file attachments for AI analysis.**

You can upload various file types for AI models to analyze, extract information from, and discuss with you.

#### Supported File Types

**File Types:**
We support various file types for AI analysis, including but not limited to:
- **Documents:** PDF, TXT, MD (Markdown), DOC, DOCX, RTF
- **Spreadsheets:** CSV, XLSX, XLS, ODS
- **Presentations:** PPT, PPTX, ODP
- **Images:** PNG, JPG, JPEG, GIF, WebP
- **Code Files:** Various programming language source files
- **And more:** Additional formats may be added or removed over time

**We cannot guarantee:**
- That all listed formats will be supported at all times
- That specific file formats will be supported indefinitely
- Consistent support across all AI models
- Uniform file processing across different chat modes

#### File Storage

**Storage Provider:**
Files are stored using cloud storage services, which may include:
- **Supabase Storage** - Integrated with our existing database
- **AWS S3** - Amazon Simple Storage Service
- **Cloudflare R2** - S3-compatible storage
- **Google Cloud Storage** - Google's cloud storage solution
- **Or other providers** - We may use different storage providers

**Storage characteristics:**
- Files may be stored in different regions/countries than our database
- Storage providers have independent data retention and privacy policies
- We cannot control how storage providers handle or secure file data
- Storage provider may change without notice
- File storage may be encrypted at rest and/or in transit

**Important Disclaimers:**
- **Storage provider may vary**
- **Storage policies and practices depend on the chosen provider**
- **We are not responsible for storage provider data handling**
- **File storage locations may vary by user region or other factors**

#### File Processing and AI Analysis

**How File Attachments Work:**
1. You upload a file through the Qurse interface
2. The file is stored in our cloud storage
3. Depending on the AI model and file type:
   - The file content may be extracted and sent to AI models
   - Images may be processed by vision-capable AI models
   - Documents may be parsed and text extracted
   - Spreadsheets may be analyzed as structured data
4. AI models analyze the file content and generate responses
5. Processed file data may be temporarily cached or stored

**Data Sent to AI Model Providers:**
When you attach a file, the following may be sent to third-party AI providers:
- **File content** (text extracted from documents, spreadsheets, etc.)
- **Images** (for vision-capable models like GPT-4V, Claude 3.5 Sonnet, etc.)
- **Metadata** (file name, type, size, creation date, etc.)
- **Processed data** (parsed, structured, or analyzed versions of your files)

**Important Privacy Warnings:**
- **Your file content may be sent to AI model providers**
- **AI providers may log or store file data for safety, training, or improvement**
- **Provider privacy policies apply to any file data they receive**
- **We cannot control how AI providers use or store file content**
- **Different AI providers have different data handling practices**

#### File Size Limits and Quotas

**Limitations:**
- Maximum file size per attachment
- Daily or monthly upload quotas may apply
- Different limits for free vs Pro users may apply
- File type restrictions may apply
- Storage duration limits may apply

**We reserve the right to:**
- Change file size limits at any time
- Impose quotas on file uploads
- Restrict file types based on cost, abuse, or technical limitations
- Remove stored files after a certain period
- Charge for file storage beyond free tier limits

#### Security and Malware Protection

**Malware and Security Risks:**
- Uploaded files may contain viruses, malware, or malicious content
- We may implement virus scanning or malware detection
- We cannot guarantee detection of all malicious files
- You are responsible for scanning files before upload
- We are not liable for damages from malicious file uploads

**File Content Safety:**
- We may scan file content for policy violations
- Prohibited content in files may result in account suspension
- We cannot guarantee comprehensive content filtering
- You are responsible for ensuring file content complies with these Terms

#### Your Responsibilities for File Attachments

**YOU ARE SOLELY RESPONSIBLE FOR:**
- Ensuring you have the right to upload and analyze files
- Respecting copyright, intellectual property, and confidentiality in uploaded files
- Not uploading files containing illegal, harmful, or prohibited content
- Backing up important files before upload
- Understanding that uploaded files may be sent to third-party AI providers
- Understanding that files may be stored in locations we do not control
- Complying with all applicable laws when uploading files

**YOU AGREE THAT:**
- File upload and analysis happens entirely at your own risk
- We are not responsible for lost, corrupted, or deleted files
- We are not liable for how AI providers use or store file content
- We cannot guarantee file availability or recoverability
- File storage and processing is provided "as-is" without warranty

#### File Deletion and Retention

**Authenticated Users:**
- Files may be deleted when you delete the associated message or conversation
- Files may be retained in storage after conversation deletion
- We may delete files after a certain period
- File deletion from storage may not be immediate

**Account Deletion:**
- Upon account deletion, we will attempt to delete all associated files
- Some files may remain in storage due to:
  - Backup retention policies
  - Storage provider limitations
  - Technical constraints
  - Third-party provider data retention
- We cannot guarantee complete or immediate file deletion

**Storage Provider Data Retention:**
- Storage providers may retain file data independently of Qurse
- Backup and disaster recovery may retain deleted files
- Provider data retention policies are beyond our control
- We are not responsible for storage provider data handling

#### Limitations and Liability

**FILE ATTACHMENT FEATURES:**
- Are provided on a best-effort basis only
- Depend on third-party storage and AI provider availability
- May be disabled, modified, or removed at any time
- Have no guaranteed availability, performance, or reliability

**WE ASSUME NO LIABILITY FOR:**
- Any lost, corrupted, or deleted files
- Any unauthorized access to uploaded files
- Any privacy breaches from storage or AI providers
- Any damages from malware or malicious file uploads
- Any copyright or IP violations from uploaded files
- Any failure to process or analyze files correctly
- Any charges or costs from storage or AI providers
- Any data breaches or leaks from third-party storage

**ADDITIONAL DISCLAIMERS:**
- Storage provider may change
- File processing capabilities may vary by AI model
- File size limits and quotas are subject to change
- We may remove file attachment features entirely if technical, legal, or financial constraints arise
- No refunds or compensation for unavailable file features

**For more information on data handling, see our Privacy Policy.**

### 5.6 Chat Modes, AI Providers, and Tool-Calling Features

**Qurse offers multiple AI models, providers, chat modes, and tool-calling capabilities.**

#### Available AI Models and Providers

Qurse integrates with multiple AI providers and models:

**AI Providers:**
- **OpenAI** - GPT models (GPT-4, GPT-4 Turbo, GPT-4o, etc.)
- **XAI** - Grok models (Grok-2, Grok-beta, etc.)
- **Groq** - Fast inference models (Mixtral, Llama 3, Gemma, etc.)
- **Anannas** - Various AI models
- **Anthropic** - Claude models (Claude 3.5 Sonnet, Claude 3 Opus, etc.)
- **And more providers** - We may add additional providers over time

**Model Tiers:**
- **Free Models** - Available to all users (guests and authenticated)
- **Auth-Required Models** - Require account creation (free tier)
- **Pro-Only Models** - Require active paid subscription (Premium tier)

**We reserve the right to:**
- Add or remove AI providers and models at any time
- Change model access requirements (free → auth-required → Pro-only)
- Modify model capabilities or availability
- Discontinue specific models or providers without notice

#### Chat Modes

Qurse provides various chat modes optimized for different use cases:

**Available Chat Modes:**
- **Standard Chat** - General-purpose AI conversations
- **Web Search Mode** - AI agents with internet search capabilities
- **Research Mode** - Academic and research-focused tools (arXiv, papers)
- **Agent Mode** - Advanced AI agents with multi-step reasoning
- **Code Mode** - Programming and development assistance
- **Creative Mode** - Writing and creative content generation
- **And more** - New modes may be added over time

**Each chat mode may:**
- Use different AI models
- Have access to specialized tools
- Provide unique capabilities
- Have different rate limits or requirements

#### Tool-Calling and AI Agents

Many chat modes include AI agents that can use external tools to assist you:

**Web Search Tools:**
- **Exa** - AI-powered web search
- **Tavily** - Search API for AI agents
- **Brave Search** - Privacy-focused web search
- **And more** - Additional search providers may be integrated

**Research and Knowledge Tools:**
- **arXiv API** - Academic paper search and retrieval
- **Wikipedia API** - Encyclopedia knowledge access
- **Scholarly databases** - Research paper access (if available)
- **And more** - Additional knowledge sources may be added

**Utility Tools:**
- **Weather APIs** - Real-time weather information
- **Calculator/Computation** - Mathematical calculations
- **Data processing** - CSV, JSON, and other data formats
- **And more** - Additional utilities may be integrated

**How Tool-Calling Works:**
1. You send a message in a chat mode that supports tools
2. The AI model analyzes your request and decides which tools to use
3. The AI autonomously calls external APIs with generated queries
4. Tool results are returned to the AI for processing
5. The AI generates a response based on tool outputs
6. This process may repeat multiple times (multi-step reasoning)

**Important Characteristics of Tool-Calling:**
- **Autonomous** - AI decides when and how to use tools
- **Unpredictable** - We cannot foresee which tools will be called for any query
- **Generated Queries** - Search queries are AI-generated, not user-controlled
- **Multi-Step** - Agents may chain multiple tool calls together
- **Opaque** - You may not see all intermediate tool calls or results

#### Important Disclaimers for Tools and Agents

**YOU ACKNOWLEDGE AND UNDERSTAND THAT:**

**External Tools and APIs Not Controlled By Us:**
- Tool providers (Exa, Tavily, Weather API, etc.) are third-party services
- We do not control tool availability, accuracy, or performance
- Tool APIs may be rate-limited, slow, unavailable, or deprecated
- Tool providers may change their APIs without notice
- We do not verify or endorse tool-provided information

**Autonomous AI Decision-Making:**
- AI agents autonomously decide when to use tools
- You cannot fully control which tools are called or how
- AI may use tools in unexpected ways
- Tool-calling happens based on AI judgment, not direct user instruction
- We cannot predict all possible tool combinations or uses

**Data Sent to Third-Party Tool Providers:**
- Your queries (in AI-processed form) may be sent to external tool APIs
- Tool providers receive anonymized or partially anonymized query data
- Tool providers have independent privacy policies and data practices
- We are not responsible for how tool providers handle or store data
- Sensitive information may be inadvertently included in tool calls

**No Real-Time Verification or Control:**
- AI may misinterpret tool results or generate incorrect summaries
- Tool outputs may be inaccurate, incomplete, or biased
- AI "hallucinations" can affect tool-augmented responses
- We cannot control what websites or resources tools access
- Tool results may contain harmful, illegal, or inappropriate content

**Availability and Reliability:**
- Tool-calling features depend entirely on third-party API availability
- Tools may fail, timeout, or return errors
- Tool providers may impose rate limits or charge for usage
- We cannot guarantee any tool will work at any given time
- Tool availability may change without notice

**Financial and Usage Limitations:**
- Some tools may have usage quotas or costs
- We may limit tool usage based on availability or cost
- Pro features may include higher tool usage limits
- Abuse of tool-calling features may result in restrictions

#### Your Responsibilities for Tool-Calling Features

**WHEN USING CHAT MODES WITH TOOLS OR AGENTS, YOU ARE SOLELY RESPONSIBLE FOR:**
- Verifying all tool-provided information before relying on it
- Understanding that tool-augmented AI responses may be inaccurate
- Not using tool-calling features for illegal, harmful, or abusive purposes
- Complying with all third-party tool provider terms of service
- Recognizing that AI agents operate autonomously and at your own risk
- Not intentionally triggering tools to access restricted or harmful content
- Understanding that tool calls may have costs we may need to limit

**YOU AGREE THAT:**
- Tool-provided information is "as-is" without warranty of any kind
- We are not responsible for content found through tools
- We are not liable for how you use information retrieved via tools
- AI agent tool-calling happens entirely at your own risk

#### Privacy and Data Sharing with Tool Providers

**When tools are called, the following data may be shared with third parties:**

**Search Providers (Exa, Tavily, Brave, etc.):**
- Your queries (processed and summarized by AI)
- Search terms generated by the AI model
- Metadata about the conversation context

**Weather APIs:**
- Location data (if provided or inferred)
- Weather-related queries

**Research Tools (arXiv, Wikipedia, etc.):**
- Academic search queries
- Research topic requests

**Utility Tools:**
- Mathematical expressions and calculations
- Data processing inputs (CSV, JSON, etc.)
- Structured data for computation

**Important Privacy Notes:**
- **We cannot control what data tool providers log or store**
- **Tool providers have independent privacy policies**
- **Sensitive information should NOT be shared in tool-enabled chat modes**
- **Tool providers may change their data practices without notice**
- **We are not responsible for tool provider data handling**
- **Different tools may send different types of data**
- **Tool providers may be located in different countries**

**For more details, see our Privacy Policy.**

#### Limitations and Liability

**TOOL-CALLING, AGENT MODES, AND CHAT MODES:**
- Are provided on a best-effort basis only
- Depend entirely on third-party tool provider availability
- May be disabled, modified, rate-limited, or removed at any time
- Have no guaranteed uptime, performance, or accuracy standards
- Are not suitable for critical, professional, or high-stakes decisions

**WE ASSUME NO LIABILITY FOR:**
- Any actions taken based on tool-provided information
- Any losses from relying on agent tool-calling features
- Any harm caused by inaccurate tool-augmented AI responses
- Any privacy issues arising from third-party tool provider data handling
- Any damages from tool failures, errors, or unavailability
- Any consequences of AI agent autonomous decision-making
- Any charges or costs incurred through tool usage

**ADDITIONAL DISCLAIMERS:**
- Tool providers may change, discontinue, or restrict access without notice
- We may need to remove or modify tools based on provider changes
- Tool availability varies by region and may be geo-restricted
- Some tools may require additional authentication or API keys
- We cannot provide refunds or compensation for tool unavailability
- Tool providers may impose rate limits, costs, or usage restrictions

#### AI Model Provider Limitations

**In addition to tool providers, AI model providers have their own limitations:**

**AI Model Availability:**
- Models may be unavailable due to provider outages
- Providers may rate-limit or restrict access
- Model capabilities may change without notice
- Specific models may be discontinued or replaced
- Provider API changes may break or modify features

**Model Provider Terms:**
- Each AI provider has independent terms of service
- Provider policies on content, usage, and data handling apply
- We are not responsible for provider policy changes
- Provider decisions (content filtering, bans, restrictions) are beyond our control
- Provider data retention policies vary and are independent of Qurse

**Data Sent to AI Model Providers:**
- Your conversations and messages are sent to AI model providers
- Providers may log data for safety, training, or improvement
- Provider privacy policies apply to data they receive
- We cannot control how providers use or store conversation data
- Different providers have different data handling practices

**For more information, see our AI-Generated Content Disclaimer (Section 10) and our Privacy Policy.**

## 6. Subscriptions and Payments

### 6.1 Qurse Premium Subscription
Qurse offers a paid subscription ("Paid Subscription" or "Premium") that provides:
- Unlimited messaging (within fair use policy)
- Access to premium AI models
- Priority features
- Enhanced capabilities

**Note:** "Qurse Pro" is an informal designation we use to refer to the paid subscription tier. It is not a formal product name or registered trademark.

### 6.2 Payment Processing
Payments are processed through third-party payment processors (currently Dodo Payments). By subscribing to Pro, you agree to:
- Provide accurate billing information
- Pay all fees and charges incurred
- Authorize automatic billing for recurring subscriptions

### 6.3 Subscription Periods and Billing
- Subscriptions are billed on a recurring basis
- Billing cycles are determined at the time of subscription
- Your subscription continues until you cancel

### 6.4 Grace Period for Cancellation
**If you cancel your Pro subscription:**
- You retain Pro access until the end of your current billing period
- Access continues until your `next_billing_at` date
- You will not be charged for subsequent billing periods
- After the billing period ends, your account reverts to Free tier

### 6.5 Refund Policy
**ALL SALES ARE FINAL. NO REFUNDS WILL BE ISSUED.**

By subscribing to Qurse Paid Subscription, you acknowledge and agree that:
- Payment is for access during the current billing period only
- No refunds will be issued for partial billing periods
- No refunds will be issued for unused portions of your subscription
- No refunds will be issued after subscription has been activated
- Access to checkout pages does not grant access to Premium features
- Premium features are activated only after successful payment verification

**Exception for Payment Processing Errors:**
If you are charged but Premium features are not activated due to a payment processing error (e.g., Dodo webhook failure, technical issue), you may contact us to:
- Verify the payment error occurred
- Request manual activation of your Premium features
- We will work with you to resolve the issue

**This exception applies only to technical payment failures.** It does not apply to:
- Buyer's remorse
- Changed mind after purchase
- Forgot to cancel before renewal
- Other voluntary cancellations

### 6.6 Payment Disputes
If you believe you have been charged in error, you must:
- Contact us promptly
- Provide detailed information about the disputed charge
- Allow us reasonable time to investigate

We reserve the right to contest chargebacks and may terminate accounts that file fraudulent chargebacks.

### 6.7 Repurchase Before Grace Period
You may repurchase or renew your Paid Subscription at any time, including:
- Before your current subscription expires
- During the grace period after cancellation
- After your subscription has expired

**Note:** If your subscription has been cancelled or cancelled by you, in grace period you may still access to the checkout page (if possible) and repurchase. New subscription will be created from that day onwards.

Repurchasing reactivates Paid features immediately upon successful payment verification.

## 7. Guest to Authenticated User Transfer

### 7.1 Data Transfer Process
When you create an account after using Qurse as a guest, we attempt to transfer your guest conversations and messages to your new account.

**Important:**
- Data transfer is done on a best-effort basis
- We cannot guarantee complete data transfer
- Some data may be lost during the transfer process
- Transfer failures are statistically rare but possible

### 7.2 No Liability for Data Loss
You acknowledge and agree that:
- We are not responsible for any data loss during guest-to-auth transfer
- We are not liable for incomplete transfers
- We are not responsible for conversation ID conflicts
- We are not responsible for race conditions between multiple sessions

## 8. Account Deletion and Data Retention

### 8.1 Account Deletion
You may delete your account at any time through the Settings page. Account deletion requires:
- Confirmation by typing "DELETE"
- Acknowledgment that this action cannot be undone

### 8.2 What Gets Deleted
Upon account deletion, we delete:
- Your user profile information
- All conversations and messages
- Rate limit records
- User preferences
- Account credentials
- All data from our database (Supabase)

**File Attachments:**
- We will attempt to delete all uploaded files from cloud storage
- Some files may remain due to storage provider limitations, backup retention, or technical constraints
- Files already sent to AI model providers may remain in their systems
- Storage providers may retain deleted files per their own data retention policies
- We cannot guarantee complete or immediate file deletion

**Data Retained by Third-Party Services:**
The following third-party services may retain data independently of Qurse:
- **Vercel Analytics:** Web analytics, page views, performance metrics, and device/browser information
- **Sentry:** Error reports, crash logs, and debugging information (with text masking enabled)
- **Vercel Speed Insights:** Performance metrics and Core Web Vitals

These services have their own data retention policies that are beyond our control. We cannot control how they handle, store, or use data they collect.

**Important:** The following data is retained by our service providers, not Qurse:
- **Supabase:** Deletes all user data upon account deletion (as their policy allows)
- **Dodo Payments:** Retains customer and transaction records as required by law for tax and business purposes
- **Upstash/Redis:** Temporary rate limit data (expires automatically)
- **Cloud Storage:** May retain files per their data retention policies (backup, disaster recovery, etc.)
- **AI Model Providers:** May retain conversation data, file content, or attachments sent to their models per their own data retention policies

These third parties have independent data retention policies that are beyond our control.

### 8.3 Subscription and Payment Records
**Upon account deletion:**
- Your active subscription is cancelled immediately
- You will not be charged further
- **We do not delete your Dodo Payments customer record**
- Dodo retains your payment history, invoices, and transaction records as required by law for tax and business purposes
- This data is retained by Dodo Payments, not Qurse

### 8.4 Data in Third-Party Systems
We use third-party services that may retain data independently of Qurse:
- **Supabase:** Database and authentication provider (deleted upon account deletion)
- **Dodo Payments:** Payment processor (retains records as required by law)
- **Upstash/Redis:** Rate limiting (temporary data, expires automatically)
- **Cloud Storage Providers:** AWS S3, Supabase Storage, Cloudflare R2, or others (may retain files per their policies)
- **AI Model Providers:** OpenAI, XAI, Groq, Anthropic, etc. (may retain conversation data and file content per their policies)
- **Tool Providers:** Exa, Tavily, Weather APIs, etc. (may retain query data per their policies)
- **Vercel Analytics:** Web analytics and performance monitoring (retains data per their policy)
- **Sentry:** Error tracking and crash reporting (retains data per their policy)
- **Vercel Speed Insights:** Performance metrics and Core Web Vitals (retains data per their policy)

These third parties have their own data retention policies that are beyond our control.

## 9. User Responsibilities and Conduct

### 9.1 Acceptable Use
You agree to use Qurse only for lawful purposes. You agree NOT to:
- Use the Service to generate illegal, harmful, or abusive content
- Attempt to circumvent rate limits or access restrictions
- Use automated tools to abuse the Service
- Reverse engineer or attempt to extract AI models
- Violate any applicable laws or regulations
- Infringe on the rights of others
- Transmit viruses, malware, or malicious code
- Attempt to gain unauthorized access to our systems
- Upload files containing viruses, malware, or malicious code
- Upload files that violate intellectual property rights

### 9.2 Prohibited Content
You must NOT use Qurse to:
- Generate content that promotes illegal acts
- Create deepfakes or misleading content
- Harass, threaten, or abuse others
- Violate intellectual property rights
- Generate explicit or inappropriate content
- Spread misinformation or propaganda
- Upload files containing prohibited content

### 9.3 Consequences of Violation
We reserve the right to:
- Terminate your account immediately for violations
- Report illegal activities to law enforcement
- Cooperate with investigations
- Restrict access to the Service

## 10. AI-Generated Content Disclaimer

### 10.1 AI Accuracy and Hallucinations
**YOU ACKNOWLEDGE AND UNDERSTAND THAT:**
- AI models may generate inaccurate, false, or misleading information
- AI responses are not verified for accuracy
- AI may "hallucinate" facts, citations, or information that does not exist
- AI does not have access to real-time information
- AI responses are based on training data that may be outdated or biased

### 10.2 Your Responsibility
**YOU ARE SOLELY RESPONSIBLE FOR:**
- Verifying all AI-generated information before relying on it
- Not relying on Qurse for professional, medical, legal, or financial advice
- Understanding that AI responses are not substitutes for professional judgment
- Validating any factual claims made by AI models
- Using AI-generated content at your own risk

### 10.3 No Warranty on AI Output
**AI-GENERATED CONTENT IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND.** We do not guarantee:
- Accuracy, reliability, or correctness of AI responses
- Completeness of information provided by AI
- Suitability of AI output for any purpose
- Freedom from errors or omissions in AI responses

## 11. Disclaimer of Warranties

**THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:**

- IMPLIED WARRANTIES OF MERCHANTABILITY
- IMPLIED WARRANTIES OF FITNESS FOR A PARTICULAR PURPOSE
- IMPLIED WARRANTIES OF NON-INFRINGEMENT
- WARRANTIES OF TITLE
- WARRANTIES OF QUIET ENJOYMENT

**We do not warrant that:**
- The Service will be uninterrupted, timely, secure, or error-free
- The Service will meet your requirements
- AI models will perform in a certain manner
- Results from using the Service will be accurate or reliable
- Errors will be corrected
- The Service is free of viruses or harmful components

## 12. Limitation of Liability

**TO THE MAXIMUM EXTENT PERMITTED BY LAW, QURSE AND ITS OPERATORS SHALL NOT BE LIABLE FOR:**

### 12.1 Direct Damages
Any direct, incidental, special, consequential, or punitive damages arising from:
- Your use of the Service
- Your inability to use the Service
- Any errors, mistakes, or inaccuracies in AI-generated content
- Any actions taken based on AI responses
- Data loss or corruption
- Account deletion or suspension

### 12.2 Types of Damages Excluded
We are not liable for damages including but not limited to:
- Lost profits
- Lost data
- Business interruption
- Personal injury
- Property damage
- Emotional distress
- Reputation damage
- Financial loss
- Legal or regulatory penalties

### 12.3 User Actions
**YOU ARE SOLELY RESPONSIBLE FOR:**
- Any actions you take based on AI-generated content
- Any decisions made using information from Qurse
- Consequences of relying on AI responses in any context
- Professional, medical, legal, financial, or life decisions

**WE ARE NOT RESPONSIBLE FOR:**
- What you do on this site
- What you do outside using this site
- How you use AI-generated content
- Any harm caused by following AI advice
- Any illegal activities you engage in

### 12.4 Maximum Liability
**TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED TO THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID TO US (IF ANY) IN THE 12 MONTHS PRECEDING YOUR CLAIM.**

**If you have not paid anything, our total liability is $0.**

**This means:**
- Free users: No monetary liability limit (limited by applicable law)
- Paid users: Liability capped at amount paid in last 12 months
- This is the maximum extent we can be held liable

**Purpose:** This clause:
- Limits our financial exposure
- Makes liability predictable for us
- Is standard practice in software services
- Protects us from catastrophic claims

## 13. Indemnification

**You agree to indemnify, defend, and hold harmless Qurse and its operators from:**
- Any claims resulting from your use of the Service
- Any violations of these Terms by you
- Any illegal activities conducted through the Service
- Any content you generate using the Service
- Any third-party claims arising from your use

## 14. Third-Party Services and Links

### 14.1 AI Model Providers
Qurse uses AI models provided by third parties (OpenAI, XAI, Groq, Anannas, etc.). We do not control these providers and are not responsible for:
- Availability, accuracy, or performance of third-party AI models
- Changes to third-party AI model capabilities
- Outages or disruptions in third-party services
- Data processing by third-party AI providers

### 14.2 Payment Processors
We use third-party payment processors (Dodo Payments). By making a payment, you agree to the processor's terms and conditions. We are not responsible for:
- Payment processing errors
- Failed transactions
- Charges or fees imposed by payment processors
- Data handling by payment processors

### 14.3 External Links
The Service may contain links to third-party websites. We do not control these sites and are not responsible for their content, privacy policies, or practices.

## 15. Privacy and Data Protection

Your privacy is important to us. Please review our **Privacy Policy** to understand how we collect, use, and protect your information.

By using Qurse, you consent to our data practices as described in the Privacy Policy.

## 16. Intellectual Property

### 16.1 Our Rights

**Qurse Name and Branding:**
- The name "Qurse" is used as an informal designation for this open-source project
- "Qurse" is not a registered trademark or formal business name
- No formal trademark registration exists
- This is a personal OSS project, not a commercial brand

**Code and Content:**
All content, features, and functionality of Qurse are owned by the project maintainer(s) and are protected by copyright, open-source licenses, and other intellectual property laws.

### 16.2 Your Rights
You retain ownership of:
- Content you input into Qurse (conversations, messages)
- Your account information

**You grant us a license to:**
- Store and process your input for Service functionality
- Use your input to provide the Service to you
- Use anonymized data for service improvement

### 16.3 AI-Generated Content
Content generated by AI models does not belong to us or to the AI providers. You may use AI-generated output at your own discretion and risk, subject to applicable laws.

## 17. Termination of Service

### 17.1 By You
You may stop using the Service at any time. You may delete your account through the Settings page.

### 17.2 By Us
We reserve the right to suspend or terminate your access to the Service at any time, with or without cause, with or without notice, including but not limited to:
- Violation of these Terms
- Abuse of the Service
- Suspicious activity on your account
- Legal requirements
- Discontinuation of the Service

### 17.3 Effect of Termination
Upon termination:
- Your right to use the Service ends immediately
- We may delete your account and data (except as required by law)
- We are not liable for any loss resulting from termination
- These Terms survive termination

## 18. Dispute Resolution

### 18.1 Governing Law
These Terms are governed by the laws of **India**. Any disputes will be resolved exclusively in the courts of **India**.

### 18.2 Arbitration
**Any dispute, controversy, or claim arising out of or relating to these Terms or the Service shall be resolved by binding arbitration in India**, except where prohibited by law.

### 18.3 Class Action Waiver
**YOU AGREE TO RESOLVE DISPUTES ON AN INDIVIDUAL BASIS ONLY.** Class actions, class arbitrations, representative actions, and consolidated actions are not permitted.

## 19. General Provisions

### 19.1 Entire Agreement
These Terms constitute the entire agreement between you and Qurse regarding the Service.

### 19.2 Waiver
Our failure to enforce any right or provision of these Terms does not constitute a waiver.

### 19.3 Severability
If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force.

### 19.4 Assignment
You may not assign these Terms without our prior written consent. We may assign these Terms freely.

### 19.5 Force Majeure
We are not liable for delays or failures caused by events beyond our reasonable control.

## 20. Contact Information

For questions about these Terms, please contact us through:
- **Email:** qurse.chat@gmail.com
- **Website:** https://wwww.qurse.site

---

**By using Qurse, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.**

**You acknowledge that Qurse is a personal open-source project provided as-is, and that the operators of Qurse are not legally responsible for any actions you take, content you generate, or consequences of using the Service.**
