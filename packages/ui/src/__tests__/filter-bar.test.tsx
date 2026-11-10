// Minimal UI unit test for FilterBar component
import { render, screen } from "@testing-library/react";
import { FilterBar } from "../components/FilterBar";

describe("FilterBar", () => {
  it("renders filter input and button", () => {
    render(<FilterBar />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
