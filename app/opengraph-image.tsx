import { ImageResponse } from "next/og";

export const alt = "PinMyBill Beta";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "56px 72px",
          background:
            "linear-gradient(135deg, rgb(15,118,110) 0%, rgb(11,58,82) 100%)",
          color: "white",
          fontFamily:
            "Inter, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "68%" }}>
          <div style={{ fontSize: 62, fontWeight: 800, lineHeight: 1.05 }}>
            PinMyBill · Beta
          </div>
          <div style={{ fontSize: 32, lineHeight: 1.28, opacity: 0.96 }}>
            Capture receipts, keep history tidy, export PDF or CSV.
          </div>
          <div style={{ fontSize: 25, opacity: 0.86 }}>
            pin-my-bill.vercel.app
          </div>
        </div>

        <div
          style={{
            width: 260,
            height: 260,
            borderRadius: 58,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.92)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
          }}
        >
          <div
            style={{
              width: 136,
              height: 136,
              borderRadius: 999,
              background: "rgb(20,184,166)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 72,
              fontWeight: 800,
              color: "rgb(250,204,21)",
            }}
          >
            P
          </div>
        </div>
      </div>
    ),
    size,
  );
}
