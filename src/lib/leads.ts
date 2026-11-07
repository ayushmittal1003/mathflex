// Labels shared by Admin → Leads and its CSV export.
export const LEAD_STATUS_LABEL = { NEW: "New", CONTACTED: "Contacted", INTERESTED: "Interested", CONVERTED: "Bought", NOT_INTERESTED: "Not interested" } as const;
export const LEAD_CLASS_LABEL: Record<string, string> = { "11": "Class 11", "12": "Class 12", DROPPER: "Dropper" };
export const LEAD_GOAL_LABEL: Record<string, string> = { MAIN: "JEE Main", ADVANCED: "JEE Main + Advanced", BOARDS: "Boards first" };
export const LEAD_TIME_LABEL: Record<string, string> = { MORNING: "Morning (10am–1pm)", AFTERNOON: "Afternoon (1pm–5pm)", EVENING: "Evening (5pm–8pm)", "": "Any time" };
