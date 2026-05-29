let selectedRack =1;
let selectedBox = 1;

const rackButtons = document.querySelectorAll(".rack-button");

rackButtons.forEach(button => {
    button.addEventListener("click", () => {
        selectedRack = button.dataset.rack;
        rackButtons.forEach(b => {
            b.classList.remove("selected");
        });
        button.classList.add("selected");
        renderBoxes();
    });
});

const boxButtons = document.querySelectorAll(".box-button");

boxButtons.forEach(button => {
    button.addEventListener("click", () => {
        selectedBox = button.dataset.box;
        boxButtons.forEach(b => {
            b.classList.remove("selected");
        });
        button.classList.add("selected");
    })
})

const cells = document.querySelectorAll(".grid-cell");

const modal = document.querySelector("#vial-modal");

let selectedX = null;
let selectedY = null;

cells.forEach(cell => {
    cell.addEventListener("click", () => {
        selectedX = cell.dataset.x;
        selectedY = cell.dataset.y;
        modal.classList.remove("hidden");
    })
})

const closeButton = document.querySelector("#close-modal");

closeButton.addEventListener("click", () => {
    modal.classList.add("hidden");
})

const form = document.querySelector("#vial-form");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);

    const data ={
        cell_line: formData.get("cell_line"),
        passage_number: formData.get("passage_number"),
        frozen_by: formData.get("frozen_by"),
        notes: formData.get("notes"),

        x_pos: selectedX,
        y_pos: selectedY,

        freezer_number: 1,
        rack_number: selectedRack,
        box_number: selectedBox
    }

    const response = await fetch("/add-vial", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    if(response.ok) {
        alert("Vial added!");
        modal.classList.add("hidden");
    }
});

const freezerData ={
    1: {
        racks: {
            1: {
                boxes: [1,2,3,4,5]
            },
            2: {
                boxes: [1,2,3,4,5]
            },
            3: {
                boxes: [1,2,3,4,5]
            },
            4: {
                boxes: [1,2,3,4,5]
            }
        }
    }
};

function renderBoxes() {
    const container = document.querySelector(".box-buttons-div");
    container.innerHTML ="";

    for (let i=1; i<=5; i++){
        const button = document.createElement("button");
        button.textContent = `Box ${i}`;
        button.classList.add("box-button");
        button.dataset.box = 1;
        button.addEventListener("click", () => {
            selectedBox = i;
            renderGrid();
        });
        container.appendChild(button);
    }
}

function renderGrid() {
    const grid = document.querySelector(".box-grid");

    grid.innerHTML= "";

    for(let y=0; y<10; y++) {
        for(let x=0; x<10; x++) {
            const cell = document.createElement("button");
            cell.classList.add("grid-cell");

            cell.dataset.x = x;
            cell.dataset.y = y;

            cell.addEventListener("click", () => {
                selectedX = x;
                selectedY = y;

                modal.classList.remove("hidden");
            });
            grid.appendChild(cell);
        }
    }
}

renderBoxes();
renderGrid();