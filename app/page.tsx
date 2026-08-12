import type { Metadata } from "next";
import { ProtohelpEditor } from "./ProtohelpEditor";

export const metadata: Metadata = {
  title: "Protohelp — Diseñador de protoboards",
  description: "Diseñá montajes prolijos y calculá cada cable antes de cortar.",
};

export default function Home() {
  return <ProtohelpEditor />;
}
