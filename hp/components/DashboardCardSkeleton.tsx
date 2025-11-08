// components/DashboardCardSkeleton.tsx
"use client";

import React from "react";

export default function DashboardCardSkeleton() {
  return (
    <div className="p-4 rounded-2xl shadow bg-gray-100 animate-pulse">
      <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-2/3 mb-1"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
}