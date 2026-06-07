export const manifest = {
  id: "garage",

  topics: [
    { id: "orders", label: "Orders", icon: "🔧" },
    { id: "customers", label: "Customers", icon: "👥" },
    { id: "inventory", label: "Inventory", icon: "📦" },
    { id: "appointments", label: "Appointments", icon: "📅" },
    { id: "technicians", label: "Technicians", icon: "👷" },
  ],
} as const;
