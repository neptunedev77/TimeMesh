import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { messages } from "@/i18n";
import Home from "./page";

test("landing page leads visitors to create a project", () => {
  render(<Home />);

  expect(screen.getByRole("heading", { level: 1, name: messages.landing.title })).toBeDefined();
  expect(screen.getByRole("link", { name: messages.landing.cta }).getAttribute("href")).toBe(
    "/dashboard",
  );
});
