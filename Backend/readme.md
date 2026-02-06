# Working on Backend

I set up the backend project structure roughly going off this official fastapi example project https://github.com/fastapi/full-stack-fastapi-template/tree/master/backend/app.

- Use core/config.py to set up any environment variables or other global settings like environment

- Models folder is for defining ORM models for representing database objects in code. Schemas folder is for defining
  pydantic models for validating API header format, response format, etc. For now, maybe define everything in the models.py
  and schemas.py files and then we can break those out into multiple files if they get too big.

- Main.py configures the Fastapi instance, and is used to inject middleware and set up lifespan functionality like
  dependencies we want to create on starting the backend. Try to keep this file as small as possible

- For api endpoints, configure the route in api/routes and put the bulk of the logic for that endpoint in a service file
  in /services. For example, I added routes/auth.py and services/auth_service.py.

- core/database.py will be used for setting up database session

- I included an sql script for creating the database tables, but ideally we won't actually use this and will have a
  code-first approach to creating the tables using alembic.
