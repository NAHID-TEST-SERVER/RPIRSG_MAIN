```
🧠 PROJECT TITLE: Advanced Gamified Dynamic Team Management System (Firebase आधारित)

LANGUAGE: Bangla

TECH STACK:
- Firebase Authentication (Email/Password)
- Firebase Realtime Database
- Mobile First Responsive Web App

==================================================
🔐 AUTHENTICATION SYSTEM (FIREBASE)
==================================================

- Firebase Email/Password Authentication use korte hobe

-------------------------
📝 REGISTRATION
-------------------------
Fields:
- Username (unique)
- Email (unique)
- Password

-------------------------
🔒 PASSWORD POLICY
-------------------------
Password must include:
- At least 1 Uppercase letter
- At least 1 Lowercase letter
- At least 1 Number
- At least 1 Special Character
- Min length: 8
- Max length: 100

❌ Error handling:
- Policy match na korle specific error show korte hobe

-------------------------
🔑 LOGIN SYSTEM
-------------------------
Fields:
- Username OR Email
- Password

👉 Logic:
- Email diye Firebase login
- Username diye login korte hole:
   → Database theke email fetch kore login korte hobe

-------------------------
🛡️ ADMIN LOGIN (HARDCODED)
-------------------------
IF:
Username = NAHIDUL79
Password = 51535759

→ Admin Dashboard open

Else:
→ Normal Firebase login

-------------------------
🔔 LOGIN NOTIFICATION
-------------------------
- Success → "Login Successful"
- Error → "Invalid Credentials"

==================================================
👤 USER SYSTEM
==================================================

Profile Fields:
- Username
- Email
- Profile Picture (upload)
- Diamond
- Rank
- Badges
- Created At

-------------------------
📸 PROFILE IMAGE
-------------------------
- Local upload (mobile/laptop)
- JPG/PNG support

-------------------------
🎁 PROFILE BONUS
-------------------------
- Full profile + image upload:
→ +5 Diamond (one time)

-------------------------
📊 ACTIVITY SYSTEM
-------------------------
- Button: "View Activity"
- Shows:
   - Task booking
   - Submission
   - Approval/Reject
   - Diamond earned
   - Badge unlock

==================================================
📋 TASK SYSTEM
==================================================

Moderator can:
- Create task:
   - Title
   - Description
   - Diamond Reward
   - Deadline

User Flow:
1. Book Task
2. Submit:
   - Drive Link / Text
3. Moderator review

==================================================
📊 MODERATOR PROJECT TABLE (REALTIME DB)
==================================================

Table Columns:
- Serial
- Username
- Task Title
- Book Status
- Submit Status
- Submission Data
- Status
- Action

-------------------------
📌 FLOW
-------------------------

BOOK:
→ Book column active

SUBMIT:
→ Submit column filled
→ Row Light Green
→ Moderator notified

APPROVE:
→ Row Full Green
→ Diamond add
→ Notification sent
→ Move to Approved List (#1, #2...)

REJECT:
→ Row Red
→ Move to Trash

==================================================
🗑️ TRASH SYSTEM
==================================================

- Separate page
- Red rows
- Delete option available

==================================================
💎 DIAMOND SYSTEM
==================================================

- Task approve → Diamond add

-------------------------
⚠️ DECAY SYSTEM
-------------------------
If Diamond ≥ 500:
→ Every 7 days -50

Stop at 450

==================================================
🏅 BADGE SYSTEM (DYNAMIC)
==================================================

User Badge Progression:

5 → Verified

50 → Bronze
+10:
60,70,80,90

100 → Silver
+20:
120,140,160,180

200 → Gold
+30:
230,260,290,320,350,380

400 → Hero
+40:
440,480,520,560,600,640,680

700 → Master
+50:
750,800,850,900,950

1000 → Grand Master

-------------------------
📦 BADGE COLLECTION
-------------------------
- Separate page
- Locked/Unlocked badges

-------------------------
🧑‍💼 MODERATOR BADGE
-------------------------
- Admin assign
- 20+ badges
- Profile corner overlay

==================================================
🏆 LEADERBOARD
==================================================
- Diamond based ranking

==================================================
🔔 NOTIFICATION SYSTEM
==================================================

Trigger:
- Login
- Task submit
- Approve
- Reject
- Badge unlock

==================================================
🧑‍💼 MODERATOR SYSTEM
==================================================
- Task create
- Review system (table)
- Messaging users

==================================================
🛡️ ADMIN SYSTEM
==================================================
- Create moderator
- Assign tasks
- Assign badges

==================================================
📱 UI/UX (STRICT)
==================================================
- Small size UI
- Compact design
- Mobile-first
- Table layout
- No big boxes

==================================================
🔥 ADVANCED FEATURES
==================================================
- Realtime update (Firebase listener)
- Search/filter
- Streak system
- Referral system
- Dark mode

==================================================
🗄️ FIREBASE DATABASE STRUCTURE (SUGGESTION)
==================================================

users/
   userId/
      username
      email
      diamond
      badges
      profileImage

tasks/
   taskId/
      title
      reward
      deadline

submissions/
   submissionId/
      userId
      taskId
      bookTime
      submitTime
      type (text/link)
      content
      status

notifications/
   userId/

==================================================
🔑 FIREBASE CONFIG
==================================================

API_KEY = ""
AUTH_DOMAIN = ""
DATABASE_URL = ""
PROJECT_ID = ""
STORAGE_BUCKET = ""
MESSAGING_SENDER_ID = ""
APP_ID = ""

==================================================
END OF MASTER PROMPT
==================================================
```
