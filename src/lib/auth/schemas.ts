import { z } from "zod";
import { messages } from "@/i18n";

const { errors } = messages.auth;

const email = z.email(errors.email);
const newPassword = z.string().min(8, errors.passwordLength).max(72, errors.passwordLength);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, errors.password),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, errors.name).max(80, errors.name),
  email,
  password: newPassword,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({ password: newPassword });
