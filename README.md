# RupeeBook - Your Modern Accounting PWA

RupeeBook is a powerful, installable Progressive Web App (PWA) designed for seamless, modern accounting. Built with a focus on performance and user experience, it functions just like a native application on both mobile and desktop devices, even when you're offline.

This application is built with Next.js, React, Firebase, ShadCN UI, and Tailwind CSS.

## Core Features

### 1. True Native App Experience (PWA)
- **Installable:** Install RupeeBook on your phone's home screen or your computer's desktop for instant access.
- **Fully Offline Capable:** The app works flawlessly without an internet connection. You can view all your data, add new transactions, and make edits while offline.
- **Automatic Data Syncing:** All changes made offline are automatically and securely synced with the cloud database the moment you reconnect to the internet.

### 2. Powerful User & Role Management
RupeeBook features a sophisticated role-based access control system to manage your team effectively.
- **Owner:** The highest level of authority with full control over all workspaces, books, and members.
- **Admin:** A trusted manager who can create their own workspaces, books, and manage a team of Viewers and Data Operators.
- **Viewer:** A read-only role, perfect for users who need to see data and generate reports but not make any changes.
- **Data Operator:** A specialized role for data entry with highly customizable permissions.

### 3. Customizable Data Operator Role
Tailor the Data Operator role to fit your exact business needs. The Owner can restrict their ability to:
- Add backdated entries (with options for "Always", "Never", or "One Day Before").
- See net balances and download reports.
- View entries created by other members.
- Edit their own entries.

### 4. Flexible Workspace & Book Organization
- **Workspaces:** Organize your RupeeBooks into different workspaces, such as "Personal" or "Business," to keep your finances neatly separated.
- **Multi-Book Support:** Create an unlimited number of RupeeBooks within each workspace for different projects, accounts, or purposes.

### 5. Advanced Data Management
- **Backup & Restore:** Create a full backup of your entire application data (including all workspaces, books, members, and transactions) into a single JSON file.
- **Selective Restore:** Instead of overwriting everything, you can choose to restore only specific workspaces or books from your backup file, giving you granular control.
- **Import from CSV:** Easily import transactions into any RupeeBook from a CSV file with an intuitive column-mapping wizard.

### 6. Comprehensive Reporting & Export
- **Multiple Report Types:** Generate detailed reports including "All Entries," "Day-wise Summary," and "Category-wise Summary."
- **Advanced Filtering:** Drill down into your data with powerful filters for date range, entry type, category, subcategory, and member.
- **PDF & Excel Export:** Export any report to either a professionally formatted PDF or an Excel spreadsheet for further analysis.
- **Customizable PDF Layout:** Configure which columns appear on your PDF reports to tailor them to your needs.

### 7. Multi-Language Support
- The entire user interface is available in both **English** and **Gujarati (ગુજરાતી)**, with the ability to switch languages instantly from the preferences menu.

## Getting Started with Development

To run the application in a development environment, use the following command:

```bash
npm run dev
```
