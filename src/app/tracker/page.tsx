import type { Viewport } from "next";
import { LifeTrackerWorkspace } from "@/components/tracker";

export const dynamic = "force-dynamic";
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#090c11",
};

export default function TrackerPage() {
  return <LifeTrackerWorkspace />;
}
