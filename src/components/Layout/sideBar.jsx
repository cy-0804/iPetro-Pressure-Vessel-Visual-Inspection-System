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
    ]
  },
  {
    title: "EQUIPMENT & INSPECTION",
    items: [
      { link: "/equipment", label: "Equipment Registry", icon: IconSettingsPlus },
      { link: "/inspection-plan", label: "Inspection Plan", icon: IconKey },
      { link: "/inspection-form", label: "Inspection Form", icon: IconClipboardText },
      { link: "/inspection-history", label: "History", icon: IconHistory },
    ]
  },
  {
    title: "REPORTS & REVIEW",
    items: [
      { link: "/report-generation", label: "Generate Reports", icon: IconReportMedical },
      { link: "/supervisor-review", label: "Supervisor Review", icon: IconCopyCheck },
    ]
  },
  {
    title: "MANAGEMENT",
    items: [
      { link: "/document-upload", label: "Documents", icon: IconUpload },
      { link: "/customer-feedback", label: "Feedback & QA", icon: IconMessage2 },
      { link: "/other-settings", label: "Settings", icon: IconSettings },
    ]
  }
];

export function SideBar({ toggle }) {
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

      {/* Navigation */}
      <ScrollArea className={classes.navbarMain}>
        <Stack gap="xl">
          {menuSections.map((section, idx) => (
            <Box key={idx}>
              <Text 
                size="10px" 
                fw={700} 
                tt="uppercase" 
                c="#868e96"
                mb="sm"
                px="md"
                style={{ letterSpacing: '0.8px' }}
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