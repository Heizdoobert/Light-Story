// Minimal UI unit test for MetricCard using Vitest & React Testing Library
import { render, screen } from "@testing-library/react";
import { MetricCard } from "../components/MetricCard"; // adjust path if needed

describe("MetricCard", () => {
  it("renders title and value", () => {
    render(<MetricCard title="Views" value={123} />);
    expect(screen.getByText("Views")).toBeInTheDocument();
    expect(screen.getByText("123")).toBeInTheDocument();
  });
});
