import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ProtohelpEditor } from "../app/ProtohelpEditor";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ProtohelpEditor />
  </StrictMode>,
);
