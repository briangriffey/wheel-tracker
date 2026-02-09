# Notification System

The Wheel Tracker notification system provides real-time alerts and in-app notifications to keep users informed about important trading events.

## Features

### In-App Notifications
- **Bell Icon**: Notification bell in the header with unread count badge
- **Dropdown Panel**: Quick view of recent notifications
- **Notification Page**: Full list of all notifications with filtering
- **Mark as Read**: Individual and bulk mark as read functionality

### Dashboard Alerts Widget
- **Action Required Section**: Shows actionable items on the dashboard
- **Quick Links**: Click to view details or take action
- **Color-coded Alerts**: Different colors for different notification types

### Notification Types

1. **Expiring Soon** (Yellow)
   - Triggered when options expire within 3 days
   - Helps users take action before expiration

2. **In-The-Money** (Blue)
   - Triggered when options are ITM at expiration
   - Alerts users to potential assignment

3. **No Covered Call** (Green)
   - Triggered when positions have been without covered calls for 7+ days
   - Identifies opportunities to generate premium

4. **Assignment** (Purple)
   - Triggered when options are assigned
   - Notifies users of position changes

5. **General** (Gray)
   - General notifications and system messages

## Architecture

### Database Schema

```prisma
model Notification {
  id                String           @id @default(cuid())
  userId            String
  type              NotificationType
  title             String
  message           String
  read              Boolean          @default(false)
  actionUrl         String?
  relatedTradeId    String?
  relatedPositionId String?
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  user              User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, read])
  @@index([createdAt])
  @@index([userId, createdAt])
}

enum NotificationType {
  EXPIRING_SOON
  ITM_OPTION
  NO_COVERED_CALL
  ASSIGNMENT
  GENERAL
}
```

### Components

#### `NotificationBell` (Header)
Location: `components/layout/notification-bell.tsx`

- Client component that displays the bell icon
- Polls for unread count every 60 seconds
- Opens dropdown panel when clicked
- Shows unread count badge

#### `NotificationPanel` (Dropdown)
Location: `components/notifications/notification-panel.tsx`

- Displays recent notifications (up to 10)
- Closes when clicking outside
- Mark individual notifications as read
- Mark all notifications as read
- Link to full notification page

#### `NotificationList` (Full Page)
Location: `components/notifications/notification-list.tsx`

- Displays all notifications
- Filter by all/unread
- Mark as read functionality
- Color-coded by type
- Click to navigate to related items

#### `AlertsWidget` (Dashboard)
Location: `components/dashboard/alerts-widget.tsx`

- Shows actionable alerts on dashboard
- Groups by notification type
- Links to related trades/positions
- Shows count for each category

### Server Actions

Location: `lib/actions/notifications.ts`

- `getUnreadNotificationCount()` - Get count of unread notifications
- `getRecentNotifications(limit)` - Get recent notifications
- `getAllNotifications()` - Get all notifications
- `markNotificationAsRead(id)` - Mark single notification as read
- `markAllNotificationsAsRead()` - Mark all as read
- `getUpcomingExpirations(days)` - Get expiring options
- `getITMOptions()` - Get in-the-money options
- `getPositionsWithoutCalls()` - Get positions without covered calls

### Notification Triggers

Location: `lib/notifications/triggers.ts`

- `generateExpiringNotifications(userId)` - Create expiring option notifications
- `generateITMNotifications(userId)` - Create ITM option notifications
- `generateNoCoveredCallNotifications(userId)` - Create no covered call notifications
- `generateAllNotifications(userId)` - Run all notification generators

### Cron Job

Location: `app/api/cron/notifications/route.ts`

- Runs daily at 9:00 AM (configured in `vercel.json`)
- Generates notifications for all users
- Secured with `CRON_SECRET` environment variable

```json
{
  "crons": [
    {
      "path": "/api/cron/notifications",
      "schedule": "0 9 * * *"
    }
  ]
}
```

## Usage

### For Users

1. **View Notifications**: Click the bell icon in the header
2. **Mark as Read**: Click on a notification to mark it as read
3. **View All**: Click "View all notifications" to see the full list
4. **Filter**: Use the All/Unread filter on the notifications page
5. **Take Action**: Click on notifications to navigate to related items

### For Developers

#### Creating Notifications

```typescript
import { prisma } from '@/lib/db'

await prisma.notification.create({
  data: {
    userId: 'user-id',
    type: 'EXPIRING_SOON',
    title: 'Option expiring soon',
    message: 'Your AAPL PUT expires in 2 days',
    actionUrl: '/trades/trade-id',
    relatedTradeId: 'trade-id',
  },
})
```

#### Manually Triggering Notifications

```typescript
import { generateAllNotifications } from '@/lib/notifications/triggers'

await generateAllNotifications('user-id')
```

#### Testing Cron Job Locally

```bash
curl -X GET http://localhost:3000/api/cron/notifications \
  -H "Authorization: Bearer your-cron-secret"
```

## Configuration

### Environment Variables

```bash
# Required for cron job authentication
CRON_SECRET="your-cron-secret-here"

# Database connection
DATABASE_URL="postgresql://..."
```

### Notification Settings

Customize notification behavior in `lib/notifications/triggers.ts`:

- **Expiration Warning**: Change days ahead (default: 3 days)
- **No Covered Call**: Change days threshold (default: 7 days)
- **Duplicate Prevention**: Change notification cooldown (default: 24 hours)

## Performance

### Optimizations

1. **Polling**: Bell icon polls every 60 seconds for unread count
2. **Lazy Loading**: Notifications are only fetched when panel is opened
3. **Indexing**: Database indexes on userId, read status, and createdAt
4. **Batching**: Cron job processes all users in parallel
5. **Caching**: ISR cache on dashboard page (60 seconds)

### Monitoring

Check notification generation logs:

```bash
# View cron job logs in Vercel dashboard
# Or check application logs for:
# - "Starting notification generation for X users"
# - "Finished generating notifications for user X"
# - "Notification generation complete: X succeeded, Y failed"
```

## Testing

### Unit Tests

Location: `lib/actions/__tests__/notifications.test.ts`

Run tests:
```bash
pnpm test lib/actions/__tests__/notifications.test.ts
```

### Manual Testing

1. **Create test data**: Add trades and positions with expiring dates
2. **Run cron job**: Manually trigger the cron endpoint
3. **Check notifications**: Open the bell icon dropdown
4. **Verify alerts**: Check dashboard alerts widget
5. **Mark as read**: Test individual and bulk mark as read

### E2E Testing

Create Playwright tests for:
- Notification bell shows unread count
- Dropdown panel displays recent notifications
- Notification page filters work
- Mark as read functionality
- Dashboard alerts widget displays correctly

## Future Enhancements

- [ ] Email notifications with user preferences
- [ ] Push notifications for mobile
- [ ] Custom notification preferences per user
- [ ] Notification grouping and summarization
- [ ] Webhook support for external integrations
- [ ] Notification templates with personalization
- [ ] Archive/delete functionality
- [ ] Notification analytics and insights

## Troubleshooting

### Notifications not appearing

1. Check database connection
2. Verify user ID is correct
3. Check notification table has records
4. Verify bell icon is polling correctly

### Unread count not updating

1. Check browser console for errors
2. Verify API endpoints are working
3. Clear browser cache
4. Check network tab for failed requests

### Cron job not running

1. Verify `vercel.json` configuration
2. Check `CRON_SECRET` environment variable
3. View Vercel cron job logs
4. Manually test the endpoint

### Performance issues

1. Check database indexes are created
2. Monitor notification table size
3. Consider archiving old notifications
4. Optimize polling frequency if needed

## API Reference

### GET `/api/cron/notifications`

Generates notifications for all users.

**Headers:**
- `Authorization: Bearer <CRON_SECRET>`

**Response:**
```json
{
  "success": true,
  "message": "Notification generation complete",
  "stats": {
    "total": 10,
    "successful": 10,
    "failed": 0
  }
}
```

### Server Actions

All server actions return:
```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown }
```

See `lib/actions/notifications.ts` for full API documentation.
