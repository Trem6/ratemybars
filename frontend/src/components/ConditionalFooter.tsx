"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

export default function ConditionalFooter() {
  const pathname = usePathname();

  // Hide footer on the full-screen map landing page
  if (pathname === "/") return null;

  return <Footer />;
}
