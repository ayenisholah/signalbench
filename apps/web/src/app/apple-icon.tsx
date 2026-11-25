import { ImageResponse } from "next/og";
import { THEME } from "@/lib/site";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const dynamic = "force-static";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: THEME.gold,
        color: THEME.paper,
        fontSize: 72,
        fontWeight: 700,
        fontFamily: "monospace",
      }}
    >
      SB
    </div>,
    size,
  );
}
