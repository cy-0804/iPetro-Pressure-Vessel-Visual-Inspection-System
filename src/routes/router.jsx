
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layouts & Guards
// import ProtectedRoute from './ProtectedRoute';
import { MainLayout } from "@/components/Layout/mainLayout";


// Pages
// import login from '@/auth/login';
import Dashboard from '@/pages/Dashboard';
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
            path: '/history',
            element: <div>History Page</div>,
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
