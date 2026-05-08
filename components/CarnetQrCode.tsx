import QRCode from "qrcode";

/**
 * Server component — generates a real scannable QR as inline SVG so we
 * don't pay any client-side runtime cost.
 */
export async function CarnetQrCode({
  url,
  size = 100,
  light = "#ffffff",
  dark = "#1a1035",
}: {
  url: string;
  size?: number;
  light?: string;
  dark?: string;
}) {
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 0,
    width: size,
    color: { light, dark },
    errorCorrectionLevel: "M",
  });

  return (
    <div
      className="rounded-[10px] p-1.5 shrink-0"
      style={{
        background: light,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
