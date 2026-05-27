from fastapi import FastAPI
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request

from db import conn

app = FastAPI()

templates = Jinja2Templates(directory="templates")

@app.get("/")
def home(request: Request):

    cur = conn.cursor()

    cur.execute("""
                SELECT * FROM cell_lines
                ORDER BY name
                """)
    
    cell_lines = cur.fetchall()

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "cell_lines":cell_lines
        }
    )