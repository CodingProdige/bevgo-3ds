"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function StartInner() {
  const params = useSearchParams();
  const threeDSecureId = params.get("threeDSecureId");
  const orderNumber = params.get("orderNumber") || params.get("orderId");
  const storedOrderKey = threeDSecureId
    ? `bevgo:orderNumber:${threeDSecureId}`
    : null;

  const [message, setMessage] = useState("Preparing 3D Secure...");

  useEffect(() => {
    if (!threeDSecureId) {
      setMessage("Missing 3DS session");
      return;
    }

    (async () => {
      try {
        // Fetch the attempt details from your backend
        const res = await fetch(
          `https://bevgo-client.vercel.app/api/v1/payments/peach/3ds/attempt?id=${encodeURIComponent(
            threeDSecureId
          )}`
        );

        const json = await res.json();
        if (!json.ok) {
          setMessage(json.message || "Unable to load 3DS session");
          return;
        }

        const { redirect, frictionless } = json;
        const responseOrderNumber = json.orderNumber || json.orderId;

        if (storedOrderKey && responseOrderNumber) {
          sessionStorage.setItem(storedOrderKey, responseOrderNumber);
        }

        // Frictionless = no challenge, go straight to complete
        if (frictionless || !redirect) {
          const returnParams = new URLSearchParams();
          if (threeDSecureId) {
            returnParams.set("threeDSecureId", threeDSecureId);
          }
          const finalOrderNumber = responseOrderNumber || orderNumber;
          if (finalOrderNumber) {
            returnParams.set("orderNumber", finalOrderNumber);
          }

          window.location.href = `/complete?${returnParams.toString()}`;
          return;
        }

        // 🔥 Simplified: skip preconditions, go straight to issuer/Peach redirect
        setMessage("Redirecting to your bank for verification...");
        window.location.href = redirect.url;
      } catch (e) {
        setMessage("3D Secure initialization failed");
      }
    })();
  }, [threeDSecureId]);

  return (
    <div style={{ padding: 24 }}>
      <h2>Processing 3D Secure</h2>
      <p>{message}</p>
    </div>
  );
}
