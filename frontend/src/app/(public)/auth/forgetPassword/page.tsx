import type { Metadata } from "next";
import { ForgetPasswordForm } from "@/components/auth/ForgetPasswordForm";

export function generateMetadata(): Metadata {
  return {
    title: "Quên mật khẩu",
    description: "Khôi phục mật khẩu tài khoản Light Story của bạn qua email.",
  };
}

export default function ForgetPasswordPage() {
  return <ForgetPasswordForm />;
}
