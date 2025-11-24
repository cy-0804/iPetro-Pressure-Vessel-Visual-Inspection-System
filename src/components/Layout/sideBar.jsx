import React, { useState } from "react";
import {
  IconCopyCheck,
  IconDashboard,
  IconBellRinging,
  IconHistory,
  IconReportMedical,
  IconKey,
  IconUpload,
  IconLogout,
  IconClipboardText,
  IconSettingsPlus,
  IconSettings,
  IconSwitchHorizontal,
} from "@tabler/icons-react";
import { Code, Group, Text, Image } from "@mantine/core";
import classes from "./sideBar.module.css";

const data = [
  { link: "/dashboard", label: "Dashboard & Analytics", icon: IconDashboard },
  {
    link: "/notification",
    label: "Notification and Reminder",
    icon: IconBellRinging,
  },
  {
    link: "/equipment-registration",
    label: "Equipment Registration",
    icon: IconSettingsPlus,
  },
  {
    link: "/report-generation",
    label: "Report Generation",
    icon: IconReportMedical,
  },
  {
    link: "/ssh-inspection-plan",
    label: "SSH Inspection Plan Scheduling and Progress Tracking",
    icon: IconKey,
  },
  {
    link: "/inspection-history",
    label: "Inspection History & Data Storage",
    icon: IconHistory,
  },
  {
    link: "/supervisor-review",
    label: "Supervisor Review & Approval",
    icon: IconCopyCheck,
  },
  {
    link: "/document-upload",
    label: "Document Upload & Management",
    icon: IconUpload,
  },
  {
    link: "/inspection-form",
    label: "Inspection Form Module",
    icon: IconClipboardText,
  },
  { link: "/other-settings", label: "Other Settings", icon: IconSettings },
];

export function SideBar() {
  const [active, setActive] = useState("Dashboard & Analytics");

  const links = data.map((item) => (
    <a
      className={classes.link}
      data-active={item.label === active || undefined}
      href={item.link}
      key={item.label}
      onClick={(event) => {
        event.preventDefault();
        setActive(item.label);
      }}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </a>
  ));

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        <Group className={classes.header} justify="space-between">
        <Text fw={700} size="lg" c="myTeal">Name</Text>
        </Group>
        {links}
      </div>

    
    </nav>
  );
}
