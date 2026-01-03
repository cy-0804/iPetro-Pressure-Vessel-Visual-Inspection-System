import React, { useState } from "react";
import {
  IconCopyCheck,
  IconDashboard,
  IconBellRinging,
  IconHistory,
  IconReportMedical,
  IconUpload,
  IconClipboardText,
  IconClipboardList,
  IconSettingsPlus,
  IconSettings,
  IconMessage2,
  IconUser,
  IconCloudFog,
  IconChevronDown,
  IconChevronRight,
  IconUserCog,
  IconDeviceDesktopAnalytics,
  IconCalendarCheck,
  IconChecklist,
} from "@tabler/icons-react";
import { ScrollArea, Stack, Text, Box, Collapse } from "@mantine/core";
import classes from "./sideBar.module.css";
import { NavLink } from "react-router-dom";

const menuSections = [
  {
    title: "MAIN",
    items: [
      { link: "/dashboard", label: "Dashboard", icon: IconDashboard },
      {
        link: "/inspection-plan",
        label: "Inspection Schedule",
        icon: IconCalendarCheck,
      },
      {
        link: "/task-monitoring",
        label: "Task Monitoring",
        icon: IconDeviceDesktopAnalytics,
        roles: ["admin", "supervisor"],
      },
      { link: "/notification", label: "Notifications", icon: IconBellRinging },
    ],
  },
  {
    title: "EQUIPMENT & INSPECTION",
    items: [
      {
        link: "/inspection-form",
        label: "Inspection Form",
        icon: IconClipboardText,
      },
      {
        link: "/equipment",
        label: "Equipment Details",
        icon: IconSettingsPlus,
      },
      { link: "/document-upload", label: "Document Upload", icon: IconUpload },
      {
        link: "/report-submission",
        label: "Report Submission",
        icon: IconReportMedical,
        roles: ["admin", "inspector"],
      },
      {
        link: "/inspection-history",
        label: "Inspection History",
        icon: IconHistory,
      },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      {
        link: "/user-management",
        label: "User Management",
        icon: IconUserCog,
        roles: ["admin"],
      },
      {
        link: "/audit-logs",
        label: "Audit Logs",
        icon: IconClipboardList,
        roles: ["admin"],
      },
    ],
  },
  {
    title: "MANAGEMENT & REPORTING",
    items: [
      {
        link: "/supervisor-review",
        label: "Review Reports",
        icon: IconCopyCheck,
        roles: ["admin", "supervisor"], // Only for admin and supervisor
      },
    ],
  },

  {
    title: "SETTINGS",
    items: [
      {
        link: "/storage",
        label: "Storage",
        icon: IconCloudFog,
        roles: ["admin"],
      },
      { link: "/user-profile", label: "My Profile", icon: IconUser },
      {
        link: "/other-settings",
        label: "Other Settings",
        icon: IconSettings,
      },
    ],
  },
];

export function SideBar({ toggle, role }) {
  // All sections start close by default
  const [expandedSections, setExpandedSections] = useState({
    MAIN: false,
    ADMINISTRATION: false,
    "EQUIPMENT & INSPECTION": false,
    "MANAGEMENT & REPORTING": false,
    SETTINGS: false,
  });

  const toggleSection = (sectionTitle) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle],
    }));
  };

  const userRole = role?.toLowerCase();

  // Filter sections based on role
  const filteredSections = menuSections
    .map((section) => {
      // Filter items within each section based on role
      const filteredItems = section.items.filter((item) => {
        // If item has roles restriction, check if user's role is allowed
        if (item.roles && item.roles.length > 0) {
          return item.roles.includes(userRole);
        }
        // If no roles restriction, item is visible to all
        return true;
      });

      return {
        ...section,
        items: filteredItems,
      };
    })
    .filter((section) => {
      // Remove sections based on role
      if (section.title.includes("MAIN")) return true;
      if (section.title.includes("SETTINGS")) return true;

      if (userRole === "admin") return true;

      if (userRole === "supervisor") {
        return (
          section.title.includes("MANAGEMENT & REPORTING") ||
          section.title.includes("EQUIPMENT & INSPECTION")
        );
      }

      if (userRole === "inspector") {
        return (
          section.title.includes("EQUIPMENT & INSPECTION") ||
          section.title.includes("MANAGEMENT & REPORTING")
        );
      }

      return false;
    })
    .filter((section) => section.items.length > 0); //  Remove empty sections

  return (
    <Box className={classes.sidebarContainer}>
      <ScrollArea className={classes.navbarMain}>
        <Stack gap="xl">
          {filteredSections.map((section, idx) => (
            <Box key={idx}>
              {/* Section Header with Dropdown */}
              <Box
                className={classes.sectionHeader}
                onClick={() => toggleSection(section.title)}
              >
                <Text
                  size="10px"
                  fw={700}
                  tt="uppercase"
                  c="#868e96"
                  style={{ letterSpacing: "0.8px" }}
                >
                  {section.title}
                </Text>
                {expandedSections[section.title] ? (
                  <IconChevronDown size={14} color="#868e96" />
                ) : (
                  <IconChevronRight size={14} color="#868e96" />
                )}
              </Box>

              {/* Collapsible Items */}
              <Collapse in={expandedSections[section.title]}>
                <Stack gap={2} mt="sm">
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
              </Collapse>
            </Box>
          ))}
        </Stack>
      </ScrollArea>
    </Box>
  );
}
