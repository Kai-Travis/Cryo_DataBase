from fastapi import FastAPI
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from pydantic import BaseModel
from datetime import datetime

from db import conn

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/Assets", StaticFiles(directory="Assets"), name="assets")
templates = Jinja2Templates(directory="templates")

@app.get("/")
def home(request: Request):

    cur = conn.cursor()

    cur.execute("""
                SELECT
                    c.name,
                    COUNT(f.id)
                FROM cell_lines c
                LEFT JOIN frozen_samples f
                    ON c.id = f.cell_line_id
                GROUP BY c.name
                ORDER BY c.name
                """)
    
    cell_lines = cur.fetchall()

    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "cell_lines": cell_lines
        }
    )

class CellPosition(BaseModel):
    x: int
    y: int

class DeleteRequest(BaseModel):
    freezer_number: int
    rack_number: int
    box_number: int
    selected_cells: list[CellPosition]

class UpdateVialRequest(BaseModel):
    id: int
    passage: int
    frozen_by: str
    notes: str | None = None

class VialCreate(BaseModel):
    cell_line: str
    passage_number: int
    frozen_by: str
    notes: str | None = None

    freezer_number: int
    rack_number: int
    box_number: int

    selected_cells: list[CellPosition]

@app.post("/add-vial")

def add_vial(vial: VialCreate):
    try:
        cur = conn.cursor()

        cur.execute("""
                    SELECT id
                    FROM cell_lines
                    WHERE name = %s
                    """, (vial.cell_line,))
        
        result = cur.fetchone()

        if result is None:
            cur.execute("""
                        INSERT INTO cell_lines (name)
                        VALUES (%s)
                        RETURNING id
                        """, (vial.cell_line,))
            
            cell_line_id = cur.fetchone()[0]

        else:
            cell_line_id = result[0]

        for cell in vial.selected_cells:
            cur.execute("""
                        SELECT 1
                        FROM frozen_samples
                        WHERE
                            freezer_number = %s
                            AND rack_number = %s
                            AND box_number = %s
                            AND x_pos = %s
                            AND y_pos = %s
                        """, (
                            vial.freezer_number,
                            vial.rack_number,
                            vial.box_number,
                            cell.x,
                            cell.y
                        ))
            
            if cur.fetchone():
                return{
                    "success": False,
                    "message": f"Position ({cell.x}, {cell.y}) is already occupied"
                }

        for cell in vial.selected_cells:

            cur.execute("""
                        INSERT  INTO frozen_samples (
                            cell_line_id,
                            freeze_passage_number,
                            frozen_at,
                            frozen_by,
                        
                            freezer_number,
                            rack_number,
                            box_number,
                        
                            x_pos,
                            y_pos,
                        
                            notes
                        )
                        
                        VALUES (
                            %s, %s, %s, %s,
                            %s, %s, %s,
                            %s, %s,
                            %s
                        )
                        """, (
                            cell_line_id,
                            vial.passage_number,
                            datetime.now(),
                            vial.frozen_by,

                            vial.freezer_number,
                            vial.rack_number,
                            vial.box_number,

                            cell.x,
                            cell.y,

                            vial.notes
                        ))
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn. rollback()
        raise e
    

@app.put("/update-vial")
def update_vial(vial: UpdateVialRequest):
    cur = conn.cursor()
    cur.execute("""
                UPDATE frozen_samples
                SET
                    freeze_passage_number = %s,
                    frozen_by = %s,
                    notes = %s
                WHERE id = %s
                """, (
                    vial.passage,
                    vial.frozen_by,
                    vial.notes,
                    vial.id
                ))
    conn.commit()
    return {"success": True}

@app.get("/cell-index")
def get_cell_index():

    cur = conn.cursor()

    cur.execute("""
        SELECT
            cl.name,
            COUNT(fs.id)
        FROM cell_lines cl
        LEFT JOIN frozen_samples fs
            ON fs.cell_line_id = cl.id
        GROUP BY cl.name
        ORDER BY cl.name
    """)

    rows = cur.fetchall()

    return rows

@app.get("/cell-line-details/{cell_line}")
def get_cell_line_details(cell_line: str):
    cur = conn.cursor()

    cur.execute("""
            SELECT
                fs.id,
                fs.freeze_passage_number,
                fs.freezer_number,
                fs.rack_number,
                fs.box_number,
                fs.x_pos,
                fs.y_pos,
                fs.frozen_at
            FROM frozen_samples fs
            JOIN cell_lines cl
                ON fs.cell_line_id = cl.id
            WHERE cl.name = %s
            ORDER BY fs.frozen_at DESC
                """, (cell_line,))
    
    rows = cur.fetchall()
    return rows

@app.get("/vial-details")
def get_vial_details(
    freezer: int,
    rack: int,
    box: int,
    x: int,
    y: int
):
    cur = conn.cursor()

    cur.execute("""
                SELECT
                    f.id,
                    c.name,
                    f.freeze_passage_number,
                    f.frozen_by,
                    f.frozen_at,
                    f.notes
                FROM frozen_samples f
                JOIN cell_lines c
                    ON c.id = f.cell_line_id
                WHERE
                    f.freezer_number = %s
                    AND f.rack_number = %s
                    AND f.box_number = %s
                    AND f.x_pos = %s
                    AND f.y_pos = %s
                """, (
                    freezer,
                    rack,
                    box,
                    x,
                    y
                ))
    
    row = cur.fetchone()

    if not row:
        return {"error": "Not found"}
    
    return {
        "id": row[0],
        "cell_line": row[1],
        "passage": row[2],
        "frozen_by": row[3],
        "frozen_at": str(row[4]),
        "notes": row[5]
    }

@app.delete("/delete-vial/{vial_id}")
def delete_vial(vial_id: int):
    cur = conn.cursor()

    cur.execute("""
                DELETE FROM frozen_samples
                WHERE id = %s
                """, (vial_id,))
    conn.commit()

    return{"success": True}

@app.delete("/delete-vials")
def delete_vials(req: DeleteRequest):

    cur = conn.cursor()

    for cell in req.selected_cells:
        cur.execute("""
                DELETE FROM frozen_samples
                WHERE
                    freezer_number = %s
                    AND rack_number = %s
                    AND box_number = %s
                    AND x_pos = %s
                    AND y_pos = %s
                """, (
                    req.freezer_number,
                    req.rack_number,
                    req.box_number,
                    cell.x,
                    cell.y
                ))
    conn.commit()
    return {"success": True}

@app.get("/box-data")
def get_box_data(
    freezer: int,
    rack:int,
    box:int
):
    cur = conn.cursor()

    cur.execute("""
                SELECT
                    x_pos,
                    y_pos,
                    c.name,
                    c.colour
                FROM frozen_samples f
                JOIN cell_lines c
                    ON f.cell_line_id = c.id
                WHERE
                    freezer_number = %s
                    AND rack_number = %s
                    AND box_number = %s
                """, (freezer, rack, box))
    
    rows = cur.fetchall()

    return rows