import { createBrowserRouter, Navigate } from "react-router-dom";
// Auth
import PrivateRoute from "../auth/PrivateRoute";
import Login from "../auth/login.jsx";
import Register from "../auth/register.jsx";

// Layouts
import { MainLayout } from "../components/Layout/mainLayout.jsx";

// Pages
import Dashboard from "../pages/dashboard.jsx";
import SupervisorReview from "../pages/supervisorReview.jsx";
import InspectionCalendar from "../pages/InspectionCalendar.jsx";
import InspectionReportHistory from "../pages/InspectionHistory";
import NotificationsPage from "../pages/Notifications";
import DocumentUploadManagement from "../pages/FileUpload.jsx";
import Storage from "../pages/Storage.jsx";
import EquipmentRegistration from "../pages/EquipmentRegistration.jsx";
import UserProfile from "../pages/UserProfile.jsx";
import OtherSettings from "../pages/OtherSettings.jsx";

// Your new pages (from isaac-work)
import InspectionForm from "../pages/InspectionForm.jsx";
import CustomerFeedback from "../pages/CustomerFeedback.jsx";
import ReportGeneration from "../pages/ReportGeneration.jsx";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },

  {
    element: <PrivateRoute />, // <-- check if logged in
    children: [
      {
        // APP LAYOUT (Dashboard, History, Settings)
        element: <MainLayout />,
        children: [
          { path: "/dashboard", element: <Dashboard /> },
          { path: "/notification", element: <NotificationsPage /> },

          // IMPORTANT: keep this path as /equipment (same as main)
          { path: "/equipment", element: <EquipmentRegistration /> },

          { path: "/report-generation", element: <ReportGeneration /> },
          { path: "/inspection-plan", element: <InspectionCalendar /> },

          // IMPORTANT: keep this as InspectionReportHistory (same as main)
          { path: "/inspection-history", element: <InspectionReportHistory /> },

          { path: "/supervisor-review", element: <SupervisorReview /> },
          { path: "/document-upload", element: <DocumentUploadManagement /> },

          // Your new modules
          { path: "/inspection-form", element: <InspectionForm /> },
          { path: "/customer-feedback", element: <CustomerFeedback /> },

          { path: "/other-settings", element: <OtherSettings /> },

          { path: "/storage", element: <Storage /> },
          
          {path: "/user-profile", element: <UserProfile />},
          // Default redirect
          {
            path: "/",
            element: <Navigate to="/login" replace />,
          },
        ],
      },
    ],
  },
  // 404 Page
  {
    path: "*",
    element: <div>404 - Page Not Found</div>,
  },
]);
