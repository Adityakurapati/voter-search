"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// 🚨 IMPORTANT: dynamic import with SSR disabled
const IndicTransliterate = dynamic(
  () =>
    import("@ai4bharat/indic-transliterate").then(
      (mod) => mod.IndicTransliterate
    ),
  { ssr: false }
);

export default function Page() {
  const [value, setValue] = useState("");

  return (
    <div style={{ padding: 40, maxWidth: 600 }}>
      <h2>English → Marathi Typing</h2>

      <IndicTransliterate
        lang="mr"
        value={value}
        onChangeText={(text: string) => setValue(text)}
        renderComponent={(props) => (
          <textarea
            {...props}
            rows={4}
            placeholder="Type here (e.g. Prashant)"
            style={{
              width: "100%",
              fontSize: "18px",
              padding: "10px",
            }}
          />
        )}
      />

      <p>
        <strong>Output:</strong> {value}
      </p>
    </div>
  );
}
