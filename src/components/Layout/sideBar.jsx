import React from "react";
import {
  IconCopyCheck,
  IconDashboard,
  IconBellRinging,
  IconHistory,
  IconReportMedical,
  IconKey,
  IconUpload,
  IconClipboardText,
  IconSettingsPlus,
  IconSettings,
  IconMessage2,
  IconUser,
} from "@tabler/icons-react";
import { ScrollArea, Stack, Text, Box, Image } from "@mantine/core";
import classes from "./sideBar.module.css";
import { NavLink } from "react-router-dom";

const menuSections = [
  {
    title: "MAIN",
    items: [
      { link: "/dashboard", label: "Dashboard", icon: IconDashboard },
      { link: "/notification", label: "Notifications", icon: IconBellRinging },
      {
        link: "/other-settings",
        label: "Other Settings",
        icon: IconSettings,
      },
      { link: "/user-profile", label: "My Profile", icon: IconUser },
      { link: "/document-upload", label: "Document Upload", icon: IconUpload },
      { link: "/customer-feedback", label: "Feedback", icon: IconMessage2 },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      // User Management
      {
        link: "/user-management",
        label: "User Management",
        icon: IconSettingsPlus,
      },
    ],
  },
  {
    title: "EQUIPMENT & INSPECTION",
    items: [
      // View Assigned Schedule & Task Details
      { link: "/inspection-plan", label: "Inspection Schedule", icon: IconKey },
      {
        link: "/equipment",
        label: "Equipment Details",
        icon: IconSettingsPlus,
      },

      // Inspection Execution
      {
        link: "/inspection-form",
        label: "Inspection Form",
        icon: IconClipboardText,
      },

      // Generate Report
      {
        link: "/report-generation",
        label: "Generate Report",
        icon: IconReportMedical,
      },

      // History
      {
        link: "/inspection-history",
        label: "Inspection History",
        icon: IconHistory,
      },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
      // Report Review & Approved
      {
        link: "/supervisor-review",
        label: "Review Reports",
        icon: IconCopyCheck,
      },
      // Planning
      {
        link: "/task-planning",
        label: "Task Planning",
        icon: IconClipboardText,
      },
      { link: "/task-monitoring", label: "Task Monitoring", icon: IconHistory },
    ],
  },
];

export function SideBar({ toggle, role }) {
  // Filter sections based on role
  const filteredSections = menuSections.filter((section) => {
    // 1. Shared is always visible
    if (section.title.includes("MAIN")) return true;

    // 2. Normalize role
    const userRole = role?.toLowerCase();

    // 3. Admin sees everything
    if (userRole === "admin") return true;

    // 4. Supervisor sees Supervisor + Inspector
    if (userRole === "supervisor") {
      return (
        section.title.includes("MANAGEMENT") ||
        section.title.includes("EQUIPMENT & INSPECTION")
      );
    }

    // 5. Inspector sees Inspector only (plus shared)
    if (userRole === "inspector") {
      return section.title.includes("EQUIPMENT & INSPECTION");
    }

    return false;
  });

  return (
    <Box className={classes.sidebarContainer}>
      {/* Logo Section */}
      {/* <Box className={classes.logoSection}>
        <Image
          src="/src/assets/ipetro-logo.png"
          w={110}
          fit="contain"
          alt="IPETRO Logo"
        />
        <Text size="xs" c="dimmed" mt={8} style={{ letterSpacing: '0.3px' }}>
          Inspection Management System
        </Text>
      </Box> */}

      <ScrollArea className={classes.navbarMain}>
        <Stack gap="xl">
          {filteredSections.map((section, idx) => (
            <Box key={idx}>
              <Text
                size="10px"
                fw={700}
                tt="uppercase"
                c="#868e96"
                mb="sm"
                px="md"
                style={{ letterSpacing: "0.8px" }}
              >
                {section.title}
              </Text>
              <Stack gap={2}>
                {section.items.map((item) => (
                  <NavLink
                    key={item.label}
                    to={item.link}
                    onClick={() => {
                      if (window.innerWidth < 768 && toggle) toggle();
                    }}
                    className={({ isActive }) =>
                      `${classes.link} ${isActive ? classes.linkActive : ""}`
                    }
                  >
                    <item.icon className={classes.linkIcon} stroke={1.8} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      </ScrollArea>
    </Box>
  );
}
