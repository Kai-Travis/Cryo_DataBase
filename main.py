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
                        %s, %s, %s.
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
                    c.name
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