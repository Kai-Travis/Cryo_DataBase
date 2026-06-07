let selectedRack =1;
let selectedBox = 1;
let selectedCells =[];
let currentVial = null;
let confirmCallBack = null;
let isDragging = false;
let dragMode = null;

console.log("SCRIPT LOADED");

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

document.querySelectorAll(".cell-line-item")
    .forEach(item => {
        item.addEventListener(
            "click", async () => {
                const cellLine = item.dataset.cellLine;

                const response = await fetch(`/cell-line-details/${encodeURIComponent(cellLine)}`);

                const data = await response.json();
                renderCellLineTable(data);
            }
        );
    });


function renderCellLineTable(data) {
    const summary = document.querySelector(".cell_summary");
    let html = `
        <table>
            <tr>
                <th>ID</th>
                <th>Passage</th>
                <th>Rack</th>
                <th>Box</th>
                <th>Position</th>
            </tr>   
    `;

    data.forEach(row => {
        html += `
            <tr>
                <td>${row[0]}</td>
                <td>${row[1]}</td>
                <td>${row[3]}</td>
                <td>${row[4]}</td>
                <td>${row[5]},${row[6]}</td>
            </tr>
        `;
    });
    html += "</table>";
    summary.innerHTML = html;
}
const cells = document.querySelectorAll(".grid-cell");

const modal = document.querySelector("#vial-modal");

document.addEventListener("mouseup", () => {
    isDragging = false;
    dragMode = null;
});

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

        selected_cells: selectedCells,

        freezer_number: 1,
        rack_number: selectedRack,
        box_number: selectedBox
    }

    const response = await fetch("/add-vial", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            "Content-Type": "application/json"
        },
    });

    const result = await response.json();

    if (result.success) {
        await refreshCellIndex();
        await renderGrid();
    } else {
        alert(result.message);
    }

    if(response.ok) {
        modal.classList.add("hidden");
        selectedCells = [];
        await refreshCellIndex();
        await renderGrid();
    }
});

async function refreshCellIndex() {

    const response =
        await fetch("/cell-index");

    const data =
        await response.json();

    const container =
        document.querySelector(
            ".cell_index ul"
        );

    container.innerHTML = "";

    data.forEach(cell => {

        const li =
            document.createElement("li");

        li.textContent =
            `${cell[0]} (${cell[1]})`;

        container.appendChild(li);
    });
}

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
        button.dataset.box = i;
        button.addEventListener("click", () => {
            selectedBox = i;
            renderGrid();
        });
        container.appendChild(button);
    }
}

async function renderGrid() {
    const response = await fetch(
        `/box-data?freezer=1&rack=${selectedRack}&box=${selectedBox}`
    );

    const boxData = await response.json();
    const occupiedCells = {};

    boxData.forEach(vial => {
        const x = vial[0];
        const y = vial[1];
        const name = vial[2];

        occupiedCells[`${x}-${y}`] = name;
    });

    const grid = document.querySelector(".box-grid");

    grid.innerHTML= "";

    for(let y=0; y<10; y++) {
        for(let x=0; x<10; x++) {
            const cell = document.createElement("button");

            cell.addEventListener("mousedown", () => {
                console.log("mousedown");
                isDragging = true;
                const alreadySelected = selectedCells.some(
                    c => c.x === Number(cell.dataset.x) && c.y === Number(cell.dataset.y)
                );
                if (alreadySelected) {
                    dragMode = "remove";
                    removeSelection(cell);
                } else {
                    dragMode = "add";
                    addSelection(cell);
                }
            });

            cell.addEventListener("mouseenter", () => {
                if(!isDragging) return;
                if(dragMode == "add") {
                    addSelection(cell);
                }

                if(dragMode == "remove") {
                    removeSelection(cell);
                }
            });
            
            cell.classList.add("grid-cell");
            cell.dataset.x = x;
            cell.dataset.y = y;

            const key = `${x}-${y}`;

            if (occupiedCells[key]){
                cell.textContent = occupiedCells[key];
                cell.classList.add("occupied");
                cell.addEventListener("dblclick", () => showVialDetails(x, y));
            }
            grid.appendChild(cell);
        }
    }
}

function addSelection(cell) {
    const position = {
        x: Number(cell.dataset.x),
        y: Number(cell.dataset.y)
    };

    const alreadySelected = selectedCells.some(
        c => c.x === position.x && c.y === position.y
    );

    if(alreadySelected) {
        return;
    }
    selectedCells.push(position);

    cell.classList.add("highlighted");
}

function removeSelection(cell) {
    const position = {
        x: Number(cell.dataset.x),
        y: Number(cell.dataset.y)
    };

    selectedCells = selectedCells.filter(
        c => !(c.x === position.x && c.y === position.y)
    );

    cell.classList.remove("highlighted");
}

async function showVialDetails(x, y){
    const response = await fetch(
        `/vial-details?freezer=1` +
        `&rack=${selectedRack}` +
        `&box=${selectedBox}` +
        `&x=${x}` +
        `&y=${y}`
    );

    const data = await response.json();

    currentVial = data

    document.getElementById("detail-cell-line").textContent = data.cell_line;

    document.getElementById("detail-passage").textContent = data.passage;

    document.getElementById("detail-frozen-by").textContent = data.frozen_by;

    document.getElementById("detail-frozen-at").textContent = data.frozen_at;

    document.getElementById("detail-notes").textContent = data.notes ?? "";

    document.getElementById("details-modal").classList.remove("hidden");
}

document.getElementById("close-details")
.addEventListener("click", () => {
    document.getElementById("details-modal").classList.add("hidden");
})

document.getElementById("delete-vial-btn")
.addEventListener("click", async () => {
    if(!currentVial) return;

    showDeleteConfirmation("Delete this Vial?", async () => {
        const response = await fetch(
            `/delete-vial/${currentVial.id}`,
            {
                method: "DELETE"
            }
        );
        if(response.ok) {
            await refreshCellIndex();
            await renderGrid();
        }
    });
});

document.getElementById("delete-selected-button")
.addEventListener("click", () => {
    if (selectedCells.length === 0) {
        alert("No cells selected");
        return;
    }

    showDeleteConfirmation(
        `Delete ${selectedCells.length} vial(s)?`,
        deleteSelectedVials
    );
});

async function deleteSelectedVials() {
    const response = await fetch(
        "/delete-vials",
        {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                freezer_number: 1,
                rack_number: selectedRack,
                box_number: selectedBox,
                selected_cells: selectedCells
            })
        }
    );

    const result = await response.json();

    if (result.success) {
        await refreshCellIndex();
        await renderGrid();
    }
}

document.getElementById("edit-vial-btn").addEventListener("click", enableEditMode);

function enableEditMode() {
    document.getElementById("edit-passage").value = document.getElementById("detail-passage").textContent;
    document.getElementById("edit-frozen-by").value = document.getElementById("detail-frozen-by").textContent;
    document.getElementById("edit-notes").value = document.getElementById("detail-notes").textContent;

    document.getElementById("detail-passage").classList.add("hidden");
    document.getElementById("detail-frozen-by").classList.add("hidden");
    document.getElementById("detail-notes").classList.add("hidden");

    document.getElementById("edit-passage").classList.remove("hidden");
    document.getElementById("edit-frozen-by").classList.remove("hidden");
    document.getElementById("edit-notes").classList.remove("hidden");

    document.getElementById("save-vial-btn").classList.remove("hidden");
    document.getElementById("cancel-edit-btn").classList.remove("hidden");
    document.getElementById("edit-vial-btn").classList.add("hidden");
    document.getElementById("delete-vial-btn").classList.add("hidden");
}

document.getElementById("cancel-edit-btn").addEventListener("click", cancelEdit);

function cancelEdit() {
    document.getElementById("detail-passage").classList.remove("hidden");
    document.getElementById("detail-frozen-by").classList.remove("hidden");
    document.getElementById("detail-notes").classList.remove("hidden");

    document.getElementById("edit-passage").classList.add("hidden");
    document.getElementById("edit-frozen-by").classList.add("hidden");
    document.getElementById("edit-notes").classList.add("hidden");

    document.getElementById("save-vial-btn").classList.add("hidden");
    document.getElementById("cancel-edit-btn").classList.add("hidden");
    document.getElementById("edit-vial-btn").classList.remove("hidden");
    document.getElementById("delete-vial-btn").classList.remove("hidden");
}

document.getElementById("save-vial-btn").addEventListener("click", saveVial);

async function saveVial() {
    const response = await fetch(
        "/update-vial",
        {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                id: currentVial.id,
                passage: Number(document.getElementById("edit-passage").value),
                frozen_by: document.getElementById("edit-frozen-by").value,
                notes: document.getElementById("edit-notes").value
            })
        }
    );
    const result = await response.json();
    if(result.success){
        await refreshCellIndex();
        await renderGrid();
    } else {
        alert("Failed to update vial");
    }
}

async function saveVial() {
    const response = await fetch(
        "/update-vial", {
            method: "PUT",
            headers: {"CONTENT-Type": "application/json"},
            body: JSON.stringify({
                id: currentVial.id,
                passage: document.getElementById("edit-passage").value,
                frozen_by: document.getElementById("edit-frozen-by").value,
                notes: document.getElementById("edit-notes").value
            })
        }
    );
    const result = await response.json();

    if(result.success) {
        await refreshCellIndex();
        await renderGrid();
    }
}

document.getElementById("add-button")
.addEventListener("click", () => {
    if(selectedCells.length === 0) {
        alert("Select cells first");
        return;
    }
    modal.classList.remove("hidden")
})

document.getElementById("confirm-yes")
.addEventListener("click", async () => {
    if(confirmCallBack) {
        await confirmCallBack();
    }

    document.getElementById("confirm-modal").classList.add("hidden");
});

document.getElementById("confirm-no").addEventListener("click", () => {
    document.getElementById("confirm-modal").classList.add("hidden");
});

function showDeleteConfirmation(message, callback) {
    document.getElementById("confirm-message").textContent = message;
    confirmCallBack = callback;

    document.getElementById("confirm-modal").classList.remove("hidden");
}

renderBoxes();
renderGrid();