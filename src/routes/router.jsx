import { createBrowserRouter, Navigate } from "react-router-dom";
// Auth
import PrivateRoute from "../auth/PrivateRoute";
import Login from "../auth/login.jsx";
import Register from "../auth/register.jsx";
import ForgotPassword from "../auth/forgotpassword.jsx";

// Layouts
import { MainLayout } from "../components/Layout/mainLayout.jsx";

// Pages
// Pages
import Dashboard from "../pages/dashboard.jsx";
import SupervisorReview from "../pages/supervisorReview.jsx";
import InspectionCalendar from "../pages/InspectionCalendar.jsx";
import InspectionReportHistory from "../pages/InspectionHistory";
import NotificationsPage from "../pages/Notifications";
import EquipmentRegistration from "../pages/EquipmentRegistration.jsx";

// New Pages (Inspector)
import InspectionForm from "../pages/InspectionForm.jsx";
import EditInspectionForm from "../pages/EditInspectionForm.jsx";
import ReportSubmission from "../pages/ReportSubmission.jsx";
import InspectionExecution from "../pages/InspectionExecution.jsx";
import InspectionDraftPreview from "../pages/InspectionDraftPreview.jsx";

// New Pages (Supervisor)

import TaskMonitoring from "../pages/supervisor/TaskMonitoring.jsx";

// New Pages (Admin)
import UserManagement from "../pages/admin/UserManagement.jsx";

// Other / Shared
import DocumentUploadManagement from "../pages/FileUpload.jsx";
import CustomerFeedback from "../pages/CustomerFeedback.jsx";
import OtherSettings from "../pages/OtherSettings.jsx";
import UserProfile from "../pages/UserProfile.jsx";
import Storage from "../pages/Storage.jsx";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/forgot-password", element: <ForgotPassword /> },

  {
    element: <PrivateRoute />, // <-- check if logged in
    children: [
      {
        // APP LAYOUT (Dashboard, History, Settings)
        element: <MainLayout />,
        children: [
          // --- SHARED / COMMON ---
          { path: "/dashboard", element: <Dashboard /> },
          { path: "/notification", element: <NotificationsPage /> },
          { path: "/other-settings", element: <OtherSettings /> },
          { path: "/storage", element: <Storage /> },

          // --- INSPECTOR (I) ---
          { path: "/equipment", element: <EquipmentRegistration /> },
          { path: "/inspection-plan", element: <InspectionCalendar /> }, // "View Assigned Schedule"
          {
            path: "/inspection-form",
            element: <InspectionForm />,
          },
          {
            path: "/edit-inspection",
            element: <EditInspectionForm />,
          },
          {
            path: "/report-submission",
            element: <ReportSubmission />,
          }, // "Generate Report"
          { path: "/inspection-history", element: <InspectionReportHistory /> }, // "History"

          // New Execution Flows
          { path: "/inspection-execution/:id", element: <InspectionExecution /> },
          { path: "/inspection-draft/:id", element: <InspectionDraftPreview /> },


          // --- SUPERVISOR (I.S) ---
          // Dashboard & Notification shared above

          { path: "/task-monitoring", element: <TaskMonitoring /> },
          { path: "/supervisor-review", element: <SupervisorReview /> },

          // --- ADMIN (A) ---
          // Dashboard shared above
          { path: "/user-management", element: <UserManagement /> },
          // (OtherSettings could be merged here or kept separate)
          { path: "/other-settings", element: <OtherSettings /> },

          // --- OTHERS / MANAGEMENT ---
          { path: "/document-upload", element: <DocumentUploadManagement /> },
          { path: "/customer-feedback", element: <CustomerFeedback /> },
          { path: "/user-profile", element: <UserProfile /> },
          // Default redirect
          {
            path: "/",
            element: <Navigate to="/inspection-plan" replace />,
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