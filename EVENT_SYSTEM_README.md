# Event System Implementation

## Overview
The Event System provides a comprehensive solution for creating, managing, and participating in events with flexible scheduling and RSVP functionality. It's designed to work seamlessly with the existing poll system and follows the same design patterns.

## Features

### 🎯 **Event Creation**
- **Multi-date selection** with calendar interface
- **Flexible scheduling** - same or different times/locations per date
- **Event details** including title, description, and location
- **Date-specific options** when toggles are disabled

### 📅 **Date Management**
- **Calendar-based date selection** with visual feedback
- **Date-specific settings** for location and time
- **Toggle controls** for global vs. individual settings
- **Smart display** showing appropriate information based on settings

### 👥 **RSVP System**
- **Yes/No/Maybe responses** for each date
- **Individual date responses** allowing flexible participation
- **Comment system** for additional notes
- **Real-time updates** with Supabase subscriptions

### 📊 **Results & Analytics**
- **Comprehensive statistics** showing overall RSVP counts
- **Date-by-date breakdown** with percentages and progress bars
- **Individual RSVP display** with all responses
- **Ranking system** for most popular dates

### 🔗 **Sharing & Management**
- **Sharable links** for easy event distribution
- **Creator controls** for editing and deletion
- **Responsive design** for mobile and desktop
- **Real-time notifications** for new RSVPs

## File Structure

```
app/
├── event/
│   └── [id]/
│       ├── index.tsx          # Event voting/RSVP screen
│       └── results.tsx        # Event results and analytics
├── (tabs)/
│   └── events.tsx             # Main events list screen

components/
├── CreateEventModal.tsx        # Event creation modal
├── DateReviewModal.tsx         # Date review and finalization
├── EventCard.tsx              # Event display component
└── ScrollableTimePicker.tsx   # Time selection component

supabase/
└── migrations/
    └── 20250102000000_create_events_tables.sql
```

## Database Schema

### Tables

#### `events`
- Main event information
- Global settings for time/location
- Date-specific options storage

#### `event_dates`
- Individual dates for each event
- Date-specific location and time overrides
- Links to main event

#### `event_rsvps`
- RSVP responses from participants
- JSON storage for date-specific responses
- Comment and metadata

### Key Fields

```sql
-- Events table
id: UUID (Primary Key)
user_id: UUID (Creator)
title: TEXT
description: TEXT
location: TEXT
start_time: TIMESTAMPTZ
end_time: TIMESTAMPTZ
use_same_location: BOOLEAN
use_same_time: BOOLEAN
date_specific_options: JSONB

-- Event dates table
id: UUID (Primary Key)
event_id: UUID (Foreign Key)
date: DATE
location: TEXT
start_time: TIMESTAMPTZ
end_time: TIMESTAMPTZ

-- RSVPs table
id: UUID (Primary Key)
event_id: UUID (Foreign Key)
voter_name: TEXT
responses: JSONB ({"date_id": "yes|no|maybe"})
comment: TEXT
```

## User Flow

### 1. **Event Creation**
```
Create Event Button → Calendar Selection → Date Review → Event Created
```

1. User clicks "Create Event" button
2. Enters event name and description
3. Selects available dates from calendar
4. Reviews dates and sets time/location options
5. Finalizes event creation
6. Redirected to new event page

### 2. **Event Participation**
```
Event Link → View Event → RSVP → Submit Response
```

1. Participant receives event link
2. Views event details and available dates
3. Enters name and selects responses for each date
4. Submits RSVP
5. Can update responses later

### 3. **Event Management**
```
Event List → Event Actions → Edit/Delete/Share
```

1. Creator views their events
2. Can edit event details
3. Delete events (with confirmation)
4. Share event links
5. View RSVP results

## Integration Points

### **DateReviewModal**
- **Purpose**: Final step in event creation
- **Features**: Time/location setup, toggle controls, date-specific options
- **Integration**: Receives selected dates, returns final event options

### **ScrollableTimePicker**
- **Purpose**: Time selection for events
- **Features**: Scrollable time wheel, manual input, validation
- **Integration**: Used in DateReviewModal for time selection

### **EventCard**
- **Purpose**: Display events in lists
- **Features**: Event summary, action buttons, responsive design
- **Integration**: Used in events list screen

## API Endpoints

### **Supabase Tables**
- `events` - Event CRUD operations
- `event_dates` - Date management
- `event_rsvps` - RSVP handling

### **Real-time Features**
- **RSVP subscriptions** for live updates
- **Event changes** notifications
- **Participant updates** in real-time

## Styling & Design

### **Consistent with App**
- **Poppins font family** throughout
- **Color scheme** matching existing components
- **Component patterns** following established conventions
- **Responsive design** for all screen sizes

### **Visual Elements**
- **Calendar interface** for date selection
- **Progress bars** for RSVP visualization
- **Icon system** for actions and status
- **Card-based layout** for content organization

## Security & Permissions

### **Row Level Security (RLS)**
- **Events**: Users can only modify their own events
- **Dates**: Only event creators can modify dates
- **RSVPs**: Anyone can create, users can update their own

### **Data Validation**
- **Time validation**: End time must be after start time
- **Date validation**: Cannot select past dates
- **Required fields**: Event name and at least one date

## Future Enhancements

### **Potential Features**
- **Event templates** for recurring events
- **Advanced scheduling** with time zones
- **Notification system** for event reminders
- **Calendar integration** with external services
- **Event categories** and filtering
- **Participant limits** and waitlists

### **Technical Improvements**
- **Caching strategy** for better performance
- **Offline support** for mobile apps
- **Analytics dashboard** for event insights
- **API rate limiting** for scalability

## Usage Examples

### **Creating a Simple Event**
```typescript
// User selects dates and sets global time/location
const eventOptions = {
  location: "Game Night HQ",
  startTime: new Date("2024-01-15T18:00:00"),
  endTime: new Date("2024-01-15T22:00:00"),
  useSameLocation: true,
  useSameTime: true
};
```

### **Creating a Complex Event**
```typescript
// User sets different times/locations per date
const eventOptions = {
  location: "Main Location",
  startTime: new Date("2024-01-15T18:00:00"),
  endTime: new Date("2024-01-15T22:00:00"),
  useSameLocation: false,
  useSameTime: false,
  dateSpecificOptions: {
    "2024-01-15": {
      location: "Location A",
      startTime: new Date("2024-01-15T18:00:00"),
      endTime: new Date("2024-01-15T22:00:00")
    },
    "2024-01-22": {
      location: "Location B",
      startTime: new Date("2024-01-22T19:00:00"),
      endTime: new Date("2024-01-22T23:00:00")
    }
  }
};
```

## Troubleshooting

### **Common Issues**
1. **Event not saving**: Check database permissions and RLS policies
2. **Time picker not working**: Verify ScrollableTimePicker component integration
3. **RSVPs not updating**: Check Supabase subscription setup
4. **Date selection issues**: Verify calendar component state management

### **Debug Steps**
1. Check browser console for errors
2. Verify Supabase connection and authentication
3. Test database queries directly
4. Check component prop passing
5. Verify state management flow

## Conclusion

The Event System provides a robust, scalable solution for event management that integrates seamlessly with the existing application architecture. It follows established patterns, maintains consistent styling, and provides a smooth user experience from creation to participation.

The system is designed to be extensible, allowing for future enhancements while maintaining the current functionality and performance standards.
