// Minimal UI unit test for FormModal component
import { render, screen, fireEvent } from "@testing-library/react";
import { FormModal } from "../components/FormModal";

describe("FormModal", () => {
  it("opens and closes modal", () => {
    render(<FormModal />);
    const openButton = screen.getByRole("button", { name: /open/i });
    fireEvent.click(openButton);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
