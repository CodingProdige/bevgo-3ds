"use client";

import { useEffect, useState } from "react";

const TEST_CLIENT_PORTAL =
  "https://bevgo-client-management-rckxs5.flutterflow.app/";
const LIVE_CLIENT_PORTAL = "https://client-portal.bevgo.co.za/";

export default function Complete3DSPage() {
  const [status, setStatus] = useState("Verifying authentication…");
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const threeDSecureId = params.get("threeDSecureId") || params.get("id");
    const orderId = params.get("orderId") || params.get("orderNumber") || null;

    if (!threeDSecureId) {
      setError("Missing authentication reference.");
      return;
    }

    async function poll3DS() {
      let attempts = 0;

      while (attempts < 15) {      // ~30 seconds max
        const res = await fetch(
          `https://bevgo-client.vercel.app/api/v1/payments/peach/3ds/status?id=${encodeURIComponent(
            threeDSecureId
          )}`
        );

        const json = await res.json();

        if (!json.ok) {
          setError(json.message || "3D Secure failed.");
          return null;
        }

        // 🎯 BANK REJECTED OR CANCELLED
        if (json.status === "failed") {
          setError("Your bank declined or cancelled the authentication.");
          return null;
        }

        // 🎯 SUCCESS — STOP POLLING
        if (json.status === "authenticated") {
          return json;
        }

        // ⏳ STILL PROCESSING
        setStatus("Waiting for bank response…");
        await new Promise(r => setTimeout(r, 2000));
        attempts++;
      }

      setError("Your bank is taking longer than expected. Please try again.");
      return null;
    }

    async function run() {
      try {
        const auth = await poll3DS();
        if (!auth) return;

        //
        // STEP 2 — finalize
        //
        setStatus("Completing payment…");

        const finalizeRes = await fetch(
          "https://bevgo-client.vercel.app/api/v1/payments/peach/3ds/finalize",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              threeDSecureId,
              orderId,
              amount: auth.gateway?.amount,
              currency: auth.gateway?.currency
            })
          }
        );

        const finalizeJson = await finalizeRes.json();

        if (!finalizeJson.ok) {
          setError(finalizeJson.message || "Payment finalization failed.");
          return;
        }

        //
        // STEP 3 — redirect back to the app
        //
        const qp = new URLSearchParams();
        qp.set("threeDSecureId", threeDSecureId);
        if (orderId) qp.set("orderId", orderId);
        qp.set("status", "success");

        const deeplink = `bevgoclientportal://bevgoclientportal.com/processingPayment?${qp}`;
        const fallback = `${LIVE_CLIENT_PORTAL}processingPayment?${qp}`;

        window.location.href = deeplink;
        setTimeout(() => (window.location.href = fallback), 800);
      } catch (e) {
        console.error(e);
        setError("Something went wrong completing your payment.");
      }
    }

    run();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "#fff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}
    >
      <div
        style={{
          background: "#111",
          border: "1px solid #2b2b2b",
          padding: 24,
          borderRadius: 14,
          width: 420,
          textAlign: "center"
        }}
      >
        <h3>Finalizing Payment</h3>

        {!error ? (
          <>
            <p>{status}</p>

            {/* simple loading animation */}
            <div
              style={{
                marginTop: 14,
                width: 28,
                height: 28,
                border: "3px solid #2b2b2b",
                borderTop: "3px solid #fff",
                borderRadius: "50%",
                marginInline: "auto",
                animation: "spin 0.9s linear infinite"
              }}
            />
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </>
        ) : (
          <>
            <p style={{ color: "#ff6b6b" }}>{error}</p>

            <button
              style={{
                marginTop: 16,
                padding: "10px 16px",
                borderRadius: 8,
                background: "#fff",
                color: "#000",
                border: "none",
                cursor: "pointer"
              }}
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </>
        )}
      </div>
    </div>
  );
}
