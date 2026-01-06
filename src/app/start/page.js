"use client";

import { useEffect, useState } from "react";

export default function Start3DSPage() {
  const [message, setMessage] = useState(
    "Connecting to your bank securely…"
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const threeDSId = params.get("threeDSecureId");

    if (!threeDSId) {
      setMessage("Missing authentication reference.");
      return;
    }

    async function run() {
      const res = await fetch(
        `https://bevgo-client.vercel.app/api/v1/payments/peach/3ds/attempt?id=${encodeURIComponent(
          threeDSId
        )}`
      );
    
      const json = await res.json();
      if (!json.ok) {
        setMessage("Unable to load authentication session.");
        return;
      }
    
      const redirect = json.redirect;
      const pre = redirect?.preconditions?.[0];
    
      if (!redirect?.url) {
        setMessage("Authentication session is no longer valid.");
        return;
      }
    
      // optional hidden step
      if (pre) {
        const hidden = document.createElement("iframe");
        hidden.style.display = "none";
        hidden.name = "hidden3DS";
        document.body.appendChild(hidden);
    
        const form = document.createElement("form");
        form.method = "POST";
        form.action = pre.url;
        form.target = "hidden3DS";
    
        (pre.parameters || []).forEach((p) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = p.name;
          input.value = p.value;
          form.appendChild(input);
        });
    
        document.body.appendChild(form);
        form.submit();
        form.remove();
    
        await new Promise((resolve) =>
          hidden.addEventListener("load", resolve, { once: true })
        );
      }
    
      setMessage("Redirecting to your bank…");
      window.location.href = redirect.url;
    }
    

    run();
  }, []);

  return (
    <div
      style={{
        background: "#0b0b0b",
        color: "#fff",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#111",
          border: "1px solid #2b2b2b",
          padding: 24,
          borderRadius: 14,
          width: 420,
          textAlign: "center",
        }}
      >
        <h3>Secure Authentication</h3>
        <p>{message}</p>
      </div>
    </div>
  );
}
