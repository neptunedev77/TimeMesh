import { z } from "zod";
import { messages } from "@/i18n";

const { errors } = messages.projects;

export const displayNameSchema = z.string().trim().min(1, errors.name).max(80, errors.name);
export const projectNameSchema = z.string().trim().min(1, errors.projectName).max(120, errors.projectName);
