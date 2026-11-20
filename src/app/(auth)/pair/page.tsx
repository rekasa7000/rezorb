import type { Metadata } from "next";
import { PairNewDevice } from "@/components/auth/PairNewDevice";

export const metadata: Metadata = { title: "Sign in with a code" };

export default function PairPage() {
  return <PairNewDevice />;
}
