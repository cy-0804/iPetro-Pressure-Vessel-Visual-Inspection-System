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
} from "@tabler/icons-react";
import { ScrollArea } from "@mantine/core";
import classes from "./sideBar.module.css";
import { NavLink } from "react-router-dom";

const pages = [
  { link: "/dashboard", label: "Dashboard & Analytics", icon: IconDashboard },
  { link: "/notification", label: "Notification and Reminder", icon: IconBellRinging },
  { link: "/equipment-registration", label: "Equipment Registration", icon: IconSettingsPlus },
  { link: "/report-generation", label: "Report Generation", icon: IconReportMedical },
  { link: "/inspection-plan", label: "Inspection Plan", icon: IconKey },
  { link: "/inspection-history", label: "Inspection History", icon: IconHistory },
  { link: "/supervisor-review", label: "Supervisor Review", icon: IconCopyCheck },
  { link: "/document-upload", label: "Document Upload", icon: IconUpload },
  { link: "/inspection-form", label: "Inspection Form", icon: IconClipboardText },
  { link: "/other-settings", label: "Other Settings", icon: IconSettings },
];

export function SideBar({ toggle }) {
  const links = pages.map((item) => (
    <NavLink
      key={item.label}
      to={item.link}
      // Close sidebar on mobile when a link is clicked
      onClick={() => {
        if (window.innerWidth < 768 && toggle) toggle(); 
      }}
      className={({ isActive }) =>
        `${classes.link} ${isActive ? classes.linkActive : ""}`
      }
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </NavLink>
  ));

  return (
    // ScrollArea handles overflowing content if list is too long
    <ScrollArea className={classes.navbarMain}>
      {links}
    </ScrollArea>
  );
}