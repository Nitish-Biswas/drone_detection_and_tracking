## Steps To Run the Project
    first activate Virtual environment
    Then start redis server
    in another terminal start celery
    another terminal start your backend

## TO install Virtual Environment
        python -m venv venv
    pip install fastapi uvicorn celery redis python-multipart pydantic

## To Start Virtual Environment
    .\venv\Scripts\activate

## To Start redis-server
     redis-server


## TO Start Celery Worker
    cd backend
    celery -A app.celery_app worker --loglevel=info

## TO Start backend
    cd backend
    python app.py


