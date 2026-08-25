import { z } from "zod";

export const signInPasswordSchema = z.string().min(1, "Please enter your password");

export const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password confirmation does not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
