# Working On Backend

## Instructions for Running Locally

1. Install and run docker desktop https://www.docker.com/products/docker-desktop/

2. Install postgresql https://www.postgresql.org/

3. Pull the backend

4. We should set up Github secrets to manage api keys and such. For now, you'll have to define a .env file in Backend/ containing credentials for POSTGRES_USER,
   POSTGRES_PASSWORD, and POSTGRES_DB. These can be set to anything, the api will use these credentials to access the database and you can use them as well to query the
   database manually through psql.

5. CD to backend/ and run docker compose up. This will build containers for the database and api, and run them.

6. Verify that the backend is running correctly by going to localhost:8000/docs.

7. docker compose up should be used when you want to start services without rebuilding.

8. docker compose up --build should be used to force a rebuild, which you'll want to do if you've changed the dockerfile, updated dependencies, or updated images.

9. docker compose down should be used to stop the services, adding the -v tag will also delete volumes, which should only be done if you want to get
   rid of anything in the database, otherwise it will persist.

10. To add new dependencies, use uv add package-name, then rebuild the containers with docker compose up --build.

## Changing Database Schema

Changes to the database schema should be done by changing the models/models.py file, no sql required.

Make changes, then run these commands ...

```
docker compose exec app uv run alembic revision --autogenerate -m "describe change"

docker compose exec app uv run alembic upgrade head
```

These run in the api contaier to create a version file and apply it to the database, changes should be reflected immediately and data should persist.

## Structure

I set up the backend project structure roughly going off this official fastapi example project https://github.com/fastapi/full-stack-fastapi-template/tree/master/backend/app.

- Use core/config.py to set up any environment variables (database connection strings, environment name)

- Models folder is for defining ORM models to represent database objects in code. Schemas folder is for defining
  pydantic models to validate API header format, response format, etc.

- Main.py configures the Fastapi instance, and is used to inject middleware and set up lifespan functionality like
  dependencies we want to create upon starting the backend. Try to keep this file as small as possible

- For api endpoints, configure the route in api/routes and put the bulk of the logic for that endpoint in a service file
  in /services. For example, I added routes/auth.py and services/auth_service.py.

- core/database.py initializes the database session
