# Frontend Staging

Сборка и запуск вместе с backend — через Docker Compose в репозитории **BackendStaging**:

https://github.com/NullPoint3rDev/BackendStaging/tree/main/deploy

Клонируйте `BackendStaging` и `FrontendStaging` в одну папку, затем:

```powershell
cd BackendStaging\deploy
copy .env.example .env
docker compose up -d --build
```
