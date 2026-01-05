"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function CompleteInner() {
  const params = useSearchParams();
  const threeDSecureId = params.get("threeDSecureId");
  const resourcePath = params.get("resourcePath");

  const [orderNumber, setOrderNumber] = useState(null);
  const [message] = useState(
    "3D Secure completed. You can return to the app to finish your payment."
  );

  const TEST_CLIENT_PORTAL = "https://bevgo-client-management-rckxs5.flutterflow.app/";
  const LIVE_CLIENT_PORTAL = "https://client-portal.bevgo.co.za/";

  useEffect(() => {
    if (!threeDSecureId || !resourcePath) return;

    (async () => {
      try {
        const res = await fetch(
          `/api/v1/payments/peach/3ds/status?id=${encodeURIComponent(
            threeDSecureId
          )}&resourcePath=${encodeURIComponent(resourcePath)}`
        );

        const json = await res.json();
        if (json.ok && json.orderNumber) {
          setOrderNumber(json.orderNumber);
        }
      } catch {}
    })();
  }, [threeDSecureId, resourcePath]);

  const handleReturn = () => {
    const params = new URLSearchParams(window.location.search);
  
    const threeDSecureId =
      params.get("threeDSecureId") || params.get("id");
  
    // 👇 use fetched orderNumber if we have it
    const finalOrderNumber =
      orderNumber || params.get("orderNumber") || "";
  
    const deeplink = `bevgoclientportal://bevgoclientportal.com/processingPayment?threeDSecureId=${encodeURIComponent(
      threeDSecureId || ""
    )}&orderNumber=${encodeURIComponent(finalOrderNumber || "")}`;
  
    const fallbackUrl = `${TEST_CLIENT_PORTAL}processingPayment?threeDSecureId=${encodeURIComponent(
      threeDSecureId || ""
    )}&orderNumber=${encodeURIComponent(finalOrderNumber || "")}`;
  
    window.location.href = deeplink;
  
    setTimeout(() => {
      window.location.href = fallbackUrl;
    }, 800);
  };
  
  

  return (
    <div style={{ padding: 24 }}>
      <h2>Verification Complete</h2>
      <p>{message}</p>

      {orderNumber && (
        <p>
          Order Reference: <strong>{orderNumber}</strong>
        </p>
      )}

      <button
        onClick={handleReturn}
        style={{
          marginTop: 16,
          padding: "10px 16px",
          fontSize: 16,
          borderRadius: 8,
          border: "none",
          background: "#000",
          color: "#fff",
          cursor: "pointer"
        }}
      >
        Return to Bevgo App
      </button>
    </div>
  );
}
