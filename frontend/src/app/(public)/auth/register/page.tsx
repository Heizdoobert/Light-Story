import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";

export function generateMetadata(): Metadata {
  return {
    title: "Đăng ký",
    description: "Tạo tài khoản Light Story để theo dõi và lưu truyện yêu thích.",
  };
}

export default function RegisterPage() {
  return <RegisterForm />;
}
