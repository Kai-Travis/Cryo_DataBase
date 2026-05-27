from fastapi import FastAPI
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from fastapi.staticfiles import StaticFiles

from db import conn

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static ")

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