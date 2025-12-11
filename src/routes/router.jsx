
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layouts
import { MainLayout } from "../components/Layout/MainLayout.jsx";

// Pages
import Dashboard from '../pages/dashboard.jsx';
import SupervisorReview from '../pages/supervisorReview.jsx';
import InspectionCalendar from '../pages/InspectionCalendar.jsx';
import InspectionReportHistory from "../pages/InspectionHistory";
import NotificationsPage from "../pages/Notifications";
import DocumentUploadManagement from '../pages/DocUpload.jsx';

export const router = createBrowserRouter([
  {
    // APP LAYOUT (Dashboard, History, Settings)
    element: <MainLayout />,
    children: [
      {
        path: '/dashboard',
        element: <Dashboard />,
      },
      {
        path: '/notification',
        element: <NotificationsPage />,
      },
      {
        path: '/equipment-registration',
        element: <div>Equipment Registration</div>,
      },
      {
        path: '/report-generation',
        element: <div>Report Generation</div>,
      },
      {
        path: '/inspection-plan',
        element: <InspectionCalendar />,
      },
      {
        path: '/inspection-history',
        element: <InspectionReportHistory />,
      },
      {
        path: '/supervisor-review',
        element: <SupervisorReview />,
      },
      {
        path: '/document-upload',
        element: <DocumentUploadManagement />,
      },
      {
        path: '/inspection-form',
        element: <div>Inspection Form Module</div>,
      },
      {
        path: '/other-settings',
        element: <div>Other Settings</div>,
      },
      // Default redirect
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
  // 404 Page
  {
    path: '*',
    element: <div>404 - Page Not Found</div>,
  },
]);