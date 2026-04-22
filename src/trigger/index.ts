import { schedules, task } from "@trigger.dev/sdk/v3";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const AUTH = `Bearer ${process.env.TRIGGER_SECRET_KEY}`;

// Scan signals every 6 hours
export const scanSignalsTask = schedules.task({
  id: "scan-signals",
  cron: "0 */6 * * *",
  run: async () => {
    const res = await fetch(`${BASE_URL}/api/cron/scan-signals`, {
      method: "POST",
      headers: { Authorization: AUTH },
    });
    return res.json();
  },
});

// Generate daily content at 4 AM IST (22:30 UTC previous day)
export const generateDailyContentTask = schedules.task({
  id: "generate-daily-content",
  cron: "30 22 * * *",
  run: async () => {
    const res = await fetch(`${BASE_URL}/api/cron/generate-content`, {
      method: "POST",
      headers: { Authorization: AUTH, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    return res.json();
  },
});

// Send scheduled posts every 5 minutes
export const sendScheduledPostsTask = schedules.task({
  id: "send-scheduled-posts",
  cron: "*/5 * * * *",
  run: async () => {
    const res = await fetch(`${BASE_URL}/api/cron/send-posts`, {
      method: "POST",
      headers: { Authorization: AUTH },
    });
    return res.json();
  },
});

// Fetch analytics hourly
export const fetchAnalyticsTask = schedules.task({
  id: "fetch-analytics",
  cron: "0 * * * *",
  run: async () => {
    const res = await fetch(`${BASE_URL}/api/cron/fetch-analytics`, {
      method: "POST",
      headers: { Authorization: AUTH },
    });
    return res.json();
  },
});
