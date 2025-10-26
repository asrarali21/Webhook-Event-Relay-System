# Webhook Management Frontend

A modern React-based dashboard for managing webhook subscriptions and monitoring delivery logs.

## Features

- **Dashboard**: Real-time statistics and recent activity monitoring
- **Delivery Logs**: Comprehensive log viewing with retry functionality
- **Subscriptions**: Full CRUD operations for webhook subscriptions
- **Real-time Updates**: Live data fetching with refresh capabilities
- **Responsive Design**: Mobile-friendly interface built with Tailwind CSS

## Tech Stack

- React 19 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- ShadCN UI components
- TanStack Table for data grids
- Axios for API communication
- Sonner for toast notifications

## Getting Started

### Prerequisites

- Node.js 18+ 
- Backend API running on `http://localhost:3001`

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

## API Integration

The frontend connects to the backend API at `http://localhost:3001/api/v1/admin` and includes:

- **GET /stats** - System statistics
- **GET /delivery-logs** - Paginated delivery logs with filtering
- **POST /delivery-logs/:logId/retry** - Retry failed deliveries
- **GET /subscriptions** - Paginated subscriptions with filtering
- **POST /subscriptions** - Create new subscriptions
- **PUT /subscriptions/:id** - Update subscriptions
- **DELETE /subscriptions/:id** - Delete subscriptions

## Components

### Dashboard
- Real-time statistics cards
- Recent activity feed
- System health indicators
- Refresh functionality

### Delivery Logs
- Data table with sorting and filtering
- Status badges with color coding
- Retry functionality for failed deliveries
- Search and pagination

### Subscriptions
- Data table with CRUD operations
- Create/Edit dialogs
- Status management
- Search and filtering

## Development

The project uses:
- ESLint for code linting
- TypeScript for type safety
- Tailwind CSS for styling
- Vite for fast development builds

Run linting:
```bash
npm run lint
```