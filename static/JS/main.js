const rackButtons = document.querySelectorAll(".rack-button");

rackButtons.forEach(button => {
    button.addEventListener("click", () => {
        rackButtons.forEach(b => {
            b.classList.remove("selected");
        });
        button.classList.add("selected");
    });
});

const cells = document.querySelectorAll(".grid-cell");

const modal = document.querySelector("#vial-modal");

cells.forEach(cell => {
    cell.addEventListener("click", () => {
        modal.classList.remove("hidden");
    })
})

const closeButton = document.querySelector("#close-modal");

closeButton.addEventListener("click", () => {
    modal.classList.add("hidden");
})