# LoungeLink POS

A modern offline-first PlayStation Lounge Management System built with React, TypeScript, TailwindCSS, and IndexedDB.

## Overview

LoungeLink POS is a complete management solution for PlayStation lounges and gaming centers. The system allows operators to manage room sessions, track inventory, generate receipts, monitor revenue, and operate entirely offline without requiring an internet connection.

Designed with future scalability in mind, the architecture supports migration to cloud platforms such as Firebase while maintaining full offline functionality.

## Key Features

### Room Management

* Real-time room timers
* Start, pause, resume, and end sessions
* Room-specific hourly pricing
* Maintenance mode
* Custom room names and categories
* Live session tracking

### Inventory Management

* Inventory categories
* Stock quantity tracking
* Low stock alerts
* Favorite items for quick access
* Product management dashboard

### Checkout & Receipts

* Automatic session cost calculation
* Item billing
* Discount support
* Receipt generation
* Thermal printer support
* Receipt history

### Reporting & Analytics

* Revenue tracking
* Session statistics
* Payment method breakdown
* Business performance reporting

### Multi-Language Support

* English
* Arabic
* RTL (Right-To-Left) Support

### Offline First Architecture

* IndexedDB local storage
* Persistent data storage
* Automatic recovery after refresh
* Backup and restore support

## Technology Stack

* React
* TypeScript
* Vite
* TailwindCSS
* IndexedDB

## Screenshots

### Admin Dashboard

![Admin Dashboard](screenshots/dashboardadmin.JPG)

### Cashier Dashboard

![Cashier Dashboard](screenshots/Dashboard%20cashier.JPG)

### Inventory Management

![Inventory](screenshots/inventory.JPG)

### Checkout

![Checkout](screenshots/checkout.PNG)

### Receipts

![Receipts](screenshots/recipts.JPG)

### Settings

![Settings](screenshots/settings.JPG)

### Statistics

![Statistics](screenshots/statics.JPG)

### Audit Logs

![Audit Logs](screenshots/logs.JPG)

## Installation

```bash
npm install
npm run dev
```

## Future Roadmap

* Firebase synchronization
* Multi-device support
* Cloud backups
* User authentication
* Mobile companion application
* WhatsApp integration

## License

Portfolio Project by Ebram Sherif
