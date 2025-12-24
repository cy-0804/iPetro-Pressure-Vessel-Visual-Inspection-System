import React, { useState } from "react";
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
  IconCloudFog,
  IconChevronDown,
  IconChevronRight
} from "@tabler/icons-react";
import { ScrollArea, Stack, Text, Box, Collapse } from "@mantine/core";
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
      { link: "/storage", label: "Storage", icon: IconCloudFog },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
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
      { link: "/inspection-plan", label: "Inspection Schedule", icon: IconKey },
      {
        link: "/equipment",
        label: "Equipment Details",
        icon: IconSettingsPlus,
      },
      {
        link: "/inspection-form",
        label: "Inspection Form",
        icon: IconClipboardText,
      },
      {
        link: "/report-generation",
        label: "Generate Report",
        icon: IconReportMedical,
      },
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
      {
        link: "/supervisor-review",
        label: "Review Reports",
        icon: IconCopyCheck,
      },
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
  // All sections start open by default
  const [expandedSections, setExpandedSections] = useState({
    "MAIN": true,
    "ADMINISTRATION": true,
    "EQUIPMENT & INSPECTION": true,
    "MANAGEMENT": true,
  });

  const toggleSection = (sectionTitle) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle],
    }));
  };

  // Filter sections based on role
  const filteredSections = menuSections.filter((section) => {
    if (section.title.includes("MAIN")) return true;

    const userRole = role?.toLowerCase();

    if (userRole === "admin") return true;

    if (userRole === "supervisor") {
      return (
        section.title.includes("MANAGEMENT") ||
        section.title.includes("EQUIPMENT & INSPECTION")
      );
    }

    if (userRole === "inspector") {
      return section.title.includes("EQUIPMENT & INSPECTION");
    }

    return false;
  });

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