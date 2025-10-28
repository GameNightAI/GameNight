# Apple App Store Privacy Details Checklist

## Pre-Submission Preparation

### Data Inventory
- [ ] **Identify ALL data collection** - List every data type you and third-party partners collect
- [ ] **Include third-party SDKs** - Account for analytics tools, advertising networks, and external vendors
- [ ] **Review app functionality** - Even data collected solely for app functionality must be declared
- [ ] **Check ongoing collection** - Data collected continuously after initial permission must be disclosed

### Understanding "Collection"
- [ ] **Verify transmission criteria** - Data transmitted off-device and stored longer than real-time request servicing counts as "collected"
- [ ] **Document retention periods** - Know how long you store each data type
- [ ] **Check server-side processing** - Data sent to servers then immediately discarded doesn't need disclosure

## Data Classification Checklist

### Contact Information
- [ ] Name (first or last name)
- [ ] Email Address (including hashed emails)
- [ ] Phone Number (including hashed numbers)
- [ ] Physical Address (home, physical, mailing)
- [ ] Other User Contact Info (any other contact methods)

### Health & Fitness
- [ ] Health data (Clinical Health Records API, HealthKit API, Movement Disorder API, user-provided health data)
- [ ] Fitness data (Motion and Fitness API, exercise data)

### Financial Information
- [ ] Payment Info (payment method, card numbers, bank accounts)
- [ ] Credit Info (credit scores)
- [ ] Other Financial Info (salary, income, assets, debts)

### Location
- [ ] Precise Location (latitude/longitude with 3+ decimal places)
- [ ] Coarse Location (approximate location services)

### Sensitive Information
- [ ] Sensitive Info (racial/ethnic data, sexual orientation, disability, religious beliefs, political opinion, genetic/biometric data)

### Contacts
- [ ] Contacts (phone contacts, address book, social graph)

### User Content
- [ ] Emails or Text Messages (including non-SMS messages)
- [ ] Photos or Videos
- [ ] Audio Data (voice/sound recordings)
- [ ] Gameplay Content (saved games, multiplayer data, user-generated content)
- [ ] Customer Support data
- [ ] Other User Content

### Browsing & Search
- [ ] Browsing History (content viewed outside the app)
- [ ] Search History (searches within the app)

### Identifiers
- [ ] User ID (screen name, account ID, customer number)
- [ ] Device ID (advertising identifier, device-level IDs)

### Usage Data
- [ ] Purchase History
- [ ] Product Interaction (app launches, taps, clicks, scrolling, media consumption)
- [ ] Advertising Data (ad impressions, interactions)
- [ ] Other Usage Data

### Diagnostics
- [ ] Crash Data (crash logs)
- [ ] Performance Data (launch time, hang rate, energy use)
- [ ] Other Diagnostic Data

### Surroundings
- [ ] Environment Scanning (mesh, planes, scene classification)

### Body
- [ ] Hands (hand structure and movements)
- [ ] Head (head movement)

### Other
- [ ] Other Data Types (any not mentioned above)

## Data Usage Classification

For each data type collected, identify the purpose:

- [ ] **Third-Party Advertising** - Displaying third-party ads or sharing data for third-party ads
- [ ] **Developer's Advertising or Marketing** - First-party ads, marketing communications, sharing for your ads
- [ ] **Analytics** - Understanding user behavior, feature effectiveness, audience measurement
- [ ] **Product Personalization** - Customizing user experience, recommendations, suggestions
- [ ] **App Functionality** - Authentication, features, fraud prevention, security, performance, support
- [ ] **Other Purposes** - Any purposes not listed above

## Data Linking Assessment

For each data type, determine if it's linked to user identity:

- [ ] **Linked to User** - Connected to account, device, or other identifying details
- [ ] **Not Linked to User** - Properly de-identified/anonymized with privacy protections:
  - Stripped of direct identifiers before collection
  - Manipulated to break linkage to real-world identities
  - No attempts to re-link to user identity
  - Not tied to datasets that enable user identification

## Tracking Assessment

- [ ] **Review for tracking activities**:
  - Linking app data with third-party data for targeted advertising
  - Sharing data with data brokers
  - Using data for advertising measurement across platforms
  - Third-party SDKs that combine data for targeting/measurement

- [ ] **Confirm non-tracking scenarios**:
  - Data linked only on-device (not transmitted)
  - Data shared solely for fraud detection/prevention
  - Data shared with consumer reporting agencies for credit purposes

## Optional Disclosure Evaluation

Check if any data types qualify for optional disclosure (must meet ALL criteria):

### Standard Optional Disclosure
- [ ] Not used for tracking purposes
- [ ] Not used for third-party advertising, your advertising/marketing, or other purposes
- [ ] Collection is infrequent and not part of primary functionality
- [ ] User-provided through clear interface with prominent name display and affirmative choice

### Regulated Financial Services
- [ ] App facilitates regulated financial services
- [ ] Collection follows legally required privacy notices
- [ ] Collection is optional and not primary functionality
- [ ] Notice states no sharing with unaffiliated third parties for marketing
- [ ] Data not linked with third-party data for advertising (except fraud/security/credit reporting)

### Health Research
- [ ] Data collected as part of health research study
- [ ] Subject to informed consent form (ICF)
- [ ] Reviewed by institutional/ethics review board
- [ ] Not used for tracking purposes

## Special Situations Checklist

### Web Views
- [ ] **If app has web views**: Declare data collected via web traffic (unless enabling open web navigation)

### IP Address Collection
- [ ] **If collecting IP addresses**: Declare relevant data types (precise location, coarse location, device ID, diagnostics)

### Messaging Features
- [ ] **If offering in-app private messaging**: Declare "emails or text messages" (includes non-SMS)

### Gaming Features
- [ ] **If including game saves/multiplayer**: Declare "Gameplay Content"

### Variable Data Collection
- [ ] **If data collection varies by user type**: Disclose all possible data collected (unless meeting optional disclosure criteria)

### Apple Frameworks
- [ ] **If using Apple services** (MapKit, CloudKit, App Analytics): Indicate what you collect and how you use it

### On-Device Only Processing
- [ ] **If processing data only on-device**: No disclosure needed unless derived data is sent off-device

### Location Processing
- [ ] **If collecting precise location but immediately coarsening**: Declare "Coarse Location"

### Free-Form Fields
- [ ] **If including text fields/voice recordings**: Mark "Other User Content" and "Audio Data" as appropriate

## App Store Connect Submission

### Required Information
- [ ] **Privacy Policy URL** - Publicly accessible privacy policy link
- [ ] **Privacy Choices URL** (Optional) - Link where users can manage privacy choices
- [ ] **Complete all privacy questions** in App Store Connect
- [ ] **Keep responses current** - Update when practices change (no app update required)

### Final Verification
- [ ] **Cross-reference with App Review Guidelines** - Ensure compliance with broader guidelines
- [ ] **Legal compliance check** - Verify adherence to applicable laws
- [ ] **Third-party partner audit** - Confirm all partner practices are accurately reflected
- [ ] **Documentation** - Keep records of privacy practices for future updates
