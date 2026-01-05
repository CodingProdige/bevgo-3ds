"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function CompleteInner() {
  const params = useSearchParams();
  const threeDSecureId = params.get("threeDSecureId") || params.get("id");
  const resourcePath = params.get("resourcePath");
  const queryOrderNumber = params.get("orderNumber") || params.get("orderId") || "";
  const storedOrderKey = threeDSecureId
    ? `bevgo:orderNumber:${threeDSecureId}`
    : null;

  const [orderNumber, setOrderNumber] = useState(
    queryOrderNumber ? queryOrderNumber : null
  );
  const [message] = useState(
    "3D Secure completed. You can return to the app to finish your payment."
  );

  const TEST_CLIENT_PORTAL = "https://bevgo-client-management-rckxs5.flutterflow.app/";
  const LIVE_CLIENT_PORTAL = "https://client-portal.bevgo.co.za/";

  useEffect(() => {
    if (!storedOrderKey || queryOrderNumber) {
      return;
    }
    const storedOrderNumber = sessionStorage.getItem(storedOrderKey);
    if (storedOrderNumber && storedOrderNumber !== orderNumber) {
      setOrderNumber(storedOrderNumber);
    }
  }, [storedOrderKey, queryOrderNumber, orderNumber]);

  useEffect(() => {
    if (!threeDSecureId) return;

    (async () => {
      try {
        const res = await fetch(
          "https://bevgo-client.vercel.app/api/v1/payments/peach/3ds/status",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              threeDSecureId,
            }),
          }
        );

        const json = await res.json();
        const nextOrderNumber =
          json.orderNumber || json.order_number || json.orderId;
        if (json.ok && nextOrderNumber) {
          setOrderNumber(nextOrderNumber);
          if (storedOrderKey) {
            sessionStorage.setItem(storedOrderKey, nextOrderNumber);
          }
        }
      } catch {}
    })();
  }, [threeDSecureId, resourcePath, storedOrderKey]);

  useEffect(() => {
    if (queryOrderNumber && queryOrderNumber !== orderNumber) {
      setOrderNumber(queryOrderNumber);
    }
  }, [queryOrderNumber, orderNumber]);

  const handleReturn = () => {
    const params = new URLSearchParams(window.location.search);
  
    const threeDSecureId =
      params.get("threeDSecureId") || params.get("id");
  
    // 👇 use fetched orderNumber if we have it
    const finalOrderNumber =
      orderNumber || params.get("orderNumber") || "";

    const returnParams = new URLSearchParams();
    if (threeDSecureId) {
      returnParams.set("threeDSecureId", threeDSecureId);
    }
    if (finalOrderNumber) {
      returnParams.set("orderNumber", finalOrderNumber);
    }

    const deeplink = `bevgoclientportal://bevgoclientportal.com/processingPayment?${returnParams.toString()}`;
  
    const fallbackUrl = `${TEST_CLIENT_PORTAL}processingPayment?${returnParams.toString()}`;
  
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
