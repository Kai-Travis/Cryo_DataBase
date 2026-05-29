from fastapi import FastAPI
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from fastapi.staticfiles import StaticFiles

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

class VialCreate(BaseModel):
    cell_line: str
    passage_number: int
    frozen_by: str
    notes: str | None = None

    freezer_number: int
    rack_number: int
    box_number: int

    x_pos: int
    y_pos: int

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

    cur.execute("""
                INSERT INTO frozen_samples (
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

                    vial.x_pos,
                    vial.y_pos,

                    vial.notes
                ))
    conn.commit()
    return {"success": True}