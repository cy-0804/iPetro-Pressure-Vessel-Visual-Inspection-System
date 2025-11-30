
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layouts & Guards
// import ProtectedRoute from './ProtectedRoute';
import { MainLayout } from "../components/Layout/MainLayout.jsx";


// Pages
// import login from '@/auth/login';
import Dashboard from '../pages/Dashboard.jsx';
import SupervisorReview from '../pages/supervisorReview.jsx';
import InspectionCalendar from '../pages/InspectionCalendar.jsx';
import DocumentUploadManagement from '../pages/DocUpload.jsx';
// import GeneratorPage from '@/pages/GeneratorPage';

export const router = createBrowserRouter([
  // 1. PUBLIC ROUTES (Accessible by anyone)
  // {
  //   path: '/login',
  //   element: <LoginPage />,
  // },

  // 2. PROTECTED ROUTES (Must be logged in)
  {
    // element: <ProtectedRoute />, // 🔒 The Bouncer checks ID here
    // children: [
    //   {
    // ☝☝ uncomment these lines if you want to enable ProtectedRoute

        
        // 3. APP LAYOUT (Dashboard, History, Settings)
        // This applies the Sidebar/Navbar to everything inside
        element: <MainLayout />, 
        children: [
          {
            path: '/dashboard',
            element: <Dashboard />,
          },
          {
            path: '/:pageName',
            element: <div>History Page</div>,
          },
          {
            path: '/notification',
            element: <div>Notification and Reminder</div>,
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
            element: <div>Inspection History & Data Storage</div>,
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
          // Default redirect: If they go to /, send them to dashboard
          {
            path: '/',
            element: <Navigate to="/dashboard" replace />,
          },
        ],

    //   },
    // ],
    // ☝☝ uncomment these lines if you want to enable ProtectedRoute

  },

  // 5. 404 Page (Catch all)
  {
    path: '*',
    element: <div>404 - Page Not Found</div>,
  },
]);