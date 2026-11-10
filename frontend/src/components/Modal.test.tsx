import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      {open && (
        <Modal title="Edit thing" onClose={() => setOpen(false)}>
          <input aria-label="Name" />
          <button type="button">Save</button>
        </Modal>
      )}
    </>
  );
}

describe("Modal", () => {
  it("exposes an accessible dialog and moves focus to the first field", () => {
    render(
      <Modal title="Edit thing" onClose={vi.fn()}>
        <input aria-label="Name" />
      </Modal>,
    );

    expect(screen.getByRole("dialog", { name: "Edit thing" })).toHaveAttribute("aria-modal", "true");
    expect(screen.getByLabelText("Name")).toHaveFocus();
  });

  it("prefers an element marked data-autofocus", () => {
    render(
      <Modal title="Confirm" onClose={vi.fn()}>
        <input aria-label="Name" />
        <button type="button" data-autofocus>
          Cancel
        </button>
      </Modal>,
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("closes on Escape and when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <Modal title="Edit thing" onClose={onClose}>
        <input aria-label="Name" />
      </Modal>,
    );

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    const overlay = document.body.querySelector(".modal-overlay");
    expect(container).toBeEmptyDOMElement(); // rendered through a portal
    await user.pointer({ keys: "[MouseLeft]", target: overlay as Element });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("keeps Tab focus inside the dialog", async () => {
    const user = userEvent.setup();
    render(
      <Modal title="Edit thing" onClose={vi.fn()}>
        <input aria-label="Name" />
        <button type="button">Save</button>
      </Modal>,
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "Save" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Save" })).toHaveFocus();
  });

  it("returns focus to the element that opened it", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open dialog" });

    await user.click(opener);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
