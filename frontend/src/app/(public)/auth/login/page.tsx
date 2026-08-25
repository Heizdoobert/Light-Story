import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export function generateMetadata(): Metadata {
  return {
    title: "Đăng nhập",
    description: "Đăng nhập vào Light Story để tiếp tục trải nghiệm truyện của bạn.",
  };
}

export default function LoginPage() {
  return <LoginForm />;
}
