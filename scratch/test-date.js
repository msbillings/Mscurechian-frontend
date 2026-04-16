const date = new Date("2026-04-16T07:01:00.000Z");
console.log("Local time:", date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
console.log("System Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
