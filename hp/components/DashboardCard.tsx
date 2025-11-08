// components/DashboardCard.tsx
"use client";

import React from "react";

interface DashboardCardProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export default function DashboardCard({ title, description, children }: DashboardCardProps) {
  return (
    <div className="p-4 rounded-2xl shadow bg-white border border-gray-200">
      <h2 className="text-lg font-semibold mb-1">{title}</h2>
      {description && <p className="text-sm text-gray-500 mb-2">{description}</p>}
      <div>{children}</div>
    </div>
  );
}