# Online Event Registration and Management System

Lightweight Node.js + Express + SQLite app.

## Run locally
```
npm install
npm start
```
Open http://localhost:3000 (admin: admin / admin123)

## Docker
```
docker build -t events-app .
docker run -p 3000:3000 events-app
```

## Selenium tests
```
cd selenium-tests
pip install -r requirements.txt
python -m pytest -q
```
